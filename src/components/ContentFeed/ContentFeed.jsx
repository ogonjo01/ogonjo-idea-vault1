// src/components/ContentFeed/ContentFeed.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import './ContentFeed.css';

const ITEMS_PER_CAROUSEL = 12;
const CATEGORY_BATCH = 3;
const MIN_LOAD_MS = 350;

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
  slug,
  difficulty_level
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
  slug,
  difficulty_level
`;

/* ---------- helpers ---------- */
const safeData = (d) => (d?.data ?? d ?? []);

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

  const safeTitle = _safeString(r.title) || 'Untitled';
  const safeAuthor = _safeString(r.author) || _safeString(r.creator_name) || _safeString(r.creator) || '';
  const safeImage = _safeString(r.image_url) || _safeString(r.cover) || _safeString(r.cover_url) || null;

  const rawTags = r.tags || [];
  const tags = Array.isArray(rawTags) ? rawTags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).toLowerCase())) : [];

  return {
    id: r.id,
    slug: r.slug ?? null,
    title: safeTitle,
    author: safeAuthor,
    description: r.description ?? null,
    summary: r.summary ?? null,
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
    // propagate difficulty_level from DB into normalized row
    difficulty_level: r.difficulty_level ?? null,
  };
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* ---------------- RPC / fallback fetch ---------------- */
const fetchRpcOrFallback = async (rpcName, { limit = ITEMS_PER_CAROUSEL, category = null } = {}) => {
  try {
    const args = { p_limit: limit };
    if (category) args.p_category = category;
    const rpcRes = await supabase.rpc(rpcName, args);
    if (!rpcRes.error && rpcRes.data) {
      return safeData(rpcRes.data).map(normalizeRow);
    }
  } catch (e) {
    console.warn(`[rpc] ${rpcName} threw`, e?.message || e);
  }

  try {
    let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS);
    if (category) q = q.eq('category', category);
    q = q.limit(500);
    const { data, error } = await q;
    if (error) throw error;
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

/* ---------------- lightweight search scoring ---------------- */
const normalizeText = (s = '') => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

// original similarityScore kept as a strong-signal scorer
const similarityScore = (item, query) => {
  const q = normalizeText(query);
  if (!q) return 0;
  let score = 0;
  const title = normalizeText(item.title || '');
  const slug = normalizeText(item.slug || '');
  const author = normalizeText(item.author || '');
  const desc = normalizeText(item.description || '');

  if (title === q) score += 300;
  if (title.includes(q)) score += 120;
  if (slug.includes(q)) score += 100;
  if (author.includes(q)) score += 60;
  if (desc.includes(q)) score += 40;

  if (Array.isArray(item.tags) && item.tags.length) {
    item.tags.forEach(t => {
      const tt = normalizeText(t);
      if (!tt) return;
      if (q === tt) score += 60;
      else if (q.includes(tt) || tt.includes(q)) score += 20;
    });
  }
  return score;
};

/* ---------------- Component ---------------- */
const ContentFeed = ({ selectedCategory = 'For You', onEdit, onDelete, searchQuery = '' }) => {
  const location = useLocation();

  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [globalContent, setGlobalContent] = useState({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });

  const [categoryQueue, setCategoryQueue] = useState([]);
  const [loadedCategoryBlocks, setLoadedCategoryBlocks] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [hasMoreCategories, setHasMoreCategories] = useState(false);

  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const [taggedResults, setTaggedResults] = useState(null);
  const [taggedLoading, setTaggedLoading] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [searchRelated, setSearchRelated] = useState([]);

  const [tagsReloadKey, setTagsReloadKey] = useState(0);

  const rootRef = useRef(null);
  const sentinelRef = useRef(null);
  const mountedRef = useRef(true);
  const fastCacheRef = useRef(new Map());

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // EFFECT A: ensure SPA navigation always starts at top of page AFTER route change (fallback)
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
      // also reset document scroll positions
      if (document && document.documentElement) document.documentElement.scrollTop = 0;
      if (document && document.body) document.body.scrollTop = 0;
    } catch (e) {
      // ignore
    }
  }, [location.pathname]);

  // EFFECT B: attach a click-capture handler to the feed root that scrolls to top BEFORE navigation
  // This prevents cases where the browser preserves scroll or the next page renders and scroll lands middle/end.
  useEffect(() => {
    const root = rootRef.current || document;
    if (!root) return;

    const onLinkClickCapture = (e) => {
      try {
        // only run for primary button clicks (ignore modifiers)
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const a = e.target && e.target.closest && e.target.closest('a');
        if (!a) return;

        const href = a.getAttribute('href') || a.href;
        if (!href) return;

        // Make absolute URL
        let url;
        try { url = new URL(href, window.location.origin); } catch (err) { return; }

        // Only internal app routes
        if (url.origin !== window.location.origin) return;

        // If the destination is a summary page (change to your route if different), scroll to top immediately
        if (url.pathname.startsWith('/summary/')) {
          window.scrollTo({ top: 0, behavior: 'auto' });
          if (document && document.documentElement) document.documentElement.scrollTop = 0;
          if (document && document.body) document.body.scrollTop = 0;
        }
      } catch (err) {
        // swallow
      }
    };

    root.addEventListener('click', onLinkClickCapture, true); // capture phase
    return () => {
      root.removeEventListener('click', onLinkClickCapture, true);
    };
  }, []);

  // effectiveQuery mirrors incoming prop (trimmed). We will scope DB queries to selectedCategory,
  // but do not auto-clear the effectiveQuery (keeps user intent stable while navigating).
  const [effectiveQuery, setEffectiveQuery] = useState((searchQuery || '').trim());
  useEffect(() => { setEffectiveQuery((searchQuery || '').trim()); }, [searchQuery]);

  // Scroll-to-top when category or effectiveQuery changes (feed-specific)
  useEffect(() => {
    const scrollToFeedTop = () => {
      try {
        const el = rootRef.current;
        if (el) {
          const rectTop = el.getBoundingClientRect().top + window.pageYOffset;
          const header = document.querySelector('header');
          const headerH = header ? (header.offsetHeight || 0) : 0;
          const top = Math.max(0, rectTop - headerH - 8);
          window.scrollTo({ top, behavior: 'auto' });
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } catch (err) {
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) {}
      }
    };
    scrollToFeedTop();
    const t = setTimeout(scrollToFeedTop, 120);
    return () => clearTimeout(t);
  }, [selectedCategory, effectiveQuery]);

  // ---- Tags loader ----
  useEffect(() => {
    (async () => {
      try {
        let q = supabase.from('book_summaries').select('tags').limit(5000);
        const specific = selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All';
        if (specific) q = q.eq('category', selectedCategory);
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
  }, [selectedCategory, tagsReloadKey]);

  // FAST lightweight fetch
  const fastFetchList = useCallback(async (limit = ITEMS_PER_CAROUSEL, category = null) => {
    const cacheKey = category ? `cat:${category}` : `global`;
    const cache = fastCacheRef.current.get(cacheKey);
    if (cache) return cache;
    try {
      let q = supabase.from('book_summaries').select(LIGHT_SELECT).order('created_at', { ascending: false }).limit(limit);
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

  // heavy fetch (global blocks)
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
      return { category, newest: newest || [], mostLiked: mostLiked || [], highestRated: highestRated || [], mostViewed: mostViewed || [] };
    } catch (err) {
      console.error('fetchContentBlock error for', category, err);
      return { category, newest: [], mostLiked: [], highestRated: [], mostViewed: [] };
    }
  }, []);

  const replaceCategoryBlock = useCallback((newBlock) => {
    setLoadedCategoryBlocks((prev) => {
      const idx = prev.findIndex((b) => String(b.category) === String(newBlock.category));
      if (idx === -1) return [...prev, newBlock];
      const copy = prev.slice();
      copy[idx] = newBlock;
      return copy;
    });
  }, []);

  // ranking with tag boost
  const rankItemsWithBoost = useCallback((items = [], selectedTags = [], sortKey = 'newest') => {
    if (!items || items.length === 0) return [];
    if (!selectedTags || selectedTags.length === 0) {
      if (sortKey === 'newest') return items.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sortKey === 'likes') return items.slice().sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      if (sortKey === 'rating') return items.slice().sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
      if (sortKey === 'views') return items.slice().sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      return items.slice();
    }
    const tagSet = new Set(selectedTags.map(t => t.toLowerCase()));
    const scored = items.map(it => {
      const itemTags = Array.isArray(it.tags) ? it.tags.map(t => (t || '').toLowerCase()) : [];
      const matchCount = itemTags.reduce((acc, t) => acc + (tagSet.has(t) ? 1 : 0), 0);
      return { it, matchCount };
    });
    const sorted = scored.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      if (sortKey === 'newest') return new Date(b.it.created_at) - new Date(a.it.created_at);
      if (sortKey === 'likes') return (b.it.likes_count || 0) - (a.it.likes_count || 0);
      if (sortKey === 'rating') return (b.it.avg_rating || 0) - (a.it.avg_rating || 0);
      if (sortKey === 'views') return (b.it.views_count || 0) - (a.it.views_count || 0);
      return 0;
    }).map(s => s.it);
    return sorted;
  }, []);

  // batch load next categories
  const loadNextCategoryBatch = useCallback(async () => {
    if (loadingCategories) return;
    if (!categoryQueue || categoryQueue.length === 0) {
      setHasMoreCategories(false);
      return;
    }
    setLoadingCategories(true);
    const batch = categoryQueue.slice(0, CATEGORY_BATCH);
    const rest = categoryQueue.slice(batch.length);
    setCategoryQueue(rest);
    try {
      const placeholderPromises = batch.map((c) => fastFetchList(4, c).then((items) => ({
        category: c,
        newest: items,
        mostLiked: items,
        highestRated: items,
        mostViewed: items,
      })));
      const placeholders = await Promise.all(placeholderPromises);
      if (!mountedRef.current) return;
      setLoadedCategoryBlocks((prev) => [...prev, ...placeholders]);

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
      setSearchResults([]);
      setSearchRelated([]);

      // SEARCH mode (scoped to category if selectedCategory is specific)
      if (effectiveQuery && effectiveQuery.trim()) {
        const start = Date.now();
        try {
          // show fast placeholders scoped to category for UX
          const scopeCategory = (selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All') ? selectedCategory : null;
          const fast = await fastFetchList(ITEMS_PER_CAROUSEL, scopeCategory);
          if (mountedRef.current) {
            setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });
          }

          // fetch a broad set (scoped to category if applicable)
          let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS).limit(1200);
          if (scopeCategory) q = q.eq('category', scopeCategory);
          const { data, error } = await q;
          if (error) throw error;
          const rows = safeData(data).map(normalizeRow);

          // normalized query and tokens
          const qnorm = normalizeText(effectiveQuery);
          const tokens = qnorm.split(/\s+/).filter(Boolean);

          // score with original strong scorer, then token-based fallback scoring
          const scored = rows
            .map(r => {
              const strong = similarityScore(r, qnorm);
              // token matches add smaller boosts (helps multi-word queries)
              let tokenBoost = 0;
              if (tokens.length) {
                const title = normalizeText(r.title || '');
                const desc = normalizeText(r.description || '');
                tokens.forEach(tok => {
                  if (title.includes(tok)) tokenBoost += 30;
                  if (desc.includes(tok)) tokenBoost += 10;
                  if ((Array.isArray(r.tags) ? r.tags.map(t => normalizeText(t)) : []).some(t => t === tok)) tokenBoost += 20;
                });
              }
              return { ...r, _score: strong + tokenBoost };
            })
            .filter(r => r._score > 0)
            .sort((a, b) => b._score - a._score);

          // If no scored matches, perform a fallback broader match
          let primary = scored.slice(0, ITEMS_PER_CAROUSEL);
          if (primary.length === 0) {
            const fallback = rows.filter(r => {
              const title = normalizeText(r.title || '');
              const desc = normalizeText(r.description || '');
              const author = normalizeText(r.author || '');
              return tokens.some(tok => title.includes(tok) || desc.includes(tok) || author.includes(tok) || (Array.isArray(r.tags) && r.tags.some(t => normalizeText(t).includes(tok))));
            }).slice(0, ITEMS_PER_CAROUSEL);
            primary = fallback;
          }

          // Related: prefer tag overlap or same category OR token overlap (excluding primary)
          const primaryIds = new Set(primary.map(p => p.id));
          const primaryTags = new Set(primary.flatMap(p => p.tags || []));
          let related = rows.filter(r => {
            if (primaryIds.has(r.id)) return false;
            // tag overlap
            if (Array.isArray(r.tags) && r.tags.some(t => primaryTags.has(t))) return true;
            // same category as top primary
            if (primary[0] && primary[0].category && r.category === primary[0].category) return true;
            // token overlap fallback
            const title = normalizeText(r.title || '');
            const desc = normalizeText(r.description || '');
            if (tokens.some(tok => title.includes(tok) || desc.includes(tok))) return true;
            return false;
          }).slice(0, ITEMS_PER_CAROUSEL);

          // final assignment
          if (mountedRef.current) {
            setSearchResults(primary || []);
            setSearchRelated(related || []);
            setTagsReloadKey(k => k + 1);
          }
        } catch (err) {
          console.error('search error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setLoadingGlobal(false);
        }
        return;
      }

      // SPECIFIC CATEGORY (no search)
      const specific = selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All';
      if (specific) {
        const start = Date.now();
        try {
          const placeholder = await fastFetchList(ITEMS_PER_CAROUSEL, selectedCategory);
          if (mountedRef.current) {
            setLoadedCategoryBlocks([{ category: selectedCategory, newest: placeholder, mostLiked: placeholder, highestRated: placeholder, mostViewed: placeholder }]);
          }
          (async () => {
            try {
              const block = await fetchContentBlock(selectedCategory);
              if (!mountedRef.current) return;
              setLoadedCategoryBlocks((block.newest.length || block.mostLiked.length || block.highestRated.length || block.mostViewed.length) ? [block] : []);
              setTagsReloadKey(k => k + 1);
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

      // DEFAULT For You flow (no search, no specific category)
      const start = Date.now();
      try {
        const fast = await fastFetchList(ITEMS_PER_CAROUSEL);
        if (!mountedRef.current) return;
        setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });

        (async () => {
          try {
            const [globalBlock, cats] = await Promise.all([fetchContentBlock(), fetchTopCategories(200)]);
            if (!mountedRef.current) return;
            setGlobalContent(globalBlock);
            setTagsReloadKey(k => k + 1);
            setCategoryQueue(cats);
            setHasMoreCategories(cats.length > 0);

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
  }, [selectedCategory, effectiveQuery, fastFetchList, fetchContentBlock, replaceCategoryBlock]);

  // sentinel observer for additional categories
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

  // fetchTaggedContent (for tag chips)
  const fetchTaggedContent = useCallback(async (tag, category = null, limit = ITEMS_PER_CAROUSEL) => {
    if (!tag) return [];
    try {
      let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS).contains('tags', [tag]).order('created_at', { ascending: false }).limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(normalizeRow);
    } catch (err) {
      console.error('fetchTaggedContent error', err);
      return [];
    }
  }, []);

  // helper: buildViewAllLink (encode params safely)
  const buildViewAllLink = (sortKey = 'newest', category = null, tag = null, fields = 'id,title,description,author,created_at,tags') => {
    const params = new URLSearchParams();
    if (sortKey) params.set('sort', sortKey);
    if (category) params.set('category', category);
    if (tag) {
      params.set('tag', tag);
      params.set('tag_only', '1');
    }
    if (fields) params.set('fields', fields);
    const s = params.toString();
    return s ? `/explore?${s}` : '/explore';
  };

  // Build CTA copy
  const buildSeeMoreText = ({ sortKey = 'newest', category = null, tag = null } = {}) => {
    const sortMap = {
      newest: 'Newest Content',
      likes: 'Most Liked content',
      rating: 'Most Rated Content',
      views: 'Most Viewed Content',
    };
    const base = sortMap[sortKey] || 'more content';
    if (tag) return `Explore More From ${base} In "${tag}"`;
    if (category) return `Explore More From ${base} In ${category}`;
    return `Explore More From ${base}`;
  };

  // CTA button
  const SeeMoreCTA = ({ href, text }) => {
    if (!href) return null;
    return (
      <div className="see-more-wrapper" aria-hidden={false}>
        <a href={href} className="see-more-btn" role="button">{text}</a>
      </div>
    );
  };

  // tagged results effect
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedTags || selectedTags.length === 0) {
        setTaggedResults(null);
        setTaggedLoading(false);
        return;
      }
      const tag = selectedTags[0];
      setTaggedLoading(true);
      try {
        const rows = await fetchTaggedContent(tag, (selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All') ? selectedCategory : null, ITEMS_PER_CAROUSEL);
        if (!mountedRef.current || !mounted) return;
        setTaggedResults(rows || []);
      } catch (err) {
        console.error('tag fetch failed', err);
        if (mountedRef.current && mounted) setTaggedResults([]);
      } finally {
        if (mountedRef.current && mounted) setTaggedLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedTags, selectedCategory, fetchTaggedContent]);

  // tag toggle
  const toggleTag = (tag) => {
    const lower = tag.toLowerCase();
    setSelectedTags(prev => {
      const cur = Array.isArray(prev) ? prev : [];
      if (cur.length > 0 && cur[0] === lower) return [];
      return [lower];
    });
  };

  const clearTags = () => setSelectedTags([]);

  // renderCards: mode === 'search' => render in given order (do not re-rank).
  // otherwise use rankItemsWithBoost with provided sortKey (default 'newest').
  const renderCards = (items, mode = 'newest') => {
    if (!items || !Array.isArray(items)) return null;

    // search mode: do not re-sort — preserve search ranking order
    if (mode === 'search') {
      return items.map((summary) => (
        <BookSummaryCard key={String(summary.id ?? summary.slug)} summary={summary} onEdit={onEdit} onDelete={onDelete} />
      ));
    }

    // otherwise apply boosting/ranking logic for the feed
    const ranked = rankItemsWithBoost(items, selectedTags, mode);
    return (ranked || []).map((summary) => (
      <BookSummaryCard key={String(summary.id ?? summary.slug)} summary={summary} onEdit={onEdit} onDelete={onDelete} />
    ));
  };

  const isForYou = selectedCategory === 'For You' || selectedCategory === 'All';

  /* ---------- Simple SEO updates (SPA-friendly) ---------- */
  useEffect(() => {
    try {
      const baseTitle = 'OGONJO — Business Knowledge for Builders';
      const siteDesc = 'Business knowledge, book summaries, and practical insights for builders, founders, and ambitious entrepreneurs.';
      let title = baseTitle;
      let description = siteDesc;

      if (effectiveQuery) {
        title = `Results for "${effectiveQuery}" — OGONJO`;
        description = `Search results for "${effectiveQuery}" on OGONJO — book summaries, business ideas, tools and guides.`;
      } else if (selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All') {
        title = `${selectedCategory} — OGONJO`;
        description = `Explore ${selectedCategory} content — summaries, ideas, apps and practical frameworks on OGONJO.`;
      }

      document.title = title;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    } catch (e) {
      // ignore in non-browser or CSP-restricted envs
    }
  }, [effectiveQuery, selectedCategory]);

  return (
    <div className="content-feed-root" ref={rootRef}>
      <section className="intro-banner" role="region" aria-label="Mission statement" aria-live="polite">
        <div className="intro-banner-inner">
          <div className="intro-banner-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" role="img">
              <path d="M3 6c0 6 4 10 9 12 5-2 9-6 9-12-4 0-7 3-9 3S7 6 3 6z" fill="white" opacity="0.15" />
              <path d="M12 2c-.9 1.3-3.6 3.1-8 3v2c4.2 0 7 2 8 3 1-1 3.8-3 8-3V5c-4.4 0-7.1-1.7-8-3z" fill="white" opacity="0.08" />
            </svg>
          </div>

          <div className="intro-banner-text">
            <div className="intro-banner-title">Behind every business is a dream.</div>
            <div className="intro-banner-subtitle">Our mission is to give you the insight and support you need to turn that dream into something real.</div>
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
                  title={`Filter by ${tag}`}
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

      {/* TAGGED results */}
      {selectedTags.length > 0 && (
        <section className="feed-section">
          <HorizontalCarousel title={`Tag: ${selectedTags[0]}`} items={taggedResults || []} loading={taggedLoading} skeletonCount={6}>
            {renderCards(taggedResults || [], 'newest')}
          </HorizontalCarousel>

          <SeeMoreCTA href={buildViewAllLink('newest', (selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All') ? selectedCategory : null, selectedTags[0])} text={buildSeeMoreText({ sortKey: 'newest', category: (selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All') ? selectedCategory : null, tag: selectedTags[0] })} />
        </section>
      )}

      {/* SEARCH results (uses effectiveQuery) */}
      {effectiveQuery && effectiveQuery.trim() && (
        <>
          <section className="feed-section">
            <HorizontalCarousel title={`Results for "${effectiveQuery}"`} items={searchResults} loading={loadingGlobal} skeletonCount={6} emptyMessage={`No results for "${effectiveQuery}"`}>
              {renderCards(searchResults, 'search')}
            </HorizontalCarousel>

            <SeeMoreCTA href={`/explore?q=${encodeURIComponent(effectiveQuery)}`} text={`Explore more results for "${effectiveQuery}"`} />
          </section>

          {searchRelated && searchRelated.length > 0 && (
            <section className="feed-section">
              <HorizontalCarousel title="Related content" items={searchRelated} loading={loadingGlobal} skeletonCount={6}>
                {renderCards(searchRelated, 'search')}
              </HorizontalCarousel>

              <SeeMoreCTA href={buildViewAllLink('newest')} text="Explore more related content" />
            </section>
          )}
        </>
      )}

      {/* SPECIFIC CATEGORY (no search) */}
      {(!isForYou && !effectiveQuery) && loadedCategoryBlocks.length > 0 && (
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
              <section className="feed-section" key={k}>
                <HorizontalCarousel title={titleMap[k]} items={items} loading={loadingGlobal} skeletonCount={6}>
                  {renderCards(items, sortKey)}
                </HorizontalCarousel>

                <SeeMoreCTA href={buildViewAllLink(sortKey, loadedCategoryBlocks[0].category)} text={buildSeeMoreText({ sortKey, category: loadedCategoryBlocks[0].category })} />
              </section>
            );
          })}
        </div>
      )}

      {/* FOR YOU / ALL (no search) */}
      {isForYou && !effectiveQuery && (
        <>
          <section className="feed-section">
            <HorizontalCarousel title="Newest" items={globalContent.newest} loading={loadingGlobal} skeletonCount={6}>
              {renderCards(globalContent.newest, 'newest')}
            </HorizontalCarousel>

            <SeeMoreCTA href={buildViewAllLink('newest', null)} text={buildSeeMoreText({ sortKey: 'newest' })} />
          </section>

          <section className="feed-section">
            <HorizontalCarousel title="Most Liked" items={globalContent.mostLiked} loading={loadingGlobal} skeletonCount={6}>
              {renderCards(globalContent.mostLiked, 'likes')}
            </HorizontalCarousel>

            <SeeMoreCTA href={buildViewAllLink('likes', null)} text={buildSeeMoreText({ sortKey: 'likes' })} />
          </section>

          <section className="feed-section">
            <HorizontalCarousel title="Most Rated" items={globalContent.highestRated} loading={loadingGlobal} skeletonCount={6}>
              {renderCards(globalContent.highestRated, 'rating')}
            </HorizontalCarousel>

            <SeeMoreCTA href={buildViewAllLink('rating', null)} text={buildSeeMoreText({ sortKey: 'rating' })} />
          </section>

          <section className="feed-section">
            <HorizontalCarousel title="Most Viewed" items={globalContent.mostViewed} loading={loadingGlobal} skeletonCount={6}>
              {renderCards(globalContent.mostViewed, 'views')}
            </HorizontalCarousel>

            <SeeMoreCTA href={buildViewAllLink('views', null)} text={buildSeeMoreText({ sortKey: 'views' })} />
          </section>

          {loadedCategoryBlocks.map((block) => (
            <section className="category-block" key={block.category}>
              <div className="category-block-header"><h3 className="cat-title">{block.category}</h3></div>

              <section className="feed-section">
                <HorizontalCarousel title={`Newest in ${block.category}`} items={block.newest} loading={loadingGlobal} skeletonCount={4}>
                  {renderCards(block.newest, 'newest')}
                </HorizontalCarousel>
                <SeeMoreCTA href={buildViewAllLink('newest', block.category)} text={buildSeeMoreText({ sortKey: 'newest', category: block.category })} />
              </section>

              <section className="feed-section">
                <HorizontalCarousel title={`Most Liked in ${block.category}`} items={block.mostLiked} loading={loadingGlobal} skeletonCount={4}>
                  {renderCards(block.mostLiked, 'likes')}
                </HorizontalCarousel>
                <SeeMoreCTA href={buildViewAllLink('likes', block.category)} text={buildSeeMoreText({ sortKey: 'likes', category: block.category })} />
              </section>

              <section className="feed-section">
                <HorizontalCarousel title={`Highest Rated in ${block.category}`} items={block.highestRated} loading={loadingGlobal} skeletonCount={4}>
                  {renderCards(block.highestRated, 'rating')}
                </HorizontalCarousel>
                <SeeMoreCTA href={buildViewAllLink('rating', block.category)} text={buildSeeMoreText({ sortKey: 'rating', category: block.category })} />
              </section>

              <section className="feed-section">
                <HorizontalCarousel title={`Most Viewed in ${block.category}`} items={block.mostViewed} loading={loadingGlobal} skeletonCount={4}>
                  {renderCards(block.mostViewed, 'views')}
                </HorizontalCarousel>
                <SeeMoreCTA href={buildViewAllLink('views', block.category)} text={buildSeeMoreText({ sortKey: 'views', category: block.category })} />
              </section>
            </section>
          ))}

          <div ref={sentinelRef} style={{ height: 1, width: '100%' }} aria-hidden="true" />
          {loadingCategories && <div className="categories-loading">Loading more categories...</div>}
          {!hasMoreCategories && !loadingCategories && loadedCategoryBlocks.length > 0 && <div className="categories-end">You've reached the end of the line.</div>}
        </>
      )}
    </div>
  );
};

export default ContentFeed;
