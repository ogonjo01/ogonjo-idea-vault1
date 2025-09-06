// src/components/SummaryView/SummaryView.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import { FaHeart, FaStar, FaComment, FaEye } from 'react-icons/fa';
import CommentsSection from '../CommentsSection/CommentsSection';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import DOMPurify from 'dompurify';
import './SummaryView.css';

/* SELECT projection that attempts to include counts via relationships */
const SELECT_WITH_COUNTS = `
  *,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

/* Normalizer that handles count shapes from Supabase (array-of-count or number) */
const normalizeRow = (r = {}) => {
  const toNum = (v) => {
    if (v == null) return 0;
    if (Array.isArray(v)) return Number(v[0]?.count ?? 0);
    if (typeof v === 'object' && 'count' in v) return Number(v.count || 0);
    return Number(v || 0);
  };

  return {
    id: r.id,
    title: r.title,
    author: r.author,
    summary: r.summary,
    category: r.category,
    image_url: r.image_url,
    affiliate_link: r.affiliate_link,
    likes_count: toNum(r.likes_count),
    views_count: toNum(r.views_count),
    comments_count: toNum(r.comments_count),
    avg_rating: Number(r.avg_rating ?? 0),
    created_at: r.created_at ?? null,
  };
};

const SummaryView = () => {
  const { id } = useParams();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Engagement
  const [likes, setLikes] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [views, setViews] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);

  // Rating
  const [avgRating, setAvgRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  // UI collapsing
  const [collapsed, setCollapsed] = useState(false);

  // refs
  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const imageRef = useRef(null);

  // recommendations
  const [recommendedContent, setRecommendedContent] = useState([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recError, setRecError] = useState(null);

  // --------------------------
  //  Load only essential summary first (fast perceived load)
  // --------------------------
  useEffect(() => {
    let mounted = true;

    const loadMinimalSummary = async () => {
      setIsLoading(true);
      try {
        // Minimal select: fields required to render the page immediately
        const { data, error } = await supabase
          .from('book_summaries')
          .select('id, title, author, summary, category, image_url, affiliate_link, created_at')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!mounted) return;

        // set minimal summary immediately so user sees content
        setSummary({
          ...data,
          category: (data?.category == null) ? '' : String(data.category).trim(),
        });

        // Immediately set skeleton engagement counts to 0 while we fetch them
        setLikes(0);
        setViews(0);
        setCommentsCount(0);

        // mark initial load done (UI appears). Background work follows.
        setIsLoading(false);

        // kick off background tasks but don't block the UI
        backgroundFetchFollowups(id).catch((e) => {
          // log but don't surface to user
          console.debug('[backgroundFetchFollowups] error', e);
        });
      } catch (err) {
        console.error('Error loading minimal summary:', err);
        if (mounted) {
          setIsLoading(false);
          setSummary(null);
        }
      }
    };

    loadMinimalSummary();
    return () => { mounted = false; };
  }, [id]);

  // --------------------------
  //  Background data fetch: counts, avg rating, user state, increment views, recommended
  // --------------------------
  const backgroundFetchFollowups = async (postId) => {
    try {
      // 1) fetch counts via the full SELECT_WITH_COUNTS (fast single row)
      supabase
        .from('book_summaries')
        .select(SELECT_WITH_COUNTS)
        .eq('id', postId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            const formatted = {
              ...data,
              likes_count: Array.isArray(data?.likes_count) ? Number(data?.likes_count?.[0]?.count ?? 0) : Number(data?.likes_count ?? 0),
              views_count: Array.isArray(data?.views_count) ? Number(data?.views_count?.[0]?.count ?? 0) : Number(data?.views_count ?? 0),
              comments_count: Array.isArray(data?.comments_count) ? Number(data?.comments_count?.[0]?.count ?? 0) : Number(data?.comments_count ?? 0),
              category: (data?.category == null) ? '' : String(data.category).trim(),
            };
            setLikes(formatted.likes_count || 0);
            setViews(formatted.views_count || 0);
            setCommentsCount(formatted.comments_count || 0);
            // merge counts into summary state (non-blocking)
            setSummary((prev) => prev ? { ...prev, ...formatted } : formatted);
          } else if (error) {
            console.debug('counts fetch error', error);
          }
        });

      // 2) average rating RPC (don't await)
      supabase.rpc('get_average_rating', { p_post_id: postId })
        .then(({ data: ratingData, error: ratingErr }) => {
          if (!ratingErr && Array.isArray(ratingData) && ratingData[0] && ratingData[0].average_rating !== null) {
            setAvgRating(Math.round(Number(ratingData[0].average_rating) * 10) / 10);
          }
        }).catch(() => { /* ignore */ });

      // 3) user-specific state (like + rating) -- best-effort
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // parallel requests
          const likesReq = supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', user.id);
          const ratingReq = supabase.from('ratings').select('rating').eq('post_id', postId).eq('user_id', user.id).single();

          const [likesRes, ratingRes] = await Promise.all([likesReq, ratingReq]);
          if (likesRes?.data && likesRes.data.length) setUserHasLiked(true);
          if (ratingRes?.data && ratingRes.data.rating) setUserRating(ratingRes.data.rating);
        }
      } catch (e) {
        // ignore user-specific errors
      }

      // 4) increment views best-effort (fire-and-forget)
      supabase.rpc('increment_views', { post_id: postId })
        .then(() => setViews((v) => (Number(v) || 0) + 1))
        .catch(() => { /* ignore */ });

      // 5) recommended content (in background) - keep using fetchRecommended
      if (summary?.category ?? '') {
        fetchRecommended(summary.category, 10).catch(() => { /* ignore */ });
      }
    } catch (err) {
      console.error('backgroundFetchFollowups error:', err);
    }
  };

  // like handler
  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please sign in to like summaries.'); return; }

      if (userHasLiked) {
        const { error } = await supabase.from('likes').delete().eq('post_id', id).eq('user_id', user.id);
        if (error) throw error;
        setUserHasLiked(false);
        setLikes((l) => Math.max(0, l - 1));
      } else {
        const { error } = await supabase.from('likes').insert([{ post_id: id, user_id: user.id }]);
        if (error) throw error;
        setUserHasLiked(true);
        setLikes((l) => (Number(l) || 0) + 1);
      }
    } catch (err) {
      console.error('Like error', err);
      alert('Could not update like. Try again.');
    }
  };

  // rating handlers
  const saveRating = async (value) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to rate');
        return false;
      }

      setSavingRating(true);

      // Call server-side RPC that does the upsert
      const { data, error } = await supabase.rpc('rate_post', {
        p_post_id: id,
        p_user_id: user.id,
        p_rating: value
      });

      if (error) {
        console.error('rate_post rpc error', error);
        alert('Could not save rating. Try again later.');
        return false;
      }

      // Refresh average rating (best-effort)
      try {
        const { data: ratingData, error: ratingErr } = await supabase.rpc('get_average_rating', { p_post_id: id });
        if (!ratingErr && Array.isArray(ratingData) && ratingData[0] && ratingData[0].average_rating !== null) {
          setAvgRating(Math.round(Number(ratingData[0].average_rating) * 10) / 10);
        } else if (ratingErr) {
          console.debug('get_average_rating rpc error', ratingErr);
        }
      } catch (e) {
        console.debug('get_average_rating threw', e);
      }

      setUserRating(value);
      return true;
    } catch (err) {
      console.error('Save rating error', err);
      alert('Could not save rating. Try again.');
      return false;
    } finally {
      setSavingRating(false);
    }
  };

  const handleSetRating = async (value) => {
    setHoverRating(0);
    await saveRating(value);
  };

  const renderStars = (size = 'md') => {
    const active = hoverRating || userRating;
    const arr = [];
    for (let i = 1; i <= 5; i++) {
      const on = i <= active;
      arr.push(
        <button
          key={i}
          type="button"
          className={`star-button ${on ? 'active' : ''} ${size === 'sm' ? 'small' : ''}`}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          onFocus={() => setHoverRating(i)}
          onBlur={() => setHoverRating(0)}
          onClick={() => handleSetRating(i)}
          disabled={savingRating}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <FaStar />
        </button>
      );
    }
    return arr;
  };

  // collapse header logic (unchanged)
  useEffect(() => {
    const scroller = document.querySelector('.main-content') || window;
    let ticking = false;

    const getScrollValue = () => {
      if (scroller === window) {
        if (!pageRef.current) return window.scrollY || 0;
        const rect = pageRef.current.getBoundingClientRect();
        return Math.max(0, -rect.top);
      } else {
        return scroller.scrollTop;
      }
    };

    const threshold = () => {
      const img = imageRef.current;
      const h = img?.offsetHeight || 220;
      return Math.max(60, Math.round(h * 0.55));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sc = getScrollValue();
        const t = threshold();
        setCollapsed(sc > t);
        ticking = false;
      });
    };

    if (scroller === window) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('wheel', onScroll, { passive: true });
      window.addEventListener('touchmove', onScroll, { passive: true });
    } else {
      scroller.addEventListener('scroll', onScroll, { passive: true });
      scroller.addEventListener('wheel', onScroll, { passive: true });
      scroller.addEventListener('touchmove', onScroll, { passive: true });
    }

    requestAnimationFrame(onScroll);

    return () => {
      if (scroller === window) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('wheel', onScroll);
        window.removeEventListener('touchmove', onScroll);
      } else {
        scroller.removeEventListener('scroll', onScroll);
        scroller.removeEventListener('wheel', onScroll);
        scroller.removeEventListener('touchmove', onScroll);
      }
    };
  }, [summary]);

  // rpc-backed fetchRecommended with safe client fallback (unchanged)
  const fetchRecommended = useCallback(async (category, limit = 10) => {
    setIsRecommending(true);
    setRecError(null);
    try {
      const catRaw = category ?? '';
      const cat = String(catRaw).trim();
      if (!cat) {
        setRecommendedContent([]);
        return [];
      }

      try {
        const rpcRes = await supabase.rpc('get_top_viewed_by_category', { p_limit: limit, p_category: cat });
        if (!rpcRes.error && Array.isArray(rpcRes.data)) {
          const rows = (rpcRes.data || []).map(normalizeRow).filter(r => String(r.id) !== String(id));
          setRecommendedContent(rows.slice(0, limit));
          return rows.slice(0, limit);
        }
      } catch (rpcErr) {
        // fallthrough
      }

      const { data, error } = await supabase
        .from('book_summaries')
        .select(SELECT_WITH_COUNTS)
        .neq('id', id)
        .eq('category', cat)
        .limit(500);

      if (error) throw error;

      const rows = (data || []).map(normalizeRow).filter(r => String(r.id) !== String(id));
      rows.sort((a, b) => {
        const vb = Number(b.views_count || 0);
        const va = Number(a.views_count || 0);
        if (vb !== va) return vb - va;
        const lb = Number(b.likes_count || 0);
        const la = Number(a.likes_count || 0);
        if (lb !== la) return lb - la;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        return tb - ta;
      });

      const top = rows.slice(0, limit);
      setRecommendedContent(top);
      return top;
    } catch (err) {
      console.error('Error fetching recommended content:', err);
      setRecError('Unable to load recommendations.');
      setRecommendedContent([]);
      return [];
    } finally {
      setIsRecommending(false);
    }
  }, [id]);

  // trigger recommended fetch after main summary loads (kept for when we have summary)
  useEffect(() => {
    if (!summary) return;
    if (summary.category) {
      fetchRecommended(summary.category, 10);
    } else {
      setRecommendedContent([]);
    }
  }, [summary, fetchRecommended]);

  // --------------------------
  //  Render
  // --------------------------
  if (isLoading) {
    return (
      <div className="centered-loader-viewport" role="status" aria-live="polite">
        <div className="centered-loader">
          <div className="spinner" />
          <div className="loader-text">Loading…</div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return <div style={{ padding: 28 }}>Summary not found.</div>;
  }

  const affiliateLink = summary.affiliate_link || null;

  return (
    <div className="summary-page" ref={pageRef} data-collapsed={collapsed ? '1' : '0'}>
      <div className="summary-top-spacer" aria-hidden="true" />

      <header
        className={`summary-header ${collapsed ? 'collapsed' : ''}`}
        ref={headerRef}
        role="banner"
        aria-expanded={!collapsed}
      >
        <div className="summary-thumb-wrap" aria-hidden="true">
          {summary.image_url ? (
            <img ref={imageRef} className={`summary-thumb ${collapsed ? 'collapsed' : ''}`} src={summary.image_url} alt={summary.title} />
          ) : (
            <div className={`summary-thumb placeholder ${collapsed ? 'collapsed' : ''}`} />
          )}
        </div>

        <div className="summary-title-left">
          <h1 className="summary-title" title={summary.title}>{summary.title}</h1>
          <div className="summary-author">by {summary.author}</div>
        </div>

        <div className="summary-actions">
          {affiliateLink && (
            <a className="affiliate-btn" href={affiliateLink} target="_blank" rel="noopener noreferrer">Get Book</a>
          )}
        </div>

        <div className="summary-engagement" role="group" aria-label="Engagement">
          <button className={`eng-btn like-btn ${userHasLiked ? 'liked' : ''}`} onClick={handleLike} aria-pressed={userHasLiked} title="Like">
            <FaHeart /> <span>{likes ?? 0}</span>
          </button>

          <div className="eng-item" title="Comments"><FaComment /> <span>{commentsCount ?? 0}</span></div>
          <div className="eng-item" title="Views"><FaEye /> <span>{views ?? 0}</span></div>

          <div className="rating-block" title={`Average rating ${avgRating || 0}`}>
            <div className="rating-stars">{renderStars('md')}</div>
            <div className="avg-text">{avgRating ? Number(avgRating).toFixed(1) : '0.0'}</div>
          </div>
        </div>
      </header>

      <article className="summary-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(summary.summary || '') }} />

      {(isRecommending || (recommendedContent && recommendedContent.length > 0)) && (
        <HorizontalCarousel
          title={`More from ${summary.category || 'this category'}`}
          items={recommendedContent}
          loading={isRecommending}
          skeletonCount={4}
          viewAllLink={`/explore?category=${encodeURIComponent(summary.category || '')}`}
        >
          {recommendedContent.map(item => <BookSummaryCard key={item.id} summary={item} />)}
        </HorizontalCarousel>
      )}

      {!isRecommending && recommendedContent && recommendedContent.length === 0 && !recError && (
        <div className="rec-empty" style={{ padding: '12px 16px', color: '#6b7280' }}>No popular items found in this category.</div>
      )}

      {recError && (
        <div className="rec-error" style={{ padding: '12px 16px', color: '#b45309' }}>
          {recError} <button onClick={() => fetchRecommended(summary.category, 10)}>Retry</button>
        </div>
      )}

      <section className="summary-comments">
        <h3>Comments</h3>
        <CommentsSection postId={id} />
      </section>
    </div>
  );
};

export default SummaryView;
