// src/hooks/usePersonalizedFeed.js
// ─────────────────────────────────────────────────────────────────────────────
// Reads the user's topic profile from user_topic_profiles and scores
// a pool of articles by tag overlap with those weights.
// Falls back to most-viewed for guests and cold-start users.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';

const POOL_SIZE = 400;     // articles to score
const FEED_SIZE = 20;      // articles to return
const MIN_WEIGHT = 0.05;   // ignore near-zero weights

const LIGHT_SELECT = `
  id, created_at, title, author, description, category, tags,
  user_id, image_url, affiliate_link, avg_rating, slug, difficulty_level,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

const parseCount = (v) => {
  if (v == null) return 0;
  if (Array.isArray(v)) return Number(v[0]?.count ?? 0);
  if (typeof v === 'object' && 'count' in v) return Number(v.count ?? 0);
  return Number(v || 0);
};

const normalizeArticle = (r = {}) => ({
  id: r.id,
  slug: r.slug ?? null,
  title: r.title ?? '',
  author: r.author ?? '',
  description: r.description ?? null,
  category: r.category ?? null,
  tags: Array.isArray(r.tags) ? r.tags.map(t => String(t).toLowerCase().trim()) : [],
  image_url: r.image_url ?? null,
  affiliate_link: r.affiliate_link ?? null,
  avg_rating: Number(r.avg_rating ?? 0),
  likes_count: parseCount(r.likes_count),
  views_count: parseCount(r.views_count),
  comments_count: parseCount(r.comments_count),
  created_at: r.created_at ?? null,
  difficulty_level: r.difficulty_level ?? null,
  user_id: r.user_id ?? null,
});

/**
 * usePersonalizedFeed
 * 
 * @param {string|null} userId        - Current user's ID (null = guest)
 * @param {string|null} category      - If set, scope feed to this category
 * @param {boolean}     enabled       - Only run when true (e.g. on For You tab)
 * 
 * @returns {{ feed, loading, error, hasProfile, refresh }}
 *   feed       - Scored and ranked articles
 *   loading    - Boolean
 *   error      - Error message or null
 *   hasProfile - True if user has a real topic profile (not cold start)
 *   refresh    - Call to re-fetch
 */
export const usePersonalizedFeed = (userId = null, category = null, enabled = true) => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);

  const fetchFeed = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get user topic weights
      let weights = {};
      if (userId) {
        const { data: profile } = await supabase
          .from('user_topic_profiles')
          .select('topic_weights, total_events')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile?.topic_weights) {
          // Filter out near-zero weights — they add noise
          weights = Object.fromEntries(
            Object.entries(profile.topic_weights).filter(([, v]) => v >= MIN_WEIGHT)
          );
        }
      }

      const profileExists = Object.keys(weights).length > 0;
      setHasProfile(profileExists);

      // 2. Fetch article pool
      let query = supabase
        .from('book_summaries')
        .select(LIGHT_SELECT)
        .eq('status', 'published')
        .limit(POOL_SIZE);

      if (category) query = query.eq('category', category);

      // For cold start / guests — fetch most viewed as the pool
      if (!profileExists) {
        query = query.order('views_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const articles = (data || []).map(normalizeArticle);

      if (!profileExists) {
        // Cold start — just return most viewed
        setFeed(articles.slice(0, FEED_SIZE));
        return;
      }

      // 3. Score each article by tag overlap with profile weights
      const scored = articles.map(article => {
        const tagScore = article.tags.reduce((sum, tag) => {
          return sum + (weights[tag] || 0);
        }, 0);

        // Blend tag score with engagement signals
        const engagementScore = (
          Math.log1p(article.views_count) * 0.1 +
          Math.log1p(article.likes_count) * 0.2 +
          (article.avg_rating || 0) * 0.1
        );

        // Tag match is the dominant signal (70%), engagement breaks ties (30%)
        const totalScore = tagScore * 0.7 + engagementScore * 0.3;

        return { ...article, _score: totalScore, _tagScore: tagScore };
      });

      // 4. Sort: profile matches first, then engagement
      scored.sort((a, b) => {
        if (Math.abs(b._score - a._score) > 0.001) return b._score - a._score;
        return (b.views_count || 0) - (a.views_count || 0);
      });

      // 5. Deduplicate by category — avoid showing 5 articles from same bucket
      const categoryCount = {};
      const MAX_PER_CATEGORY = 4;
      const diversified = scored.filter(article => {
        const cat = article.category || 'uncategorized';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        return categoryCount[cat] <= MAX_PER_CATEGORY;
      });

      setFeed(diversified.slice(0, FEED_SIZE));

    } catch (err) {
      console.error('usePersonalizedFeed error:', err);
      setError('Could not load your personalized feed.');
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }, [userId, category, enabled]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Refresh when window regains focus (after reading an article)
  useEffect(() => {
    if (!enabled) return;
    const handleFocus = () => fetchFeed();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, fetchFeed]);

  return { feed, loading, error, hasProfile, refresh: fetchFeed };
};