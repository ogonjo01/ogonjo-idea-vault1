// src/components/ContentFeed/ContentFeed.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import './ContentFeed.css';

const ITEMS_PER_CAROUSEL = 12;
const CATEGORY_BATCH = 3;
const MIN_LOAD_MS = 350;
const LOAD_THROTTLE_MS = 600; // throttle for loadNextCategoryBatch
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

const safeData = (d) => (d?.data ?? d ?? []);
const normalizeRow = (r = {}) => {
  const likes = Array.isArray(r.likes_count) ? Number(r.likes_count?.[0]?.count ?? 0) : Number(r.likes_count ?? 0);
  const views = Array.isArray(r.views_count) ? Number(r.views_count?.[0]?.count ?? 0) : Number(r.views_count ?? 0);
  const comments = Array.isArray(r.comments_count) ? Number(r.comments_count?.[0]?.count ?? 0) : Number(r.comments_count ?? 0);
  return {
    id: r.id,
    title: r.title,
    author: r.author,
    summary: r.summary,
    category: r.category,
    image_url: r.image_url,
    affiliate_link: r.affiliate_link,
    likes_count: likes || 0,
    views_count: views || 0,
    comments_count: comments || 0,
    avg_rating: Number(r.avg_rating ?? 0),
  };
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* -- fetch helpers unchanged but kept safe */
const fetchRpcOrFallback = async (rpcName, { limit = ITEMS_PER_CAROUSEL, category = null } = {}) => {
  try {
    const args = { p_limit: limit };
    if (category) args.p_category = category;
    const rpcRes = await supabase.rpc(rpcName, args);
    if (!rpcRes.error && rpcRes.data) return safeData(rpcRes.data).map(normalizeRow);
  } catch (e) {
    // ignore rpc errors and fallback
  }
  try {
    let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS);
    if (category) q = q.eq('category', category);
    q = q.limit(500);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data || []).map((r) => {
      const likes = Number(r?.likes_count?.[0]?.count ?? r.likes_count ?? 0) || 0;
      const views = Number(r?.views_count?.[0]?.count ?? r.views_count ?? 0) || 0;
      const comments = Number(r?.comments_count?.[0]?.count ?? r.comments_count ?? 0) || 0;
      return { ...r, likes_count: likes, views_count: views, comments_count: comments, avg_rating: Number(r.avg_rating ?? 0) };
    });
    let sorted = rows.slice();
    if (rpcName.includes('new')) sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (rpcName.includes('liked')) sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    else if (rpcName.includes('rated')) sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (rpcName.includes('view')) sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    return sorted.slice(0, limit).map(normalizeRow);
  } catch (err) {
    console.error('fetchRpcOrFallback fallback error', err);
    return [];
  }
};

const fetchTopCategories = async (limit = 100) => {
  try {
    // reduced limit to avoid huge payloads
    const { data, error } = await supabase
      .from('book_summaries')
      .select('category')
      .not('category', 'is', null)
      .limit(2000);
    if (error) throw error;
    const counts = (data || []).reduce((acc, r) => {
      const key = (r.category || 'Uncategorized').trim();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, limit);
  } catch (err) {
    console.error('fetchTopCategories error', err);
    return [];
  }
};

/* ------------------ lightweight in-view hook ------------------ */
const useInView = (ref, options = {}) => {
  const [inView, setInView] = useState(false);
  const observerRef = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setInView(true);
          // once in view we can disconnect
          if (observerRef.current) observerRef.current.disconnect();
        }
      });
    }, options);
    observerRef.current.observe(node);
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [ref, options]);
  return inView;
};

/* ------------------ LazyLoadCarousel ------------------
   Renders skeleton HorizontalCarousel until it enters viewport,
   then renders the real HorizontalCarousel (children).
-----------------------------------------------------------------*/
const LazyLoadCarousel = ({ title, items, children, viewAllLink, loading, skeletonCount = 6, ...rest }) => {
  const wrapperRef = useRef(null);
  const isVisible = useInView(wrapperRef, { rootMargin: '600px', threshold: 0.05 });

  // show the real carousel only once visible, otherwise show skeleton placeholder
  return (
    <div ref={wrapperRef}>
      {isVisible ? (
        <HorizontalCarousel title={title} items={items} loading={loading} skeletonCount={skeletonCount} viewAllLink={viewAllLink} {...rest}>
          {children}
        </HorizontalCarousel>
      ) : (
        // Render skeleton carousel placeholder (lighter DOM)
        <HorizontalCarousel title={title} items={[]} loading={true} skeletonCount={skeletonCount} viewAllLink={viewAllLink} {...rest} />
      )}
    </div>
  );
};

/* ---------------- ContentFeed ---------------- */
const ContentFeed = ({ selectedCategory = 'For You', onEdit, onDelete, searchQuery = '' }) => {
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalContent, setGlobalContent] = useState({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });

  const [categoryQueue, setCategoryQueue] = useState([]);
  const [loadedCategoryBlocks, setLoadedCategoryBlocks] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [hasMoreCategories, setHasMoreCategories] = useState(false);

  const sentinelRef = useRef(null);
  const mountedRef = useRef(true);
  const lastLoadRef = useRef(0);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const fetchContentBlock = useCallback(async (category = null) => {
    const start = Date.now();
    try {
      const [newest, mostLiked, highestRated, mostViewed] = await Promise.all([
        fetchRpcOrFallback('get_newest', { category }),
        fetchRpcOrFallback('get_top_liked', { category }),
        fetchRpcOrFallback('get_highest_rated', { category }),
        fetchRpcOrFallback('get_top_viewed', { category }),
      ]);
      const elapsed = Date.now() - start;
      if (elapsed < 60) await sleep(60);
      return { category, newest, mostLiked, highestRated, mostViewed, loading: false };
    } catch (err) {
      console.error('fetchContentBlock error for', category, err);
      return { category, newest: [], mostLiked: [], highestRated: [], mostViewed: [], loading: false };
    }
  }, []);

  const loadNextCategoryBatch = useCallback(async () => {
    // throttle calls triggered by the sentinel
    const now = Date.now();
    if (now - lastLoadRef.current < LOAD_THROTTLE_MS) return;
    lastLoadRef.current = now;

    if (loadingCategories) return;
    if (!categoryQueue || categoryQueue.length === 0) {
      setHasMoreCategories(false);
      return;
    }

    setLoadingCategories(true);
    const batch = categoryQueue.slice(0, CATEGORY_BATCH);
    const rest = categoryQueue.slice(batch.length);

    // optimistic placeholders
    setLoadedCategoryBlocks((prev) => [
      ...prev,
      ...batch.map((c) => ({ category: c, newest: [], mostLiked: [], highestRated: [], mostViewed: [], loading: true })),
    ]);
    setCategoryQueue(rest);

    try {
      const blocks = await Promise.all(batch.map((c) => fetchContentBlock(c)));
      if (!mountedRef.current) return;
      setLoadedCategoryBlocks((prev) => {
        // remove placeholders for these categories
        const remaining = prev.filter(p => !batch.includes(p.category));
        // keep only non-empty blocks to avoid clutter; keep placeholders filled with empty arrays out if empty
        const nonEmpty = blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length));
        return [...remaining, ...nonEmpty];
      });
      setHasMoreCategories(rest.length > 0);
    } catch (err) {
      console.error('loadNextCategoryBatch err', err);
      setLoadedCategoryBlocks((prev) => prev.filter(p => !batch.includes(p.category)));
    } finally {
      if (mountedRef.current) setLoadingCategories(false);
    }
  }, [categoryQueue, loadingCategories, fetchContentBlock]);

  useEffect(() => {
    (async () => {
      setGlobalLoading(true);
      setLoadedCategoryBlocks([]);
      setCategoryQueue([]);
      setHasMoreCategories(false);
      setGlobalContent({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });

      // SEARCH MODE
      if (searchQuery && searchQuery.trim()) {
        const start = Date.now();
        try {
          const { data, error } = await supabase.rpc('book_summaries_search_prefix', { q: searchQuery, lim: 500 });
          if (error) throw error;
          const rows = safeData(data).map(normalizeRow);
          if (mountedRef.current) setGlobalContent({ newest: rows, mostLiked: [], highestRated: [], mostViewed: [] });
        } catch (err) {
          console.error('search error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setGlobalLoading(false);
        }
        return;
      }

      // SPECIFIC CATEGORY (single)
      const specific = selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All';
      if (specific) {
        const start = Date.now();
        try {
          setLoadedCategoryBlocks([{ category: selectedCategory, newest: [], mostLiked: [], highestRated: [], mostViewed: [], loading: true }]);
          const block = await fetchContentBlock(selectedCategory);
          if (mountedRef.current) {
            const hasAny = (block.newest.length || block.mostLiked.length || block.highestRated.length || block.mostViewed.length);
            setLoadedCategoryBlocks(hasAny ? [block] : []);
          }
        } catch (err) {
          console.error('specific category fetch error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setGlobalLoading(false);
        }
        return;
      }

      // DEFAULT "For You" / "All"
      const start = Date.now();
      try {
        setGlobalContent({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });
        // fetch global block + top categories (top 200 reduced for performance)
        const [globalBlock, cats] = await Promise.all([fetchContentBlock(), fetchTopCategories(200)]);
        if (!mountedRef.current) return;
        setGlobalContent(globalBlock);
        setCategoryQueue(cats);
        setHasMoreCategories(cats.length > 0);

        // initial category batch load (optimistic placeholders -> real blocks)
        const initial = cats.slice(0, CATEGORY_BATCH);
        const rest = cats.slice(initial.length);
        if (initial.length) {
          setLoadedCategoryBlocks(initial.map((c) => ({ category: c, newest: [], mostLiked: [], highestRated: [], mostViewed: [], loading: true })));
          const blocks = await Promise.all(initial.map((c) => fetchContentBlock(c)));
          if (!mountedRef.current) return;
          const nonEmpty = blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length));
          setLoadedCategoryBlocks(nonEmpty);
          setCategoryQueue(rest);
          setHasMoreCategories(rest.length > 0);
        }
      } catch (err) {
        console.error('Initial global load failed:', err);
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
        if (mountedRef.current) setGlobalLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery]);

  // intersection observer for infinite categories (sentinel)
  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMoreCategories && !loadingCategories) {
          loadNextCategoryBatch();
        }
      });
    }, { root: null, rootMargin: '800px', threshold: 0.1 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMoreCategories, loadingCategories, loadNextCategoryBatch]);

  const renderCards = (items) => (items || []).map((summary) => (
    <BookSummaryCard key={String(summary.id)} summary={summary} onEdit={onEdit} onDelete={onDelete} />
  ));

  const isForYou = selectedCategory === 'For You' || selectedCategory === 'All';

  return (
    <div className="content-feed-root">
      {/* SEARCH */}
      {searchQuery && searchQuery.trim() && (
        <LazyLoadCarousel
          title={`Search results for "${searchQuery}"`}
          items={globalContent.newest}
          loading={globalLoading}
          skeletonCount={6}
          viewAllLink={`/explore?q=${encodeURIComponent(searchQuery)}`}
        >
          {renderCards(globalContent.newest)}
        </LazyLoadCarousel>
      )}

      {/* SPECIFIC CATEGORY */}
      {(!isForYou && !searchQuery) && loadedCategoryBlocks.length > 0 && (
        <div key={loadedCategoryBlocks[0].category}>
          {['newest', 'mostLiked', 'highestRated', 'mostViewed'].map((k) => {
            const titleMap = {
              newest: `Newest in ${loadedCategoryBlocks[0].category}`,
              mostLiked: `Most Liked in ${loadedCategoryBlocks[0].category}`,
              highestRated: `Most Rated in ${loadedCategoryBlocks[0].category}`,
              mostViewed: `Most Viewed in ${loadedCategoryBlocks[0].category}`,
            };
            const items = loadedCategoryBlocks[0][k] || [];
            const isBlockLoading = loadedCategoryBlocks[0].loading;
            return (
              <LazyLoadCarousel
                key={k}
                title={titleMap[k]}
                items={items}
                loading={globalLoading || isBlockLoading}
                skeletonCount={6}
                viewAllLink={`/explore?sort=${k === 'newest' ? 'newest' : (k === 'mostLiked' ? 'likes' : (k === 'highestRated' ? 'rating' : 'views'))}&category=${encodeURIComponent(loadedCategoryBlocks[0].category)}`}
              >
                {renderCards(items)}
              </LazyLoadCarousel>
            );
          })}
        </div>
      )}

      {/* FOR YOU / ALL */}
      {isForYou && !searchQuery && (
        <>
          <LazyLoadCarousel title="Newest" items={globalContent.newest} loading={globalLoading} skeletonCount={6} viewAllLink="/explore?sort=newest">
            {renderCards(globalContent.newest)}
          </LazyLoadCarousel>

          <LazyLoadCarousel title="Most Liked" items={globalContent.mostLiked} loading={globalLoading} skeletonCount={6} viewAllLink="/explore?sort=likes">
            {renderCards(globalContent.mostLiked)}
          </LazyLoadCarousel>

          <LazyLoadCarousel title="Most Rated" items={globalContent.highestRated} loading={globalLoading} skeletonCount={6} viewAllLink="/explore?sort=rating">
            {renderCards(globalContent.highestRated)}
          </LazyLoadCarousel>

          <LazyLoadCarousel title="Most Viewed" items={globalContent.mostViewed} loading={globalLoading} skeletonCount={6} viewAllLink="/explore?sort=views">
            {renderCards(globalContent.mostViewed)}
          </LazyLoadCarousel>

          {loadedCategoryBlocks.map((block) => (
            <section className="category-block" key={block.category}>
              <div className="category-block-header">
                <h3 className="cat-title" data-category={block.category}>{block.category}</h3>
                <a className="cat-viewall" href={`/explore?category=${encodeURIComponent(block.category)}`}>View all</a>
              </div>

              <LazyLoadCarousel title={`Newest in ${block.category}`} items={block.newest} loading={globalLoading || block.loading} skeletonCount={4}>
                {renderCards(block.newest)}
              </LazyLoadCarousel>

              <LazyLoadCarousel title={`Most Liked in ${block.category}`} items={block.mostLiked} loading={globalLoading || block.loading} skeletonCount={4}>
                {renderCards(block.mostLiked)}
              </LazyLoadCarousel>

              <LazyLoadCarousel title={`Highest Rated in ${block.category}`} items={block.highestRated} loading={globalLoading || block.loading} skeletonCount={4}>
                {renderCards(block.highestRated)}
              </LazyLoadCarousel>

              <LazyLoadCarousel title={`Most Viewed in ${block.category}`} items={block.mostViewed} loading={globalLoading || block.loading} skeletonCount={4}>
                {renderCards(block.mostViewed)}
              </LazyLoadCarousel>
            </section>
          ))}

          <div ref={sentinelRef} style={{ height: 1, width: '100%' }} aria-hidden="true" />
          {loadingCategories && <div className="categories-loading">Loading more categories...</div>}
          {!hasMoreCategories && !loadingCategories && loadedCategoryBlocks.length > 0 && (
            <div className="categories-end">You've reached the end of the line.</div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentFeed;
