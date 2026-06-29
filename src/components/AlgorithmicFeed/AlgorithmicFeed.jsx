// src/components/AlgorithmicFeed/AlgorithmicFeed.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Continuous feed of personalized cards, batch-loaded on scroll.
// Both the ORDER of cards (vertical) and the CONTENT (horizontal on desktop)
// are driven by the user's topic_weights profile.
// No row labels. No fixed sections. Just content.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import { Link } from 'react-router-dom';
import { FaThumbsUp, FaEye, FaStar, FaBookmark } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import { ONBOARDING_KEY } from '../FeedOnboarding/FeedOnboarding';
import './AlgorithmicFeed.css';

/* ─── Config ─────────────────────────────────────────────────────────────── */
const BATCH_SIZE = 20;
const POOL_SIZE  = 600;
const MIN_WEIGHT = 0.04;

const LIGHT_SELECT = `
  id, created_at, title, author, description, category, tags,
  user_id, image_url, avg_rating, slug, difficulty_level,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count)
`;

/* ─── Utilities ──────────────────────────────────────────────────────────── */
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
  avg_rating: Number(r.avg_rating ?? 0),
  likes_count: parseCount(r.likes_count),
  views_count: parseCount(r.views_count),
  created_at: r.created_at ?? null,
  difficulty_level: r.difficulty_level ?? null,
});

const cleanDesc = (text = '', max = 120) => {
  if (!text) return '';
  const cleaned = DOMPurify.sanitize(String(text), { ALLOWED_TAGS: [] });
  const plain = cleaned.replace(/<[^>]*>/g, '').trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
};

/* ─── Score articles against profile ────────────────────────────────────── */
const scoreArticles = (articles, weights) => {
  const hasProfile = Object.keys(weights).length > 0;

  return articles.map(article => {
    if (!hasProfile) {
      // Cold start — score by engagement only
      return {
        ...article,
        _score: Math.log1p(article.views_count) + article.avg_rating * 2,
      };
    }

    const tagScore = article.tags.reduce((sum, tag) => sum + (weights[tag] || 0), 0);
    const engScore = Math.log1p(article.views_count) * 0.08 + (article.avg_rating || 0) * 0.12;
    return { ...article, _score: tagScore * 0.75 + engScore * 0.25 };
  }).sort((a, b) => {
    if (Math.abs(b._score - a._score) > 0.001) return b._score - a._score;
    return new Date(b.created_at) - new Date(a.created_at);
  });
};

/* ─── Card component ─────────────────────────────────────────────────────── */
const FeedCard = ({ article }) => {
  const path = article.slug ? `/summary/${article.slug}` : `/summary/${article.id}`;
  const desc = cleanDesc(article.description, 110);

  return (
    <Link to={path} className="feed-card" aria-label={article.title}>
      {article.image_url && (
        <div className="feed-card-img-wrap">
          <img
            src={article.image_url}
            alt={article.title}
            className="feed-card-img"
            loading="lazy"
          />
        </div>
      )}
      <div className="feed-card-body">
        {article.category && (
          <span className="feed-card-category">{article.category}</span>
        )}
        <h3 className="feed-card-title">{article.title}</h3>
        {desc && <p className="feed-card-desc">{desc}</p>}
        <div className="feed-card-meta">
          {article.author && (
            <span className="feed-card-author">{article.author}</span>
          )}
          <div className="feed-card-stats">
            <span title="Views"><FaEye />{article.views_count > 999 ? `${Math.round(article.views_count / 1000)}k` : article.views_count}</span>
            <span title="Likes"><FaThumbsUp />{article.likes_count}</span>
            {article.avg_rating > 0 && (
              <span title="Rating"><FaStar style={{ color: '#f1c40f' }} />{Number(article.avg_rating).toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ─── Skeleton card ──────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="feed-card feed-card--skeleton" aria-hidden="true">
    <div className="feed-card-img-wrap skeleton-block" />
    <div className="feed-card-body">
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line--medium" />
    </div>
  </div>
);

/* ─── Main component ─────────────────────────────────────────────────────── */
const AlgorithmicFeed = ({ userId = null, initialWeights = {} }) => {
  const [allArticles, setAllArticles]   = useState([]);  // full scored pool
  const [displayed, setDisplayed]       = useState([]);  // what's shown
  const [loadingPool, setLoadingPool]   = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const [weights, setWeights]           = useState(initialWeights);
  const sentinelRef                     = useRef(null);
  const offsetRef                       = useRef(0);

  /* ── Load weights: profile > localStorage > empty ─────────────────────── */
  useEffect(() => {
    const loadWeights = async () => {
      // 1. Try Supabase profile first (most up-to-date)
      if (userId) {
        try {
          const { data } = await supabase
            .from('user_topic_profiles')
            .select('topic_weights')
            .eq('user_id', userId)
            .maybeSingle();
          if (data?.topic_weights && Object.keys(data.topic_weights).length > 0) {
            const filtered = Object.fromEntries(
              Object.entries(data.topic_weights).filter(([, v]) => v >= MIN_WEIGHT)
            );
            setWeights(filtered);
            return;
          }
        } catch {}
      }

      // 2. Fall back to localStorage (works for guests who completed onboarding)
      try {
        const stored = localStorage.getItem(ONBOARDING_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.weights) {
            setWeights(parsed.weights);
            return;
          }
        }
      } catch {}

      // 3. No profile — use initialWeights (cold start)
      setWeights(initialWeights);
    };

    loadWeights();
  }, [userId]); // eslint-disable-line

  /* ── Fetch and score the full pool ────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    const fetchPool = async () => {
      setLoadingPool(true);
      setDisplayed([]);
      offsetRef.current = 0;

      try {
        const { data, error } = await supabase
          .from('book_summaries')
          .select(LIGHT_SELECT)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(POOL_SIZE);

        if (error) throw error;
        if (cancelled) return;

        const normalized = (data || []).map(normalizeArticle);
        const scored = scoreArticles(normalized, weights);

        setAllArticles(scored);

        // Show first batch
        const firstBatch = scored.slice(0, BATCH_SIZE);
        setDisplayed(firstBatch);
        offsetRef.current = firstBatch.length;
        setHasMore(scored.length > firstBatch.length);
      } catch (err) {
        console.error('AlgorithmicFeed pool fetch error:', err);
      } finally {
        if (!cancelled) setLoadingPool(false);
      }
    };

    fetchPool();
    return () => { cancelled = true; };
  }, [weights]); // re-score when weights change

  /* ── Load next batch ─────────────────────────────────────────────────── */
  const loadNextBatch = useCallback(() => {
    if (loadingMore || !hasMore || loadingPool) return;
    setLoadingMore(true);

    setTimeout(() => {
      const offset = offsetRef.current;
      const nextBatch = allArticles.slice(offset, offset + BATCH_SIZE);
      if (nextBatch.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      setDisplayed(prev => [...prev, ...nextBatch]);
      offsetRef.current = offset + nextBatch.length;
      setHasMore(offset + nextBatch.length < allArticles.length);
      setLoadingMore(false);
    }, 180);
  }, [allArticles, hasMore, loadingMore, loadingPool]);

  /* ── Infinite scroll via IntersectionObserver ────────────────────────── */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) loadNextBatch(); }),
      { rootMargin: '400px', threshold: 0.1 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadNextBatch]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loadingPool) {
    return (
      <div className="algorithmic-feed">
        <div className="feed-grid">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!loadingPool && displayed.length === 0) {
    return (
      <div className="algorithmic-feed">
        <div className="feed-empty">
          <p>No content found. Check back soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="algorithmic-feed">
      <div className="feed-grid">
        {displayed.map(article => (
          <FeedCard key={article.id} article={article} />
        ))}
        {loadingMore && Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={`sk-${i}`} />
        ))}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />

      {!hasMore && displayed.length > 0 && (
        <div className="feed-end">You've seen everything. Keep reading to refine your feed.</div>
      )}
    </div>
  );
};

export default AlgorithmicFeed;