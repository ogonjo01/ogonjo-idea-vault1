// src/pages/ExplorePage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import './ExplorePage.css';

/* SELECT already includes `description`, `avg_rating`, and other fields */
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
  avg_rating,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

const normalizeCount = (arr) => Number(arr?.[0]?.count || 0);
const safeStr = (v) => (v === null || v === undefined ? '' : typeof v === 'string' ? v.trim() : String(v));
const safeNumber = (v) => {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* normalizeRow - keep description/summary/excerpt + avg_rating */
const normalizeRow = (r) => {
  const description = safeStr(r.description || '');
  const fallbackSummary = safeStr(r.summary || '');
  const chosen = description || fallbackSummary || '';
  const excerpt = chosen.length > 240 ? `${chosen.slice(0, 237).trim()}…` : chosen;

  return {
    id: r.id,
    title: safeStr(r.title) || 'Untitled',
    author: safeStr(r.author) || '',
    description: chosen,
    summary: chosen,
    excerpt,
    category: r.category,
    image_url: r.image_url,
    affiliate_link: r.affiliate_link,
    tags: Array.isArray(r.tags) ? r.tags.map(t => (t || '').toLowerCase()) : [],
    avg_rating: safeNumber(r.avg_rating),
    likes_count: normalizeCount(r.likes_count),
    views_count: normalizeCount(r.views_count),
    comments_count: normalizeCount(r.comments_count),
    created_at: r.created_at,
    slug: r.slug ?? null,
  };
};

// Config: tweak these values to change initial batch size / hard cap
const ITEMS_PER_PAGE = 16; // initial visible batch and per-load batch size
const MAX_ITEMS = 500; // invisible hard cap to protect performance (users won't notice)

const useQuery = () => {
  const { search } = useLocation();
  return new URLSearchParams(search);
};

const sortClient = (items, sort) => {
  const list = [...items];
  switch (sort) {
    case 'views':
      return list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    case 'likes':
      return list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    case 'rating':
      return list.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    default:
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
};

const ExplorePage = () => {
  const q = useQuery();
  const location = useLocation();

  const sortType = (q.get('sort') || 'newest').toLowerCase();
  const category = q.get('category');
  const tag = q.get('tag');
  const searchTerm = (q.get('q') || q.get('search') || '')?.trim();
  const previewIdsRaw = q.get('preview_ids');
  const previewIds = previewIdsRaw ? previewIdsRaw.split(',').map(s => s.trim()).filter(Boolean) : null;

  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sentinelRef = useRef(null);

  // prevent concurrent fetches
  const fetchInProgress = useRef(false);
  // store observer so we can disconnect cleanly
  const observerRef = useRef(null);

  // mounted guard
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const mounted = () => mountedRef.current;

  // Scroll to top when route/search changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  // Helper: try several RPC arg-name variants for robustness (if needed)
  const tryCallGetHighestRated = async (limit, categoryArg) => {
    const variants = [
      (cat) => ({ p_limit: limit, ...(cat ? { p_category: cat } : {}) }),
      (cat) => ({ limit, ...(cat ? { category: cat } : {}) }),
      (cat) => ({ p_limit: limit }),
      (cat) => ({ limit }),
    ];

    for (const buildArgs of variants) {
      const args = buildArgs(categoryArg);
      try {
        const { data, error } = await supabase.rpc('get_highest_rated', args);
        if (!error && Array.isArray(data)) {
          return { data, usedArgs: args };
        }
      } catch (e) {
        // ignore and try next
      }
    }
    return { data: null };
  };

  const fetchItems = useCallback(
    async (pageOffset = 0, append = false) => {
      // guard: don't fetch if a fetch is already in progress
      if (fetchInProgress.current) return;

      // guard: don't fetch beyond hard cap
      if (pageOffset >= MAX_ITEMS) {
        if (mounted()) setHasMore(false);
        return;
      }

      fetchInProgress.current = true;
      setLoading(true);
      setError(null);

      try {
        // determine how many items we actually want this call to fetch
        const remainingAllowed = MAX_ITEMS - pageOffset;
        const pageSize = Math.max(0, Math.min(ITEMS_PER_PAGE, remainingAllowed));
        if (pageSize <= 0) {
          if (mounted()) setHasMore(false);
          return;
        }

        // === RESPECT FEED CONTEXT: if preview_ids provided, fetch only those IDs and preserve order ===
        if (Array.isArray(previewIds) && previewIds.length > 0) {
          const ids = previewIds;
          const { data, error } = await supabase
            .from('book_summaries')
            .select(SELECT_WITH_COUNTS)
            .in('id', ids);

          if (error) throw error;

          // normalize and then order exactly as previewIds
          const normalized = (data || []).map(normalizeRow);
          const orderMap = new Map(ids.map((id, idx) => [String(id), idx]));
          const ordered = normalized.slice().sort((a, b) => {
            const ia = orderMap.has(String(a.id)) ? orderMap.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
            const ib = orderMap.has(String(b.id)) ? orderMap.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
            return ia - ib;
          });

          // enforce MAX_ITEMS cap on preview-driven lists too
          const capped = ordered.slice(0, Math.min(ordered.length, MAX_ITEMS));
          const slice = capped.slice(pageOffset, pageOffset + pageSize);

          if (mounted()) {
            setItems(prev => (append ? [...prev, ...slice] : slice));
            setOffset(pageOffset + slice.length);
            setHasMore(pageOffset + slice.length < capped.length);
          }

          return;
        }

        // === Special-case: use the same RPC the feed uses for Most Rated when there is no preview_ids ===
        if (sortType === 'rating') {
          try {
            const rpcLimit = Math.min(MAX_ITEMS, 1000); // be defensive: cap rpc calls
            const { data: rpcData } = await tryCallGetHighestRated(rpcLimit, category);
            if (Array.isArray(rpcData)) {
              let all = rpcData.map(normalizeRow);

              if (tag) {
                const tLower = tag.toLowerCase();
                all = all.filter(it => Array.isArray(it.tags) && it.tags.includes(tLower));
              }
              if (searchTerm) {
                const s = searchTerm.toLowerCase();
                all = all.filter(it =>
                  (it.title || '').toLowerCase().includes(s) ||
                  (it.author || '').toLowerCase().includes(s) ||
                  (it.description || '').toLowerCase().includes(s)
                );
              }

              // enforce MAX_ITEMS cap
              all = all.slice(0, MAX_ITEMS);

              const sorted = sortClient(all, 'rating');
              const slice = sorted.slice(pageOffset, pageOffset + pageSize);

              if (mounted()) {
                setItems(prev => (append ? [...prev, ...slice] : slice));
                setOffset(pageOffset + slice.length);
                setHasMore(pageOffset + slice.length < sorted.length);
              }
              return;
            }
            // else fall through to table query fallback
          } catch (rpcErr) {
            // fall through to table query fallback
          }
        }

        // === Default behavior (table queries) ===
        // guard: calculate range end while respecting MAX_ITEMS
        const start = pageOffset;
        const end = Math.min(pageOffset + pageSize - 1, MAX_ITEMS - 1);

        let query = supabase.from('book_summaries').select(SELECT_WITH_COUNTS);

        if (category) query = query.eq('category', category);
        if (tag) query = query.contains('tags', [tag]);
        if (searchTerm) {
          const pattern = `%${searchTerm}%`;
          query = query.or(`title.ilike.${pattern},author.ilike.${pattern},description.ilike.${pattern}`);
        }

        // server-side ordering when possible
        if (sortType === 'views') query = query.order('views_count', { ascending: false });
        else if (sortType === 'likes') query = query.order('likes_count', { ascending: false });
        else if (sortType === 'rating') {
          try {
            query = query.order('avg_rating', { ascending: false });
          } catch (e) {
            // ignore and fallback to client-side sorting
          }
        } else {
          query = query.order('created_at', { ascending: false });
        }

        query = query.range(start, end);

        const { data, error } = await query;
        if (error) throw error;

        const normalized = (data || []).map(normalizeRow);

        // enforce client-side sort parity (defensive)
        const final = sortClient(normalized, sortType);

        if (mounted()) {
          setItems(prev => (append ? [...prev, ...final] : final));
          setOffset(pageOffset + final.length);
          // if we received fewer than requested, we reached the end
          setHasMore(final.length === pageSize && pageOffset + final.length < MAX_ITEMS);
        }
      } catch (err) {
        console.error('Explore fetch error:', err);
        if (mounted()) setError('Unable to load content.');
      } finally {
        if (mounted()) setLoading(false);
        fetchInProgress.current = false;
      }
    },
    // previewIds intentionally not included in deps (we want it to re-run when location.search changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [category, tag, searchTerm, sortType]
  );

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    // ensure any in-progress fetch is cancelled logically by guard
    fetchInProgress.current = false;
    fetchItems(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, fetchItems]);

  useEffect(() => {
    if (!hasMore || loading) return;

    // disconnect any existing observer before creating a new one
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // load next page
          fetchItems(offset, true);
        }
      },
      { rootMargin: '600px', threshold: 0.1 }
    );

    observerRef.current = observer;

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
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
          <BookSummaryCard key={item.id} summary={item} />
        ))}
      </div>

      {/* sentinel for intersection observer (loads next batch) */}
      {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}

      {/* fallback: a manual load-more button if automatic loading fails for any reason */}
      {hasMore && !loading && (
        <div className="explore-load-more-wrapper">
          <button
            className="explore-load-more"
            onClick={() => fetchItems(offset, true)}
            aria-label="Load more"
          >
            Load more
          </button>
        </div>
      )}

      {loading && <div className="explore-loading">Loading...</div>}
    </div>
  );
};

export default ExplorePage;
