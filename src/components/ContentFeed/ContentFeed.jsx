// src/components/ContentFeed/ContentFeed.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import './ContentFeed.css';

const ITEMS_PER_CAROUSEL = 12;
const CATEGORY_BATCH = 3;
const MIN_LOAD_MS = 350; // minimum skeleton display to avoid flashes

// Lightweight select for feed (use description instead of full summary)
const LIGHT_SELECT = `
  id,
  created_at,
  title,
  author,
  description,
  category,
  tags,
  user_id,
  image_url,
  affiliate_link,
  avg_rating,
  slug
`;

// Select with aggregates for heavier queries
const SELECT_WITH_COUNTS = `
  id,
  created_at,
  title,
  author,
  description,
  category,
  tags,
  user_id,
  image_url,
  affiliate_link,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count),
  avg_rating,
  slug
`;

// helpers
const safeData = (d) => (d?.data ?? d ?? []);

// robust parser for numbers/aggregates
const parseNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (Array.isArray(v) && v.length) {
    const first = v[0];
    return parseNumber(first.avg ?? first.count ?? first.value ?? first.avg_rating ?? first.rating ?? first);
  }
  if (typeof v === 'object') {
    return parseNumber(v.avg ?? v.count ?? v.value ?? v.avg_rating ?? v.rating ?? v.rating_count);
  }
  return 0;
};

const _safeString = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') return String(v);
  return v.trim();
};

const normalizeRow = (r = {}) => {
  const likes = parseNumber(r.likes_count);
  const views = parseNumber(r.views_count);
  const comments = parseNumber(r.comments_count);

  const avg_rating = parseNumber(r.avg_rating ?? r.avg ?? r.rating ?? r.average_rating);
  const rating_count = parseNumber(r.rating_count ?? r.ratings_count ?? r.rating_count_aggregate ?? r.count ?? r.rating_count_value);

  // Defensive fallbacks
  const safeTitle = _safeString(r.title) || 'Untitled';
  const safeAuthor = _safeString(r.author) || _safeString(r.creator_name) || _safeString(r.creator) || '';
  const safeImage = _safeString(r.image_url) || _safeString(r.cover) || _safeString(r.cover_url) || null;

  // Ensure tags normalized to lower-case array
  const rawTags = r.tags || [];
  const tags = Array.isArray(rawTags) ? rawTags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).toLowerCase())) : [];

  return {
    id: r.id,
    slug: r.slug ?? null,
    title: safeTitle,
    author: safeAuthor,
    description: r.description ?? null, // short feed preview
    summary: r.summary ?? null, // keep if present (not fetched in feed)
    category: r.category,
    tags,
    image_url: safeImage,
    affiliate_link: r.affiliate_link,
    likes_count: Number(likes || 0),
    views_count: Number(views || 0),
    comments_count: Number(comments || 0),
    avg_rating: Number(avg_rating || 0),
    rating_count: Number(rating_count || 0),
    created_at: r.created_at ?? null,
  };
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* heavy RPC/fallback (mostly unchanged) */
const fetchRpcOrFallback = async (rpcName, { limit = ITEMS_PER_CAROUSEL, category = null } = {}) => {
  try {
    const args = { p_limit: limit };
    if (category) args.p_category = category;
    const rpcRes = await supabase.rpc(rpcName, args);
    if (!rpcRes.error && rpcRes.data) {
      console.debug('[fetchRpcOrFallback] rpc data', { rpcName, category, limit, count: (rpcRes.data || []).length });
      return safeData(rpcRes.data).map(normalizeRow);
    }
    if (rpcRes.error) {
      console.warn(`[rpc] ${rpcName} error:`, rpcRes.error);
    }
  } catch (e) {
    console.warn(`[rpc] ${rpcName} threw`, e?.message || e);
  }

  // fallback client-side (heavier)
  try {
    let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS);
    if (category) q = q.eq('category', category);
    q = q.limit(500);
    const { data, error } = await q;
    if (error) throw error;

    console.debug('[fetchRpcOrFallback] fallback data', { rpcName, category, rows: (data || []).length });

    const rows = (data || []).map(normalizeRow);

    let sorted = rows.slice();
    if (rpcName.includes('new')) sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (rpcName.includes('liked')) sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    else if (rpcName.includes('rated')) sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (rpcName.includes('view')) sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));

    return sorted.slice(0, limit);
  } catch (err) {
    console.error('[fallback] fetch error', err);
    return [];
  }
};

const fetchTopCategories = async (limit = 50) => {
  try {
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

const ContentFeed = ({ selectedCategory = 'For You', onEdit, onDelete, searchQuery = '' }) => {
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  // globalContent will first contain fast placeholders, then replaced by heavy results
  const [globalContent, setGlobalContent] = useState({
    newest: [],
    mostLiked: [],
    highestRated: [],
    mostViewed: [],
  });

  const [categoryQueue, setCategoryQueue] = useState([]);
  const [loadedCategoryBlocks, setLoadedCategoryBlocks] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [hasMoreCategories, setHasMoreCategories] = useState(false);

  // tags states
  const [availableTags, setAvailableTags] = useState([]); // all tags discovered in DB or category
  const [selectedTags, setSelectedTags] = useState([]); // user-selected tags for boosting

  const rootRef = useRef(null);           // <-- feed root ref for instant jump
  const sentinelRef = useRef(null);
  const mountedRef = useRef(true);

  // cache for fast placeholders per-category to avoid refetching
  const fastCacheRef = useRef(new Map());

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Scroll-to-top (instant jump) when category/search changes
  useEffect(() => {
    const scrollToFeedTop = () => {
      try {
        const el = rootRef.current;
        if (el) {
          // compute absolute top and adjust for fixed header if present
          const rectTop = el.getBoundingClientRect().top + window.pageYOffset;
          const header = document.querySelector('header');
          const headerH = header ? (header.offsetHeight || 0) : 0;
          const top = Math.max(0, rectTop - headerH - 8);
          window.scrollTo({ top, behavior: 'auto' }); // instant jump (Option B)
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } catch (err) {
        // fallback
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) {}
      }
    };

    // immediate jump
    scrollToFeedTop();
    // retry shortly after to account for placeholders/layout shifts
    const t = setTimeout(scrollToFeedTop, 120);
    return () => clearTimeout(t);
  }, [selectedCategory, searchQuery]); // run when category or searchQuery changes

  // ---- TAGS: load tags once or per-category for chips bar (lightweight) ----
  useEffect(() => {
    (async () => {
      try {
        // Build query: all tags for For You / All, or only tags for the specific category
        let q = supabase
          .from('book_summaries')
          .select('tags')
          .limit(2000);

        const specific = selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All';
        if (specific) {
          q = q.eq('category', selectedCategory);
        }

        const { data, error } = await q;
        if (error) throw error;

        const set = new Set();
        (data || []).forEach(row => {
          const arr = row?.tags || [];
          if (Array.isArray(arr)) {
            arr.forEach(t => {
              if (t && typeof t === 'string') set.add(t.trim().toLowerCase());
            });
          }
        });

        const list = Array.from(set).sort();
        if (mountedRef.current) {
          setAvailableTags(list);
          // prune selectedTags to only those available in the new list
          setSelectedTags(prev => {
            if (!Array.isArray(prev) || prev.length === 0) return [];
            const avail = new Set(list);
            return prev.filter(t => avail.has(t.toLowerCase()));
          });
        }
      } catch (err) {
        console.warn('Could not load tags for chips bar', err);
      }
    })();
  }, [selectedCategory]);
  // ------------------------------------------------------------------------

  // FAST lightweight fetch for immediate UI (by category or global)
  const fastFetchList = useCallback(async (limit = ITEMS_PER_CAROUSEL, category = null) => {
    // check cache
    const cacheKey = category ? `cat:${category}` : `global`;
    const cache = fastCacheRef.current.get(cacheKey);
    if (cache) return cache;

    try {
      let q = supabase
        .from('book_summaries')
        .select(LIGHT_SELECT)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (category) q = q.eq('category', category);

      const { data, error } = await q;
      if (error) throw error;

      const normalized = (data || []).map((r) => normalizeRow(r));
      fastCacheRef.current.set(cacheKey, normalized);
      return normalized;
    } catch (err) {
      console.warn('fastFetchList failed', err);
      return [];
    }
  }, []);

  // heavy fetch (keeps original behavior)
  const fetchContentBlock = useCallback(async (category = null) => {
    try {
      const start = Date.now();
      const [newest, mostLiked, highestRated, mostViewed] = await Promise.all([
        fetchRpcOrFallback('get_newest', { category }),
        fetchRpcOrFallback('get_top_liked', { category }),
        fetchRpcOrFallback('get_highest_rated', { category }),
        fetchRpcOrFallback('get_top_viewed', { category }),
      ]);
      const elapsed = Date.now() - start;
      if (elapsed < 50) await sleep(50);
      return {
        category,
        newest: newest || [],
        mostLiked: mostLiked || [],
        highestRated: highestRated || [],
        mostViewed: mostViewed || [],
      };
    } catch (err) {
      console.error('fetchContentBlock error for', category, err);
      return { category, newest: [], mostLiked: [], highestRated: [], mostViewed: [] };
    }
  }, []);

  // helper to replace a block in loadedCategoryBlocks by category (used after background heavy fetch)
  const replaceCategoryBlock = useCallback((newBlock) => {
    setLoadedCategoryBlocks((prev) => {
      const idx = prev.findIndex((b) => String(b.category) === String(newBlock.category));
      if (idx === -1) {
        return [...prev, newBlock];
      }
      const copy = prev.slice();
      copy[idx] = newBlock;
      return copy;
    });
  }, []);

  // ranking function: boost items by selected tags while preserving intended primary sort
  const rankItemsWithBoost = useCallback((items = [], selectedTags = [], sortKey = 'newest') => {
    if (!items || items.length === 0) return [];
    if (!selectedTags || selectedTags.length === 0) {
      // just apply default sort according to sortKey
      if (sortKey === 'newest') return items.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sortKey === 'likes') return items.slice().sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      if (sortKey === 'rating') return items.slice().sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
      if (sortKey === 'views') return items.slice().sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      return items.slice();
    }

    // compute matchCount for each item
    const tagSet = new Set(selectedTags.map(t => t.toLowerCase()));
    const scored = items.map(it => {
      const itemTags = Array.isArray(it.tags) ? it.tags.map(t => (t || '').toLowerCase()) : [];
      const matchCount = itemTags.reduce((acc, t) => acc + (tagSet.has(t) ? 1 : 0), 0);
      return { it, matchCount };
    });

    // sorting: highest matchCount first, then fallback to primary metric
    const sorted = scored.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      // tie-breaker by sortKey
      if (sortKey === 'newest') return new Date(b.it.created_at) - new Date(a.it.created_at);
      if (sortKey === 'likes') return (b.it.likes_count || 0) - (a.it.likes_count || 0);
      if (sortKey === 'rating') return (b.it.avg_rating || 0) - (a.it.avg_rating || 0);
      if (sortKey === 'views') return (b.it.views_count || 0) - (a.it.views_count || 0);
      return 0;
    }).map(s => s.it);

    return sorted;
  }, []);

  // loadNextCategoryBatch now: quickly add placeholders then background-replace with heavy results
  const loadNextCategoryBatch = useCallback(async () => {
    if (loadingCategories) return;
    if (!categoryQueue || categoryQueue.length === 0) {
      setHasMoreCategories(false);
      return;
    }
    setLoadingCategories(true);
    const batch = categoryQueue.slice(0, CATEGORY_BATCH);
    const rest = categoryQueue.slice(batch.length);
    // optimistic queue update
    setCategoryQueue(rest);

    try {
      // 1) fast placeholders for batch (immediate)
      const placeholderPromises = batch.map((c) => fastFetchList(4, c).then((items) => ({
        category: c,
        newest: items,
        mostLiked: items,
        highestRated: items,
        mostViewed: items,
      })));
      const placeholders = await Promise.all(placeholderPromises);
      if (!mountedRef.current) return;
      // append placeholders quickly
      setLoadedCategoryBlocks((prev) => [...prev, ...placeholders]);

      // 2) start background heavy fetch to replace placeholders
      (async () => {
        try {
          const blocks = await Promise.all(batch.map((c) => fetchContentBlock(c)));
          if (!mountedRef.current) return;
          const nonEmpty = blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length));
          nonEmpty.forEach((blk) => replaceCategoryBlock(blk));
        } catch (err) {
          console.error('background load batch error', err);
        }
      })();

      setHasMoreCategories(rest.length > 0);
    } catch (err) {
      console.error('loadNextCategoryBatch err', err);
    } finally {
      if (mountedRef.current) setLoadingCategories(false);
    }
  }, [categoryQueue, loadingCategories, fetchContentBlock, fastFetchList, replaceCategoryBlock]);

  // MAIN orchestration
  useEffect(() => {
    (async () => {
      setLoadingGlobal(true);
      setLoadedCategoryBlocks([]);
      setCategoryQueue([]);
      setHasMoreCategories(false);
      setGlobalContent({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });

      // SEARCH mode
      if (searchQuery && searchQuery.trim()) {
        const start = Date.now();
        try {
          const fast = await fastFetchList(ITEMS_PER_CAROUSEL);
          if (mountedRef.current) {
            setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });
          }
          const { data, error } = await supabase.rpc('book_summaries_search_prefix', { q: searchQuery, lim: 500 });
          if (error) throw error;
          const rows = safeData(data).map(normalizeRow);
          if (mountedRef.current) setGlobalContent({ newest: rows, mostLiked: [], highestRated: [], mostViewed: [] });
        } catch (err) {
          console.error('search error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setLoadingGlobal(false);
        }
        return;
      }

      // SPECIFIC CATEGORY PAGE
      const specific = selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All';
      if (specific) {
        const start = Date.now();
        try {
          const placeholder = await fastFetchList(ITEMS_PER_CAROUSEL, selectedCategory);
          if (mountedRef.current) {
            setLoadedCategoryBlocks([{ category: selectedCategory, newest: placeholder, mostLiked: placeholder, highestRated: placeholder, mostViewed: placeholder }]);
          }
          // background heavy fetch & replace
          (async () => {
            try {
              const block = await fetchContentBlock(selectedCategory);
              if (!mountedRef.current) return;
              setLoadedCategoryBlocks((block.newest.length || block.mostLiked.length || block.highestRated.length || block.mostViewed.length) ? [block] : []);
            } catch (err) {
              console.error('specific category background fetch error', err);
            }
          })();
        } catch (err) {
          console.error('specific category fetch error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setLoadingGlobal(false);
        }
        return;
      }

      // DEFAULT For You flow
      const start = Date.now();
      try {
        // 1) FAST placeholder global content (single cheap request) -> immediate paint
        const fast = await fastFetchList(ITEMS_PER_CAROUSEL);
        if (!mountedRef.current) return;
        setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });

        // 2) background: load heavy global block + categories + initial category placeholders -> then replace with heavy blocks
        (async () => {
          try {
            const [globalBlock, cats] = await Promise.all([fetchContentBlock(), fetchTopCategories(200)]);
            if (!mountedRef.current) return;
            setGlobalContent(globalBlock);
            setCategoryQueue(cats);
            setHasMoreCategories(cats.length > 0);

            // initial category placeholders (fast)
            const initialBatch = cats.slice(0, CATEGORY_BATCH);
            const rest = cats.slice(initialBatch.length);
            if (initialBatch.length) {
              const placeholderPromises = initialBatch.map((c) => fastFetchList(4, c).then((items) => ({
                category: c,
                newest: items,
                mostLiked: items,
                highestRated: items,
                mostViewed: items,
              })));
              const placeholders = await Promise.all(placeholderPromises);
              if (!mountedRef.current) return;
              setLoadedCategoryBlocks(placeholders);
              setCategoryQueue(rest);
              setHasMoreCategories(rest.length > 0);

              // background: fetch full blocks & replace placeholders
              (async () => {
                try {
                  const blocks = await Promise.all(initialBatch.map((c) => fetchContentBlock(c)));
                  if (!mountedRef.current) return;
                  const nonEmpty = blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length));
                  nonEmpty.forEach((blk) => replaceCategoryBlock(blk));
                } catch (err) {
                  console.error('background initial category fetch failed', err);
                }
              })();
            }
          } catch (err) {
            console.error('background load failed', err);
          }
        })();
      } catch (err) {
        console.error('Initial global fast load failed:', err);
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
        if (mountedRef.current) setLoadingGlobal(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery, fastFetchList, fetchContentBlock, replaceCategoryBlock]);

  // sentinel observer for loading additional categories
  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMoreCategories && !loadingCategories) {
          loadNextCategoryBatch();
        }
      });
    }, { root: null, rootMargin: '600px', threshold: 0.1 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMoreCategories, loadingCategories, loadNextCategoryBatch]);

  // tag chips toggle
  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const copy = Array.isArray(prev) ? prev.slice() : [];
      const lower = tag.toLowerCase();
      if (copy.includes(lower)) return copy.filter(t => t !== lower);
      return [...copy, lower];
    });
  };

  const clearTags = () => setSelectedTags([]);

  const renderCards = (items, sortKey) => {
    // apply boosting ranking using selectedTags
    const ranked = rankItemsWithBoost(items || [], selectedTags, sortKey);
    return (ranked || []).map((summary) => (
      <BookSummaryCard key={String(summary.id ?? summary.slug)} summary={summary} onEdit={onEdit} onDelete={onDelete} />
    ));
  };

  const isForYou = selectedCategory === 'For You' || selectedCategory === 'All';

  return (
    <div className="content-feed-root" ref={rootRef}>
      {/* =========================
          Intro / Mission Banner
          - placed before tags / chips bar
          - max-height set so it does not occupy more than 30% of viewport height
          ========================= */}
      <section
        className="intro-banner"
        role="region"
        aria-label="Mission statement"
        aria-live="polite"
      >
        <div className="intro-banner-inner">
          <div className="intro-banner-icon" aria-hidden="true">
            {/* subtle inline SVG icon (abstract book / seed) */}
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" role="img">
              <path d="M3 6c0 6 4 10 9 12 5-2 9-6 9-12-4 0-7 3-9 3S7 6 3 6z" fill="white" opacity="0.15" />
              <path d="M12 2c-.9 1.3-3.6 3.1-8 3v2c4.2 0 7 2 8 3 1-1 3.8-3 8-3V5c-4.4 0-7.1-1.7-8-3z" fill="white" opacity="0.08" />
            </svg>
          </div>

          <div className="intro-banner-text">
            <div className="intro-banner-title">
              Behind every business is a dream.
            </div>
            <div className="intro-banner-subtitle">
              Our mission is to give you the insight and support you need to turn that dream into something real.
            </div>
          </div>

          <div className="intro-banner-cta">
            <a className="btn-mini" href="/about" title="Learn more about our mission">Learn more</a>
          </div>
        </div>
      </section>

      {/* TAGS BAR */}
      <div className="categories-bar" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {availableTags.length === 0 ? (
            // Distinguish between global (loading) vs specific-category empty
            (selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All') ? (
              <div className="hf-loading">No tags for this category.</div>
            ) : (
              <div className="hf-loading">Loading tags…</div>
            )
          ) : (
            availableTags.map((tag) => {
              const active = selectedTags.includes(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  className={`category-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  type="button"
                  title={`Boost by ${tag}`}
                >
                  {tag}
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedTags.length > 0 && (
            <button className="hf-btn" type="button" onClick={clearTags}>Clear tags ({selectedTags.length})</button>
          )}
        </div>
      </div>

      {/* SEARCH */}
      {searchQuery && searchQuery.trim() && (
        <HorizontalCarousel
          title={`Search results for "${searchQuery}"`}
          items={globalContent.newest}
          loading={loadingGlobal}
          skeletonCount={6}
          viewAllLink={`/explore?q=${encodeURIComponent(searchQuery)}`}
        >
          {renderCards(globalContent.newest, 'newest')}
        </HorizontalCarousel>
      )}

      {/* SPECIFIC CATEGORY PAGE */}
      {(!isForYou && !searchQuery) && loadedCategoryBlocks.length > 0 && (
        <div key={loadedCategoryBlocks[0].category}>
          {['newest', 'mostLiked', 'highestRated', 'mostViewed'].map((k) => {
            const titleMap = {
              newest: `Newest in ${loadedCategoryBlocks[0].category}`,
              mostLiked: `Most Liked in ${loadedCategoryBlocks[0].category}`,
              highestRated: `Most Rated in ${loadedCategoryBlocks[0].category}`,
              mostViewed: `Most Viewed in ${loadedCategoryBlocks[0].category}`,
            };
            const items = loadedCategoryBlocks[0][k];
            const sortKey = k === 'newest' ? 'newest' : (k === 'mostLiked' ? 'likes' : (k === 'highestRated' ? 'rating' : 'views'));
            return (
              <HorizontalCarousel
                key={k}
                title={titleMap[k]}
                items={items}
                loading={loadingGlobal}
                skeletonCount={6}
                viewAllLink={`/explore?sort=${sortKey}&category=${encodeURIComponent(loadedCategoryBlocks[0].category)}`}
              >
                {renderCards(items, sortKey)}
              </HorizontalCarousel>
            );
          })}
        </div>
      )}

      {/* FOR YOU / ALL */}
      {isForYou && !searchQuery && (
        <>
          <HorizontalCarousel
            title="Newest"
            items={globalContent.newest}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=newest"
          >
            {renderCards(globalContent.newest, 'newest')}
          </HorizontalCarousel>
          <HorizontalCarousel
            title="Most Liked"
            items={globalContent.mostLiked}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=likes"
          >
            {renderCards(globalContent.mostLiked, 'likes')}
          </HorizontalCarousel>
          <HorizontalCarousel
            title="Most Rated"
            items={globalContent.highestRated}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=rating"
          >
            {renderCards(globalContent.highestRated, 'rating')}
          </HorizontalCarousel>
          <HorizontalCarousel
            title="Most Viewed"
            items={globalContent.mostViewed}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=views"
          >
            {renderCards(globalContent.mostViewed, 'views')}
          </HorizontalCarousel>

          {loadedCategoryBlocks.map((block) => (
            <section className="category-block" key={block.category}>
              <div className="category-block-header">
                <h3 className="cat-title">{block.category}</h3>
                <a className="cat-viewall" href={`/explore?category=${encodeURIComponent(block.category)}`}>View all</a>
              </div>

              <HorizontalCarousel
                title={`Newest in ${block.category}`}
                items={block.newest}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=newest&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.newest, 'newest')}
              </HorizontalCarousel>
              <HorizontalCarousel
                title={`Most Liked in ${block.category}`}
                items={block.mostLiked}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=likes&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.mostLiked, 'likes')}
              </HorizontalCarousel>
              <HorizontalCarousel
                title={`Highest Rated in ${block.category}`}
                items={block.highestRated}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=rating&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.highestRated, 'rating')}
              </HorizontalCarousel>
              <HorizontalCarousel
                title={`Most Viewed in ${block.category}`}
                items={block.mostViewed}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=views&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.mostViewed, 'views')}
              </HorizontalCarousel>
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
