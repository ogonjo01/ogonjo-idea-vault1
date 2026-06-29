// src/hooks/useArticleTracker.js
// ─────────────────────────────────────────────────────────────────────────────
// Silently tracks scroll depth, time spent, and navigation clicks.
// Fires one set of behavior_events to Supabase on page exit.
// Also updates the user's topic profile weights.
//
// FIX (scroll_depth always 0): the old handleScroll guessed a scrolling
// container by selector (`.main-content`, `main`, `document.documentElement`)
// and computed scrollTop / (scrollHeight - clientHeight) on it. In this
// app's layout none of those guesses are the actual scrolling element, so
// scrollHeight === clientHeight and the function returned early on every
// single call — maxScrollRef never moved off 0. It's also possible the
// 'scroll' event never fired on the guessed elements at all, since scroll
// events only fire on whatever element is actually scrolling.
//
// Fix: compute scroll % the same way the visible progress bar in
// SummaryView.jsx already does successfully — from the article element's
// getBoundingClientRect() relative to the viewport. This is container-
// agnostic: it doesn't matter what's actually scrolling (window, a wrapper
// div, anything), the math is the same. SummaryView now passes `articleRef`
// as a 4th argument to this hook to make that possible.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';

const SCROLL_CHECKPOINTS = [25, 50, 75, 90, 100];

// Topic weight decay — older events count less
const WEIGHT_INCREMENT = 0.15;
const WEIGHT_DECAY = 0.02;

/**
 * useArticleTracker
 * @param {string|null} articleId   - The article being read
 * @param {string[]}    tags        - Tags on the article (for topic profiling)
 * @param {string|null} userId      - Logged-in user id (null for guests)
 * @param {object|null} articleRef  - Ref to the <article> DOM node. Used to
 *                                    compute scroll % from its bounding rect
 *                                    (same approach as the visible progress
 *                                    bar in SummaryView), since the actual
 *                                    scroll container in this layout isn't
 *                                    reliably `.main-content` / `main` / html.
 */
export const useArticleTracker = (articleId, tags = [], userId = null, articleRef = null) => {
  const startTimeRef = useRef(null);
  const activeTimeRef = useRef(0);          // accumulated active ms
  const lastActiveRef = useRef(null);       // timestamp when tab became active
  const maxScrollRef = useRef(0);           // highest scroll % reached
  const checkpointsHitRef = useRef(new Set());
  const firedRef = useRef(false);
  const sessionId = useRef(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  // ── Scroll tracking ───────────────────────────────────────────────────────
  // Geometry-based, like the visible progress bar — works regardless of
  // which element actually owns the scroll (window, a wrapper div, etc).
  const handleScroll = useCallback(() => {
    const article = articleRef?.current;

    let pct;
    if (article) {
      const rect = article.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const articleH = article.offsetHeight;
      const scrolledPastTop = viewportH - rect.top;
      const totalDistance = articleH + viewportH;
      if (totalDistance <= 0) return;
      pct = Math.min(100, Math.max(0, Math.round((scrolledPastTop / totalDistance) * 100)));
    } else {
      // Fallback only used if no articleRef was passed in — best-effort
      // guess, kept for backward compatibility with older call sites.
      const el = document.scrollingElement || document.documentElement;
      const scrollTop = window.scrollY || el.scrollTop || 0;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (!scrollHeight) return;
      pct = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
    }

    if (pct > maxScrollRef.current) maxScrollRef.current = pct;

    // Fire intermediate checkpoint events
    SCROLL_CHECKPOINTS.forEach(cp => {
      if (pct >= cp && !checkpointsHitRef.current.has(cp)) {
        checkpointsHitRef.current.add(cp);
      }
    });
  }, [articleRef]);

  // ── Visibility / focus tracking ───────────────────────────────────────────
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab going away — accumulate active time
      if (lastActiveRef.current) {
        activeTimeRef.current += Date.now() - lastActiveRef.current;
        lastActiveRef.current = null;
      }
    } else {
      lastActiveRef.current = Date.now();
    }
  }, []);

  // ── Fire event to Supabase ────────────────────────────────────────────────
  const fireEvent = useCallback(async () => {
    if (firedRef.current || !articleId) return;
    firedRef.current = true;

    // Finalize active time
    if (lastActiveRef.current) {
      activeTimeRef.current += Date.now() - lastActiveRef.current;
    }
    const secondsSpent = Math.round(activeTimeRef.current / 1000);
    const scrollDepth = maxScrollRef.current;
    const completed = scrollDepth >= 90;

    try {
      // 1. Log scroll depth event
      await supabase.from('behavior_events').insert({
        user_id: userId || null,
        article_id: articleId,
        event_type: 'scroll_depth',
        value: scrollDepth,
        session_id: sessionId.current,
      });

      // 2. Log time spent event
      await supabase.from('behavior_events').insert({
        user_id: userId || null,
        article_id: articleId,
        event_type: 'time_spent',
        value: secondsSpent,
        session_id: sessionId.current,
      });

      // 3. Log completed if reached 90%+
      if (completed) {
        await supabase.from('behavior_events').insert({
          user_id: userId || null,
          article_id: articleId,
          event_type: 'completed',
          value: 1,
          session_id: sessionId.current,
        });
      }

      // 4. Update topic profile weights (logged-in users only)
      if (userId && Array.isArray(tags) && tags.length > 0) {
        await updateTopicProfile(userId, tags, scrollDepth, secondsSpent, completed);
      }
    } catch (err) {
      // Silent — never break the reading experience
      console.debug('Tracker event failed silently:', err);
    }
  }, [articleId, userId, tags]);

  // ── Update topic profile ──────────────────────────────────────────────────
  const updateTopicProfile = async (uid, articleTags, scrollDepth, secondsSpent, completed) => {
    try {
      // Fetch existing profile
      const { data: existing } = await supabase
        .from('user_topic_profiles')
        .select('topic_weights, total_events')
        .eq('user_id', uid)
        .maybeSingle();

      const weights = existing?.topic_weights || {};
      const totalEvents = (existing?.total_events || 0) + 1;

      // Score this reading session (0–1)
      const scrollScore = scrollDepth / 100;
      const timeScore = Math.min(1, secondsSpent / 120); // 2 min = full score
      const completionBonus = completed ? 0.3 : 0;
      const sessionScore = (scrollScore * 0.4 + timeScore * 0.4 + completionBonus * 0.2);

      // Apply decay to existing weights, then add new signal
      const normalizedTags = articleTags.map(t => String(t).toLowerCase().trim());
      normalizedTags.forEach(tag => {
        const current = weights[tag] || 0;
        // Decay existing + add new signal
        weights[tag] = Math.min(1, (current * (1 - WEIGHT_DECAY)) + (WEIGHT_INCREMENT * sessionScore));
      });

      // Decay all other weights slightly over time
      Object.keys(weights).forEach(key => {
        if (!normalizedTags.includes(key)) {
          weights[key] = Math.max(0, weights[key] - WEIGHT_DECAY * 0.5);
          if (weights[key] < 0.01) delete weights[key]; // prune near-zero
        }
      });

      // Upsert profile
      await supabase.from('user_topic_profiles').upsert({
        user_id: uid,
        topic_weights: weights,
        total_events: totalEvents,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    } catch (err) {
      console.debug('Profile update failed silently:', err);
    }
  };

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!articleId) return;

    // Reset state for new article
    firedRef.current = false;
    maxScrollRef.current = 0;
    checkpointsHitRef.current = new Set();
    activeTimeRef.current = 0;
    startTimeRef.current = Date.now();
    lastActiveRef.current = Date.now(); // start active immediately

    // Attach the listener to window. Scroll events bubble to window even
    // when the actual scrolling element is some nested div (the browser
    // dispatches a 'scroll' event at the document/window level too in most
    // layouts that use native overflow scrolling) — and since handleScroll
    // now reads geometry from articleRef rather than from whichever element
    // fired the event, it doesn't matter which element scrolled.
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', fireEvent);
    window.addEventListener('pagehide', fireEvent);

    // Run once immediately in case the article loads already scrolled
    // (e.g. navigating between articles without a full page reload).
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', fireEvent);
      window.removeEventListener('pagehide', fireEvent);
      fireEvent(); // fire on React unmount (navigation)
    };
  }, [articleId, handleScroll, handleVisibilityChange, fireEvent]);

  // ── Navigation click tracker (called manually from article body) ──────────
  const trackNavigationClick = useCallback(async (targetArticleId) => {
    if (!articleId || !targetArticleId) return;
    try {
      await supabase.from('behavior_events').insert({
        user_id: userId || null,
        article_id: articleId,
        event_type: 'navigation_click',
        value: null,
        session_id: sessionId.current,
      });
    } catch {}
  }, [articleId, userId]);

  return { trackNavigationClick };
};