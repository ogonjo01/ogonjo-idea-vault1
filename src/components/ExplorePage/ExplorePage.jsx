// src/components/ExplorePage/ExplorePage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import './ExplorePage.css';

const SELECT_WITH_COUNTS = `
  id,
  created_at,
  title,
  author,
  summary,
  category,
  user_id,
  image_url,
  affiliate_link,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

const normalizeCount = (maybeArr) => {
  try {
    return Number(maybeArr?.[0]?.count || 0);
  } catch {
    return 0;
  }
};

const normalizeRow = (r = {}) => ({
  id: r.id,
  title: r.title,
  author: r.author,
  summary: r.summary,
  category: r.category,
  image_url: r.image_url,
  affiliate_link: r.affiliate_link,
  likes_count: normalizeCount(r.likes_count),
  views_count: normalizeCount(r.views_count),
  comments_count: normalizeCount(r.comments_count),
  created_at: r.created_at ?? null,
});

const ITEMS_PER_PAGE = 20;

const useQuery = () => {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
};

const ExplorePage = () => {
  const q = useQuery();
  const rawCategory = q.get('category') || '';
  const sortType = (q.get('sort') || 'newest').toLowerCase();
  const category = decodeURIComponent(rawCategory).trim();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);

  const sentinelRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchItems = useCallback(
    async (pageOffset = 0, append = false) => {
      setLoading(true);
      setError(null);

      let query = supabase.from('book_summaries').select(SELECT_WITH_COUNTS, { count: 'exact' });
      if (category) query = query.ilike('category', `%${category}%`);

      try {
        const { data, error } = await query.range(pageOffset, pageOffset + ITEMS_PER_PAGE - 1);
        if (error) throw error;

        const normalizedRows = (data || []).map(normalizeRow);

        const sortedRows = normalizedRows.sort((a, b) => {
          if (sortType === 'views') return (b.views_count || 0) - (a.views_count || 0);
          if (sortType === 'likes') return (b.likes_count || 0) - (a.likes_count || 0);
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        if (mountedRef.current) {
          if (append) {
            setItems((prev) => [...prev, ...sortedRows]);
          } else {
            setItems(sortedRows);
          }
          setOffset(pageOffset + (data?.length || 0));
          setHasMore((data?.length || 0) === ITEMS_PER_PAGE);
        }
      } catch (err) {
        console.error('Explore fetch error:', err);
        if (mountedRef.current) setError('Unable to load content.');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [category, sortType]
  );

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchItems(0, false);
  }, [category, sortType, fetchItems]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchItems(offset, true);
      },
      { root: null, rootMargin: '800px', threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, offset, fetchItems]);

  const getTitle = () => {
    const sortTitle = { views: 'Most Viewed', likes: 'Most Liked', newest: 'Newest' };
    return `${sortTitle[sortType] || sortType}${category ? `: ${category}` : ''}`;
  };

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h2>{getTitle()}</h2>
      </div>

      {loading && items.length === 0 ? (
        <div className="explore-loading">Loading...</div>
      ) : error ? (
        <div className="explore-error">{error}</div>
      ) : items.length > 0 ? (
        <>
          <div className="explore-grid">
            {items.map((it) => (
              <BookSummaryCard key={it.id} summary={it} />
            ))}
          </div>
          {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}
          {loading && <div className="explore-loading">Loading more...</div>}
        </>
      ) : (
        <div className="explore-empty">No items found.</div>
      )}
    </div>
  );
};

export default ExplorePage;
