// src/components/ContentFeed/ContentFeed.jsx
import React, {
  useState, useEffect, useCallback, useRef
} from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import DraftPanel from '../DraftPanel/DraftPanel';
import './ContentFeed.css';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const ITEMS_PER_CAROUSEL = 12;
const CATEGORY_BATCH = 3;
const MIN_LOAD_MS = 350;
const DRAFTS_TAB = '📝 Drafts';
const FOR_YOU_TAB = 'For You';

/* ─────────────────────────────────────────────────────────────
   SELECT STRINGS  (no status column needed for public queries —
   we filter .eq('status','published') on every query instead)
───────────────────────────────────────────────────────────── */
const LIGHT_SELECT = `
  id, created_at, title, author, description, category, tags,
  user_id, image_url, affiliate_link, avg_rating, slug, difficulty_level,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

const SELECT_WITH_COUNTS = `
  id, created_at, title, author, description, category, tags,
  user_id, image_url, affiliate_link, avg_rating, slug, difficulty_level,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const safeData = (d) => (d?.data ?? d ?? []);

const parseNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  if (Array.isArray(v) && v.length) {
    const first = v[0];
    return parseNumber(first.avg ?? first.count ?? first.value ?? first.avg_rating ?? first.rating ?? first);
  }
  if (typeof v === 'object') {
    return parseNumber(v.avg ?? v.count ?? v.value ?? v.avg_rating ?? v.rating ?? v.rating_count);
  }
  return 0;
};

const _safeStr = (v) => {
  if (v === null || v === undefined) return '';
  return typeof v !== 'string' ? String(v).trim() : v.trim();
};

const normalizeRow = (r = {}) => {
  const likes    = parseNumber(r.likes_count);
  const views    = parseNumber(r.views_count);
  const comments = parseNumber(r.comments_count);
  const avg_rating  = parseNumber(r.avg_rating ?? r.avg ?? r.rating ?? r.average_rating);
  const rating_count = parseNumber(r.rating_count ?? r.ratings_count ?? r.count);
  const rawTags = r.tags || [];
  const tags = Array.isArray(rawTags) ? rawTags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).toLowerCase())) : [];
  return {
    id: r.id,
    slug: r.slug ?? null,
    title: _safeStr(r.title) || 'Untitled',
    author: _safeStr(r.author) || _safeStr(r.creator_name) || '',
    description: r.description ?? null,
    summary: r.summary ?? null,
    category: r.category,
    tags,
    image_url: _safeStr(r.image_url) || _safeStr(r.cover) || null,
    affiliate_link: r.affiliate_link,
    likes_count: Number(likes || 0),
    views_count: Number(views || 0),
    comments_count: Number(comments || 0),
    avg_rating: Number(avg_rating || 0),
    rating_count: Number(rating_count || 0),
    created_at: r.created_at ?? null,
    difficulty_level: r.difficulty_level ?? null,
  };
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const normalizeText = (s = '') =>
  String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

const similarityScore = (item, query) => {
  const q = normalizeText(query);
  if (!q) return 0;
  let score = 0;
  const title  = normalizeText(item.title || '');
  const slug   = normalizeText(item.slug || '');
  const author = normalizeText(item.author || '');
  const desc   = normalizeText(item.description || '');
  if (title === q)        score += 300;
  if (title.includes(q))  score += 120;
  if (slug.includes(q))   score += 100;
  if (author.includes(q)) score += 60;
  if (desc.includes(q))   score += 40;
  if (Array.isArray(item.tags)) {
    item.tags.forEach(t => {
      const tt = normalizeText(t);
      if (!tt) return;
      if (q === tt) score += 60;
      else if (q.includes(tt) || tt.includes(q)) score += 20;
    });
  }
  return score;
};

/* ─────────────────────────────────────────────────────────────
   DATA FETCHERS  — every query filters status = 'published'
   so drafts never appear in any public feed section.
───────────────────────────────────────────────────────────── */
const fetchRpcOrFallback = async (rpcName, { limit = ITEMS_PER_CAROUSEL, category = null } = {}) => {
  const isAmbiguous = (err) => {
    const msg = (err?.message || err?.error || String(err || '')).toString();
    return msg.includes('Could not choose the best candidate function') ||
           msg.includes('could not choose the best candidate');
  };

  const sortRows = (rows) => {
    const copy = (rows || []).slice();
    if (rpcName.includes('new'))    copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (rpcName.includes('liked'))  copy.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    else if (rpcName.includes('rated'))  copy.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (rpcName.includes('view'))   copy.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    return copy.slice(0, limit);
  };

  // Try RPC first
  try {
    const args = { p_limit: limit };
    if (category) args.p_category = category;
    const rpcRes = await supabase.rpc(rpcName, args);
    if (!rpcRes.error && rpcRes.data) {
      return sortRows(safeData(rpcRes.data).map(normalizeRow));
    }
    if (rpcRes.error && !isAmbiguous(rpcRes.error)) {
      console.warn(`[RPC] ${rpcName} error — falling back`, rpcRes.error);
    }
  } catch (e) {
    console.warn(`[rpc] ${rpcName} threw`, e?.message || e);
  }

  // Direct query fallback — ALWAYS filter published
  try {
    if (rpcName.includes('new')) {
      let q = supabase.from('book_summaries')
        .select(LIGHT_SELECT)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }
    let q = supabase.from('book_summaries')
      .select(SELECT_WITH_COUNTS)
      .eq('status', 'published')
      .limit(500);
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return sortRows((data || []).map(normalizeRow));
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
      .eq('status', 'published')          // ← only published
      .not('category', 'is', null)
      .limit(2000);
    if (error) throw error;
    const counts = (data || []).reduce((acc, r) => {
      const key = (r.category || '').trim();
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

/* ─────────────────────────────────────────────────────────────
   SECTION DEFINITIONS
───────────────────────────────────────────────────────────── */
const SECTIONS = [
  { key: 'newest',       title: 'Newest',       sortKey: 'newest' },
  { key: 'mostLiked',    title: 'Most Liked',    sortKey: 'likes'  },
  { key: 'highestRated', title: 'Most Rated',    sortKey: 'rating' },
  { key: 'mostViewed',   title: 'Most Viewed',   sortKey: 'views'  },
];

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
const ContentFeed = ({
  selectedCategory = FOR_YOU_TAB,
  onEdit,
  onDelete,
  searchQuery = '',
  userRole = 'user',           // 'user' | 'team' | 'admin'  — passed from parent
}) => {
  const location = useLocation();
  const mountedRef    = useRef(true);
  const generationRef = useRef(0);
  const fastCacheRef  = useRef(new Map());
  const rootRef       = useRef(null);
  const sentinelRef   = useRef(null);

  /* ── state ───────────────────────────────────────────── */
  const [loadingGlobal, setLoadingGlobal]   = useState(true);
  const [globalContent, setGlobalContent]   = useState({
    newest: [], mostLiked: [], highestRated: [], mostViewed: []
  });

  const [categoryQueue,       setCategoryQueue]       = useState([]);
  const [loadedCategoryBlocks, setLoadedCategoryBlocks] = useState([]);
  const [loadingCategories,   setLoadingCategories]   = useState(false);
  const [hasMoreCategories,   setHasMoreCategories]   = useState(false);

  const [availableTags,  setAvailableTags]  = useState([]);
  const [selectedTags,   setSelectedTags]   = useState([]);
  const [taggedResults,  setTaggedResults]  = useState(null);
  const [taggedLoading,  setTaggedLoading]  = useState(false);

  const [searchResults,  setSearchResults]  = useState([]);
  const [searchRelated,  setSearchRelated]  = useState([]);

  const [tagsReloadKey,  setTagsReloadKey]  = useState(0);
  const [effectiveQuery, setEffectiveQuery] = useState((searchQuery || '').trim());

  /* ── derived flags ───────────────────────────────────── */
  const isDraftTab   = selectedCategory === DRAFTS_TAB;
  const isForYou     = !isDraftTab &&
    (selectedCategory === FOR_YOU_TAB || selectedCategory === 'All');
  const canSeeDrafts = userRole === 'admin' || userRole === 'team';

  /* ── lifecycle ───────────────────────────────────────── */
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setEffectiveQuery((searchQuery || '').trim());
  }, [searchQuery]);

  // SPA scroll-to-top on route change
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body)            document.body.scrollTop = 0;
    } catch (_) {}
  }, [location.pathname]);

  // Scroll guard for summary/library links
  useEffect(() => {
    const root = rootRef.current || document;
    if (!root) return;
    const handler = (e) => {
      try {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target?.closest?.('a');
        if (!a) return;
        const href = a.getAttribute('href') || a.href;
        if (!href) return;
        let url;
        try { url = new URL(href, window.location.origin); } catch { return; }
        if (url.origin !== window.location.origin) return;
        if (url.pathname.startsWith('/summary/') || url.pathname.startsWith('/library/')) {
          window.scrollTo({ top: 0, behavior: 'auto' });
          if (document.documentElement) document.documentElement.scrollTop = 0;
          if (document.body)            document.body.scrollTop = 0;
        }
      } catch (_) {}
    };
    root.addEventListener('click', handler, true);
    return () => root.removeEventListener('click', handler, true);
  }, []);

  // Scroll to feed top when category / search changes
  useEffect(() => {
    const go = () => {
      try {
        const el = rootRef.current;
        if (el) {
          const header  = document.querySelector('header');
          const headerH = header ? header.offsetHeight : 0;
          const top = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - headerH - 8);
          window.scrollTo({ top, behavior: 'auto' });
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } catch (_) {
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (__) {}
      }
    };
    go();
    const t = setTimeout(go, 120);
    return () => clearTimeout(t);
  }, [selectedCategory, effectiveQuery]);

  /* ── SEO ─────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const BASE   = 'OGONJO — Business Knowledge for Builders';
      const BASE_D = 'Business knowledge, book summaries, and practical insights for builders, founders, and ambitious entrepreneurs.';
      let title = BASE, description = BASE_D;
      if (isDraftTab) {
        title       = 'Drafts — OGONJO';
        description = 'Your unpublished drafts.';
      } else if (effectiveQuery) {
        title       = `Results for "${effectiveQuery}" — OGONJO`;
        description = `Search results for "${effectiveQuery}" on OGONJO.`;
      } else if (!isForYou) {
        title       = `${selectedCategory} — OGONJO`;
        description = `Explore ${selectedCategory} content on OGONJO.`;
      }
      document.title = title;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description);
    } catch (_) {}
  }, [effectiveQuery, selectedCategory, isDraftTab, isForYou]);

  /* ── tags loader ─────────────────────────────────────── */
  useEffect(() => {
    if (isDraftTab) return;
    (async () => {
      try {
        const specific = !isForYou;
        let q = supabase.from('book_summaries')
          .select('tags')
          .eq('status', 'published')
          .limit(5000);
        if (specific) q = q.eq('category', selectedCategory);
        const { data, error } = await q;
        if (error) throw error;
        const set = new Set();
        (data || []).forEach(row => {
          const arr = row?.tags || [];
          if (Array.isArray(arr)) arr.forEach(t => { if (t && typeof t === 'string') set.add(t.trim().toLowerCase()); });
        });
        const list = Array.from(set).sort();
        if (mountedRef.current) {
          setAvailableTags(list);
          setSelectedTags(prev => {
            if (!prev.length) return [];
            const avail = new Set(list);
            return prev.filter(t => avail.has(t.toLowerCase()));
          });
        }
      } catch (err) {
        console.warn('Could not load tags', err);
      }
    })();
  }, [selectedCategory, tagsReloadKey, isDraftTab, isForYou]);

  /* ── fast lightweight fetch (cached) ────────────────── */
  const fastFetchList = useCallback(async (limit = ITEMS_PER_CAROUSEL, category = null) => {
    const key = category ? `cat:${category}` : 'global';
    const cached = fastCacheRef.current.get(key);
    if (cached) return cached;
    try {
      let q = supabase.from('book_summaries')
        .select(LIGHT_SELECT)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data || []).map(normalizeRow);
      fastCacheRef.current.set(key, rows);
      return rows;
    } catch (err) {
      console.warn('fastFetchList failed', err);
      return [];
    }
  }, []);

  /* ── full content block (4 sort variants) ─────────────── */
  const fetchContentBlock = useCallback(async (category = null) => {
    try {
      const start = Date.now();
      const [newest, mostLiked, highestRated, mostViewed] = await Promise.all([
        fetchRpcOrFallback('get_newest',        { category }),
        fetchRpcOrFallback('get_top_liked',     { category }),
        fetchRpcOrFallback('get_highest_rated', { category }),
        fetchRpcOrFallback('get_top_viewed',    { category }),
      ]);
      if (Date.now() - start < 50) await sleep(50);
      return {
        category,
        newest:       newest       || [],
        mostLiked:    mostLiked    || [],
        highestRated: highestRated || [],
        mostViewed:   mostViewed   || [],
      };
    } catch (err) {
      console.error('fetchContentBlock error', category, err);
      return { category, newest: [], mostLiked: [], highestRated: [], mostViewed: [] };
    }
  }, []);

  const replaceCategoryBlock = useCallback((newBlock) => {
    setLoadedCategoryBlocks(prev => {
      const idx = prev.findIndex(b => String(b.category) === String(newBlock.category));
      if (idx === -1) return [...prev, newBlock];
      const copy = [...prev];
      copy[idx] = newBlock;
      return copy;
    });
  }, []);

  /* ── ranking ─────────────────────────────────────────── */
  const rankItemsWithBoost = useCallback((items = [], tags = [], sortKey = 'newest') => {
    if (!items.length) return [];
    if (!tags.length) {
      const copy = items.slice();
      if (sortKey === 'newest') return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sortKey === 'likes')  return copy.sort((a, b) => (b.likes_count  || 0) - (a.likes_count  || 0));
      if (sortKey === 'rating') return copy.sort((a, b) => (b.avg_rating   || 0) - (a.avg_rating   || 0));
      if (sortKey === 'views')  return copy.sort((a, b) => (b.views_count  || 0) - (a.views_count  || 0));
      return copy;
    }
    const tagSet = new Set(tags.map(t => t.toLowerCase()));
    return items
      .map(it => {
        const itemTags = Array.isArray(it.tags) ? it.tags.map(t => t.toLowerCase()) : [];
        const matchCount = itemTags.reduce((acc, t) => acc + (tagSet.has(t) ? 1 : 0), 0);
        return { it, matchCount };
      })
      .sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        if (sortKey === 'newest') return new Date(b.it.created_at) - new Date(a.it.created_at);
        if (sortKey === 'likes')  return (b.it.likes_count  || 0) - (a.it.likes_count  || 0);
        if (sortKey === 'rating') return (b.it.avg_rating  || 0) - (a.it.avg_rating  || 0);
        if (sortKey === 'views')  return (b.it.views_count || 0) - (a.it.views_count || 0);
        return 0;
      })
      .map(s => s.it);
  }, []);

  /* ── batch load next categories ──────────────────────── */
  const loadNextCategoryBatch = useCallback(async () => {
    if (loadingCategories || !categoryQueue.length) {
      setHasMoreCategories(false);
      return;
    }
    setLoadingCategories(true);
    const batch = categoryQueue.slice(0, CATEGORY_BATCH);
    const rest  = categoryQueue.slice(batch.length);
    setCategoryQueue(rest);
    try {
      const placeholders = await Promise.all(
        batch.map(c => fastFetchList(4, c).then(items => ({
          category: c, newest: items, mostLiked: items, highestRated: items, mostViewed: items
        })))
      );
      if (!mountedRef.current) return;
      setLoadedCategoryBlocks(prev => [...prev, ...placeholders]);

      // Background enrich
      (async () => {
        try {
          const blocks = await Promise.all(batch.map(c => fetchContentBlock(c)));
          if (!mountedRef.current) return;
          blocks
            .filter(b => b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length)
            .forEach(blk => replaceCategoryBlock(blk));
        } catch (err) { console.error('background batch error', err); }
      })();

      setHasMoreCategories(rest.length > 0);
    } catch (err) {
      console.error('loadNextCategoryBatch err', err);
    } finally {
      if (mountedRef.current) setLoadingCategories(false);
    }
  }, [categoryQueue, loadingCategories, fetchContentBlock, fastFetchList, replaceCategoryBlock]);

  /* ── main orchestration effect ───────────────────────── */
  useEffect(() => {
    // Draft tab: no data fetching needed — DraftPanel handles it
    if (isDraftTab) {
      setLoadingGlobal(false);
      return;
    }

    let cancelled = false;
    (async () => {
      generationRef.current += 1;
      const gen     = generationRef.current;
      const isStale = () => gen !== generationRef.current || cancelled || !mountedRef.current;

      fastCacheRef.current.clear();

      const safeSetGlobal = (updater) => {
        if (isStale()) return;
        setGlobalContent(prev => {
          const next = typeof updater === 'function' ? updater(prev) : updater;
          return { ...prev, ...next };
        });
      };

      setLoadingGlobal(true);
      setLoadedCategoryBlocks([]);
      setCategoryQueue([]);
      setHasMoreCategories(false);
      setSearchResults([]);
      setSearchRelated([]);

      /* ── SEARCH ── */
      if (effectiveQuery.trim()) {
        const start = Date.now();
        try {
          const scopeCat = !isForYou ? selectedCategory : null;
          const fast = await fastFetchList(ITEMS_PER_CAROUSEL, scopeCat);
          if (isStale()) return;
          safeSetGlobal({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });

          let q = supabase.from('book_summaries')
            .select(SELECT_WITH_COUNTS)
            .eq('status', 'published')
            .limit(1200);
          if (scopeCat) q = q.eq('category', scopeCat);
          const { data, error } = await q;
          if (isStale()) return;
          if (error) throw error;

          const rows   = safeData(data).map(normalizeRow);
          const qnorm  = normalizeText(effectiveQuery);
          const tokens = qnorm.split(/\s+/).filter(Boolean);

          const scored = rows
            .map(r => {
              let boost = 0;
              const title = normalizeText(r.title || '');
              const desc  = normalizeText(r.description || '');
              tokens.forEach(tok => {
                if (title.includes(tok)) boost += 30;
                if (desc.includes(tok))  boost += 10;
                if ((Array.isArray(r.tags) ? r.tags.map(normalizeText) : []).some(t => t === tok)) boost += 20;
              });
              return { ...r, _score: similarityScore(r, qnorm) + boost };
            })
            .filter(r => r._score > 0)
            .sort((a, b) => b._score - a._score);

          let primary = scored.slice(0, ITEMS_PER_CAROUSEL);
          if (!primary.length) {
            primary = rows.filter(r => {
              const title  = normalizeText(r.title || '');
              const desc   = normalizeText(r.description || '');
              const author = normalizeText(r.author || '');
              return tokens.some(tok =>
                title.includes(tok) || desc.includes(tok) || author.includes(tok) ||
                (Array.isArray(r.tags) && r.tags.some(t => normalizeText(t).includes(tok)))
              );
            }).slice(0, ITEMS_PER_CAROUSEL);
          }

          const primaryIds  = new Set(primary.map(p => p.id));
          const primaryTags = new Set(primary.flatMap(p => p.tags || []));
          const related = rows.filter(r => {
            if (primaryIds.has(r.id)) return false;
            if (Array.isArray(r.tags) && r.tags.some(t => primaryTags.has(t))) return true;
            if (primary[0] && r.category === primary[0].category) return true;
            const title = normalizeText(r.title || '');
            const desc  = normalizeText(r.description || '');
            return tokens.some(tok => title.includes(tok) || desc.includes(tok));
          }).slice(0, ITEMS_PER_CAROUSEL);

          if (isStale()) return;
          setSearchResults(primary);
          setSearchRelated(related);
          setTagsReloadKey(k => k + 1);
        } catch (err) {
          console.error('search error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (!isStale()) setLoadingGlobal(false);
        }
        return;
      }

      /* ── SPECIFIC CATEGORY ── */
      if (!isForYou) {
        const start = Date.now();
        try {
          const placeholder = await fastFetchList(ITEMS_PER_CAROUSEL, selectedCategory);
          if (isStale()) return;
          setLoadedCategoryBlocks([{
            category: selectedCategory,
            newest: placeholder, mostLiked: placeholder, highestRated: placeholder, mostViewed: placeholder
          }]);

          (async () => {
            try {
              const block = await fetchContentBlock(selectedCategory);
              if (isStale()) return;
              if (block.newest.length || block.mostLiked.length || block.highestRated.length || block.mostViewed.length) {
                setLoadedCategoryBlocks([block]);
              }
              setTagsReloadKey(k => k + 1);
            } catch (err) { console.error('specific cat bg fetch error', err); }
          })();
        } catch (err) {
          console.error('specific cat fetch error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (!isStale()) setLoadingGlobal(false);
        }
        return;
      }

      /* ── FOR YOU (default) ── */
      const start = Date.now();
      try {
        const fast = await fastFetchList(ITEMS_PER_CAROUSEL);
        if (isStale()) return;
        safeSetGlobal({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });

        (async () => {
          try {
            const [globalBlock, cats] = await Promise.all([
              fetchContentBlock(),
              fetchTopCategories(200),
            ]);
            if (isStale()) return;

            safeSetGlobal(prev => ({
              newest:       globalBlock.newest.length       ? globalBlock.newest       : prev.newest,
              mostLiked:    globalBlock.mostLiked.length    ? globalBlock.mostLiked    : prev.mostLiked,
              highestRated: globalBlock.highestRated.length ? globalBlock.highestRated : prev.highestRated,
              mostViewed:   globalBlock.mostViewed.length   ? globalBlock.mostViewed   : prev.mostViewed,
            }));

            setTagsReloadKey(k => k + 1);
            setCategoryQueue(cats);
            setHasMoreCategories(cats.length > 0);

            const initialBatch = cats.slice(0, CATEGORY_BATCH);
            const rest         = cats.slice(initialBatch.length);
            if (initialBatch.length) {
              const placeholders = await Promise.all(
                initialBatch.map(c => fastFetchList(4, c).then(items => ({
                  category: c, newest: items, mostLiked: items, highestRated: items, mostViewed: items
                })))
              );
              if (isStale()) return;
              setLoadedCategoryBlocks(placeholders);
              setCategoryQueue(rest);
              setHasMoreCategories(rest.length > 0);

              (async () => {
                try {
                  const blocks = await Promise.all(initialBatch.map(c => fetchContentBlock(c)));
                  if (isStale()) return;
                  blocks
                    .filter(b => b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length)
                    .forEach(blk => replaceCategoryBlock(blk));
                } catch (err) { console.error('bg initial cat fetch failed', err); }
              })();
            }
          } catch (err) { console.error('bg load failed', err); }
        })();
      } catch (err) {
        console.error('Initial global fast load failed', err);
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
        if (!isStale()) setLoadingGlobal(false);
      }
    })();

    return () => { cancelled = true; generationRef.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, effectiveQuery, isDraftTab, isForYou]);

  /* ── sentinel IntersectionObserver ──────────────────── */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting && hasMoreCategories && !loadingCategories) loadNextCategoryBatch();
      }),
      { root: null, rootMargin: '600px', threshold: 0.1 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMoreCategories, loadingCategories, loadNextCategoryBatch]);

  /* ── tagged content ──────────────────────────────────── */
  const fetchTaggedContent = useCallback(async (tag, category = null, limit = ITEMS_PER_CAROUSEL) => {
    if (!tag) return [];
    try {
      let q = supabase.from('book_summaries')
        .select(SELECT_WITH_COUNTS)
        .eq('status', 'published')
        .contains('tags', [tag])
        .order('created_at', { ascending: false })
        .limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(normalizeRow);
    } catch (err) {
      console.error('fetchTaggedContent error', err);
      return [];
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedTags.length) { setTaggedResults(null); setTaggedLoading(false); return; }
      setTaggedLoading(true);
      try {
        const rows = await fetchTaggedContent(
          selectedTags[0],
          !isForYou ? selectedCategory : null,
          ITEMS_PER_CAROUSEL
        );
        if (mountedRef.current && alive) setTaggedResults(rows);
      } catch (err) {
        if (mountedRef.current && alive) setTaggedResults([]);
      } finally {
        if (mountedRef.current && alive) setTaggedLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedTags, selectedCategory, fetchTaggedContent, isForYou]);

  const toggleTag = useCallback((tag) => {
    const lower = tag.toLowerCase();
    setSelectedTags(prev => (prev.length > 0 && prev[0] === lower) ? [] : [lower]);
  }, []);

  const clearTags = useCallback(() => setSelectedTags([]), []);

  /* ── render helpers ───────────────────────────────────── */
  const renderCards = useCallback((items, mode = 'newest') => {
    if (!items || !Array.isArray(items)) return null;
    const src = mode === 'search' ? items : rankItemsWithBoost(items, selectedTags, mode);
    return (src || []).map(s => (
      <BookSummaryCard key={String(s.id ?? s.slug)} summary={s} onEdit={onEdit} onDelete={onDelete} />
    ));
  }, [onEdit, onDelete, rankItemsWithBoost, selectedTags]);

  const buildViewAllLink = useCallback((sortKey = 'newest', category = null, tag = null) => {
    const p = new URLSearchParams();
    if (sortKey)  p.set('sort', sortKey);
    if (category) p.set('category', category);
    if (tag)      { p.set('tag', tag); p.set('tag_only', '1'); }
    const s = p.toString();
    return s ? `/explore?${s}` : '/explore';
  }, []);

  const buildSeeMoreText = useCallback(({ sortKey = 'newest', category = null, tag = null } = {}) => {
    const map = {
      newest: 'Newest Content', likes: 'Most Liked content',
      rating: 'Most Rated Content', views: 'Most Viewed Content',
    };
    const base = map[sortKey] || 'more content';
    if (tag)      return `Explore More From ${base} In "${tag}"`;
    if (category) return `Explore More From ${base} In ${category}`;
    return `Explore More From ${base}`;
  }, []);

  const SeeMoreCTA = useCallback(({ href, text }) => {
    if (!href) return null;
    return (
      <div className="see-more-wrapper">
        <a href={href} className="see-more-btn" role="button">{text}</a>
      </div>
    );
  }, []);

  /* ─────────────────────────────────────────────────────
     DRAFT TAB — render DraftPanel, skip everything else
  ───────────────────────────────────────────────────── */
  if (isDraftTab && canSeeDrafts) {
    return (
      <div className="content-feed-root" ref={rootRef}>
        <DraftPanel onEdit={onEdit} />
      </div>
    );
  }

  // Safety: if somehow a non-privileged user lands on drafts tab, redirect to For You
  if (isDraftTab && !canSeeDrafts) {
    return (
      <div className="content-feed-root" ref={rootRef}>
        <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          You don't have permission to view drafts.
        </p>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────
     NORMAL FEED
  ───────────────────────────────────────────────────── */
  return (
    <div className="content-feed-root" ref={rootRef}>

      {/* ── Mission banner ── */}
      <section className="intro-banner" role="region" aria-label="Mission statement" aria-live="polite">
        <div className="intro-banner-inner">
          <div className="intro-banner-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" role="img">
              <path d="M3 6c0 6 4 10 9 12 5-2 9-6 9-12-4 0-7 3-9 3S7 6 3 6z" fill="white" opacity="0.15"/>
              <path d="M12 2c-.9 1.3-3.6 3.1-8 3v2c4.2 0 7 2 8 3 1-1 3.8-3 8-3V5c-4.4 0-7.1-1.7-8-3z" fill="white" opacity="0.08"/>
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

      {/* ── Tags bar ── */}
      <div className="categories-bar" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {availableTags.length === 0 ? (
            <div className="hf-loading">
              {!isForYou ? 'No tags for this category.' : 'Loading tags…'}
            </div>
          ) : (
            availableTags.map(tag => {
              const active = selectedTags.includes(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  className={`category-chip${active ? ' active' : ''}`}
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
        {selectedTags.length > 0 && (
          <button className="hf-btn" type="button" onClick={clearTags}>
            Clear tags ({selectedTags.length})
          </button>
        )}
      </div>

      {/* ── Tagged results ── */}
      {selectedTags.length > 0 && (
        <section className="feed-section">
          <HorizontalCarousel
            title={`Tag: ${selectedTags[0]}`}
            items={taggedResults || []}
            loading={taggedLoading}
            skeletonCount={6}
          >
            {renderCards(taggedResults || [], 'newest')}
          </HorizontalCarousel>
          <SeeMoreCTA
            href={buildViewAllLink('newest', !isForYou ? selectedCategory : null, selectedTags[0])}
            text={buildSeeMoreText({ sortKey: 'newest', category: !isForYou ? selectedCategory : null, tag: selectedTags[0] })}
          />
        </section>
      )}

      {/* ── Search results ── */}
      {effectiveQuery.trim() && (
        <>
          <section className="feed-section">
            <HorizontalCarousel
              title={`Results for "${effectiveQuery}"`}
              items={searchResults}
              loading={loadingGlobal}
              skeletonCount={6}
              emptyMessage={`No results for "${effectiveQuery}"`}
            >
              {renderCards(searchResults, 'search')}
            </HorizontalCarousel>
            <SeeMoreCTA href={`/explore?q=${encodeURIComponent(effectiveQuery)}`} text={`Explore more results for "${effectiveQuery}"`} />
          </section>

          {searchRelated.length > 0 && (
            <section className="feed-section">
              <HorizontalCarousel title="Related content" items={searchRelated} loading={loadingGlobal} skeletonCount={6}>
                {renderCards(searchRelated, 'search')}
              </HorizontalCarousel>
              <SeeMoreCTA href={buildViewAllLink('newest')} text="Explore more related content" />
            </section>
          )}
        </>
      )}

      {/* ── Specific category (no search) ── */}
      {!isForYou && !effectiveQuery && loadedCategoryBlocks.length > 0 && (
        <div key={`${loadedCategoryBlocks[0].category}-single`}>
          {SECTIONS.map(({ key, title, sortKey }) => {
            const items = loadedCategoryBlocks[0][key];
            return (
              <section className="feed-section" key={key}>
                <HorizontalCarousel
                  title={`${title} in ${loadedCategoryBlocks[0].category}`}
                  items={items}
                  loading={loadingGlobal}
                  skeletonCount={6}
                >
                  {renderCards(items, sortKey)}
                </HorizontalCarousel>
                <SeeMoreCTA
                  href={buildViewAllLink(sortKey, loadedCategoryBlocks[0].category)}
                  text={buildSeeMoreText({ sortKey, category: loadedCategoryBlocks[0].category })}
                />
              </section>
            );
          })}
        </div>
      )}

      {/* ── For You / All (default, no search) ── */}
      {isForYou && !effectiveQuery && (
        <>
          {SECTIONS.map(({ key, title, sortKey }) => (
            <section className="feed-section" key={key}>
              <HorizontalCarousel title={title} items={globalContent[key]} loading={loadingGlobal} skeletonCount={6}>
                {renderCards(globalContent[key], sortKey)}
              </HorizontalCarousel>
              <SeeMoreCTA href={buildViewAllLink(sortKey)} text={buildSeeMoreText({ sortKey })} />
            </section>
          ))}

          {loadedCategoryBlocks.map((block, i) => (
            <section className="category-block" key={`${String(block.category)}-${i}`}>
              <div className="category-block-header">
                <h3 className="cat-title">{block.category}</h3>
              </div>
              {SECTIONS.map(({ key, title, sortKey }) => (
                <section className="feed-section" key={`${block.category}-${key}`}>
                  <HorizontalCarousel
                    title={`${title} in ${block.category}`}
                    items={block[key]}
                    loading={loadingGlobal}
                    skeletonCount={4}
                  >
                    {renderCards(block[key], sortKey)}
                  </HorizontalCarousel>
                  <SeeMoreCTA
                    href={buildViewAllLink(sortKey, block.category)}
                    text={buildSeeMoreText({ sortKey, category: block.category })}
                  />
                </section>
              ))}
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