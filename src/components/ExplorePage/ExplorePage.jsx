// src/pages/ExplorePage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import './ExplorePage.css';

/* SELECT already includes `description` and other fields */
const SELECT_WITH_COUNTS = `
  id,
  created_at,
  title,
  author,
  description,
  category,
  user_id,
  image_url,
  affiliate_link,
  tags,
  slug,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

const normalizeCount = (arr) => Number(arr?.[0]?.count || 0);

const safeStr = (v) => (v === null || v === undefined ? '' : typeof v === 'string' ? v.trim() : String(v));

/*
  IMPORTANT:
  - Ensure each row contains:
    - description (source of truth)
    - summary (kept for backward compatibility)
    - excerpt  (short preview used by cards)
*/
const normalizeRow = (r) => {
  const description = safeStr(r.description || '');
  const fallbackSummary = safeStr(r.summary || '');
  const chosen = description || fallbackSummary || '';
  const excerpt = chosen.length > 240 ? `${chosen.slice(0, 237).trim()}…` : chosen;

  return {
    id: r.id,
    title: safeStr(r.title) || 'Untitled',
    author: safeStr(r.author) || '',
    // keep both fields so BookSummaryCard (whichever it checks) can find text
    description: chosen,         // canonical full text (may be short)
    summary: chosen,             // backward-compatible alias
    excerpt,                     // short preview (use this in UI if you want fixed length)
    category: r.category,
    image_url: r.image_url,
    affiliate_link: r.affiliate_link,
    tags: Array.isArray(r.tags) ? r.tags.map(t => (t || '').toLowerCase()) : [],
    likes_count: normalizeCount(r.likes_count),
    views_count: normalizeCount(r.views_count),
    comments_count: normalizeCount(r.comments_count),
    created_at: r.created_at,
    slug: r.slug ?? null,
  };
};

const ITEMS_PER_PAGE = 20;

const useQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};

const sortClient = (items, sort) => {
  const list = [...items];
  switch (sort) {
    case 'views':
      return list.sort((a, b) => b.views_count - a.views_count);
    case 'likes':
      return list.sort((a, b) => b.likes_count - a.likes_count);
    case 'rating':
      return list.sort((a, b) => b.comments_count - a.comments_count);
    default:
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

const ExplorePage = () => {
  const q = useQuery();
  const location = useLocation(); // used for scroll restoration

  const sortType = (q.get('sort') || 'newest').toLowerCase();
  const category = q.get('category');
  const tag = q.get('tag');
  const searchTerm = q.get('q');

  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sentinelRef = useRef(null);

  // Scroll to top whenever the Explore route or its query changes
  useEffect(() => {
    // Immediate, no smooth scroll to avoid layout jumps during data load
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  const fetchItems = useCallback(
    async (pageOffset = 0, append = false) => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase.from('book_summaries').select(SELECT_WITH_COUNTS);

        if (category) query = query.eq('category', category);
        if (tag) query = query.contains('tags', [tag]);
        if (searchTerm) {
          const pattern = `%${searchTerm}%`;
          query = query.or(`title.ilike.${pattern},author.ilike.${pattern},description.ilike.${pattern}`);
        }

        if (sortType === 'views') query = query.order('views_count', { ascending: false });
        else if (sortType === 'likes') query = query.order('likes_count', { ascending: false });
        else query = query.order('created_at', { ascending: false });

        query = query.range(pageOffset, pageOffset + ITEMS_PER_PAGE - 1);

        const { data, error } = await query;
        if (error) throw error;

        const normalized = (data || []).map(normalizeRow);

        setItems((prev) => (append ? [...prev, ...normalized] : normalized));
        setOffset(pageOffset + normalized.length);
        setHasMore(normalized.length === ITEMS_PER_PAGE);
      } catch (err) {
        console.error('Explore fetch error:', err);
        setError('Unable to load content.');
      } finally {
        setLoading(false);
      }
    },
    [category, tag, searchTerm, sortType]
  );

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchItems(0, false);
  }, [fetchItems]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchItems(offset, true);
      },
      { rootMargin: '600px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loading, fetchItems]);

  const title = tag
    ? `Tag: ${tag}`
    : sortType === 'views'
    ? 'Most Viewed'
    : sortType === 'likes'
    ? 'Most Liked'
    : sortType === 'rating'
    ? 'Most Rated'
    : 'Newest';

  return (
    <div className="explore-page">
      <h2>{title}</h2>

      {error && <div className="explore-error">{error}</div>}

      <div className="explore-grid">
        {items.map((item) => (
          // BookSummaryCard receives the whole item; it can read item.description || item.summary || item.excerpt
          <BookSummaryCard key={item.id} summary={item} />
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}
      {loading && <div className="explore-loading">Loading...</div>}
    </div>
  );
};

export default ExplorePage;
