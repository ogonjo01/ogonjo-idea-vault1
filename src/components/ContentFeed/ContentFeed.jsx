// src/components/ContentFeed/ContentFeed.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import { FaHeart, FaEye, FaStar, FaSync } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import DraftPanel from '../DraftPanel/DraftPanel';
import FeedOnboarding, {
  ONBOARDING_KEY,
  ONBOARDING_SKIPPED_KEY,
} from '../FeedOnboarding/FeedOnboarding';
import './ContentFeed.css';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const ITEMS_PER_CAROUSEL = 12;   // cards per horizontal row — UNCHANGED
const INITIAL_ROWS       = 5;    // show 5 rows (60 cards) on first load
const LOAD_MORE_ROWS     = 2;    // add 2 rows (24 cards) each scroll
const INITIAL_VISIBLE    = ITEMS_PER_CAROUSEL * INITIAL_ROWS;   // 60
const LOAD_MORE_BATCH    = ITEMS_PER_CAROUSEL * LOAD_MORE_ROWS; // 24
const MAX_FEED_ITEMS     = 500;  // fetch up to 500 articles so there are plenty of rows
const CATEGORY_BATCH     = 3;
const MIN_LOAD_MS        = 350;
const DRAFTS_TAB         = '📝 Drafts';
const FOR_YOU_TAB        = 'For You';
const BRIEFS_TAB         = '📰 Ogonjo Briefs';
const BRIEFS_CATEGORY    = 'Ogonjo Briefs';
const BRIEFS_PAGE_SIZE   = 100;
const BRIEFS_MAX_AGE_HOURS = 48;

/* ─────────────────────────────────────────────────────────────
   SELECT STRINGS
───────────────────────────────────────────────────────────── */
const LIGHT_SELECT = `
  id, created_at, title, author, description, category, tags, keywords,
  user_id, image_url, affiliate_link, avg_rating, slug, difficulty_level,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

const SELECT_WITH_COUNTS = `
  id, created_at, title, author, description, category, tags, keywords,
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
  const likes        = parseNumber(r.likes_count);
  const views        = parseNumber(r.views_count);
  const comments     = parseNumber(r.comments_count);
  const avg_rating   = parseNumber(r.avg_rating ?? r.avg ?? r.rating ?? r.average_rating);
  const rating_count = parseNumber(r.rating_count ?? r.ratings_count ?? r.count);
  const rawTags      = r.tags || [];
  const tags = Array.isArray(rawTags)
    ? rawTags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).toLowerCase()))
    : [];
  const rawKeywords = r.keywords || [];
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.map(k => (typeof k === 'string' ? k.trim().toLowerCase() : String(k).toLowerCase()))
    : [];
  return {
    id:             r.id,
    slug:           r.slug ?? null,
    title:          _safeStr(r.title) || 'Untitled',
    author:         _safeStr(r.author) || _safeStr(r.creator_name) || '',
    description:    r.description ?? null,
    summary:        r.summary ?? null,
    category:       r.category,
    tags,
    keywords,
    image_url:      _safeStr(r.image_url) || _safeStr(r.cover) || null,
    affiliate_link: r.affiliate_link,
    likes_count:    Number(likes    || 0),
    views_count:    Number(views    || 0),
    comments_count: Number(comments || 0),
    avg_rating:     Number(avg_rating  || 0),
    rating_count:   Number(rating_count || 0),
    created_at:     r.created_at ?? null,
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
  if (Array.isArray(item.keywords)) {
    item.keywords.forEach(k => {
      const kk = normalizeText(k);
      if (!kk) return;
      if (q === kk) score += 50;
      else if (q.includes(kk) || kk.includes(q)) score += 15;
    });
  }
  return score;
};

const cleanPreview = (text, max = 160) => {
  if (!text) return '';
  const cleaned = DOMPurify.sanitize(String(text), { ALLOWED_TAGS: [] });
  const stripped = cleaned.replace(/<[^>]*>/g, '').trim();
  return stripped.length > max ? `${stripped.substring(0, max)}…` : stripped;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
};

/* ─────────────────────────────────────────────────────────────
   FILTER: remove Ogonjo Briefs older than 48h from any list
───────────────────────────────────────────────────────────── */
const filterOutOldBriefs = (items) => {
  const now      = Date.now();
  const maxAgeMs = BRIEFS_MAX_AGE_HOURS * 3600000;
  return items.filter(item => {
    if (!item.category || item.category !== BRIEFS_CATEGORY) return true;
    if (!item.created_at) return false;
    return (now - new Date(item.created_at).getTime()) <= maxAgeMs;
  });
};

/* ─────────────────────────────────────────────────────────────
   DATA FETCHERS
───────────────────────────────────────────────────────────── */
const fetchRpcOrFallback = async (rpcName, { limit = ITEMS_PER_CAROUSEL, category = null } = {}) => {
  const isAmbiguous = (err) => {
    const msg = (err?.message || err?.error || String(err || '')).toString();
    return msg.includes('Could not choose the best candidate function') ||
           msg.includes('could not choose the best candidate');
  };
  const sortRows = (rows) => {
    const copy = (rows || []).slice();
    if (rpcName.includes('new'))        copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (rpcName.includes('liked')) copy.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    else if (rpcName.includes('rated')) copy.sort((a, b) => (b.avg_rating   || 0) - (a.avg_rating   || 0));
    else if (rpcName.includes('view'))  copy.sort((a, b) => (b.views_count  || 0) - (a.views_count  || 0));
    return copy.slice(0, limit);
  };
  try {
    const args = { p_limit: limit };
    if (category) args.p_category = category;
    const rpcRes = await supabase.rpc(rpcName, args);
    if (!rpcRes.error && rpcRes.data) return sortRows(safeData(rpcRes.data).map(normalizeRow));
    if (rpcRes.error && !isAmbiguous(rpcRes.error)) console.warn(`[RPC] ${rpcName} error`, rpcRes.error);
  } catch (e) { console.warn(`[rpc] ${rpcName} threw`, e?.message || e); }
  try {
    if (rpcName.includes('new')) {
      let q = supabase.from('book_summaries').select(LIGHT_SELECT).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(normalizeRow);
    }
    let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS).eq('status', 'published').limit(500);
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return sortRows((data || []).map(normalizeRow));
  } catch (err) { console.error('[fallback] fetch error', err); return []; }
};

const fetchTopCategories = async (limit = 50) => {
  try {
    const { data, error } = await supabase.from('book_summaries').select('category')
      .eq('status', 'published').not('category', 'is', null).limit(2000);
    if (error) throw error;
    const counts = (data || []).reduce((acc, r) => {
      const key = (r.category || '').trim();
      if (!key || key === BRIEFS_CATEGORY) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, limit);
  } catch (err) { console.error('fetchTopCategories error', err); return []; }
};

/* ─────────────────────────────────────────────────────────────
   BRIEFS DATA FETCHER
───────────────────────────────────────────────────────────── */
const fetchBriefs = async (sortBy = 'newest', limit = BRIEFS_PAGE_SIZE) => {
  try {
    let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS)
      .eq('status', 'published').eq('category', BRIEFS_CATEGORY)
      .order('created_at', { ascending: false }).limit(limit);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data || []).map(normalizeRow);
    const now = Date.now();
    const maxAgeMs = BRIEFS_MAX_AGE_HOURS * 3600000;
    const filtered = rows.filter(item => item.created_at && (now - new Date(item.created_at).getTime()) <= maxAgeMs);
    if (sortBy === 'views')  filtered.sort((a, b) => (b.views_count  || 0) - (a.views_count  || 0));
    else if (sortBy === 'liked') filtered.sort((a, b) => (b.likes_count  || 0) - (a.likes_count  || 0));
    else if (sortBy === 'rated') filtered.sort((a, b) => (b.avg_rating   || 0) - (a.avg_rating   || 0));
    else filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
  } catch (err) { console.error('fetchBriefs error', err); return []; }
};

/* ─────────────────────────────────────────────────────────────
   BRIEF ROW
───────────────────────────────────────────────────────────── */
const BriefRow = ({ item, index }) => {
  const path    = item.slug ? `/library/${item.slug}` : `/library/${item.id}`;
  const preview = cleanPreview(item.description, 160);
  return (
    <Link to={path} className="brief-row" aria-label={`Read: ${item.title}`}>
      <div className="brief-row-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
      <div className="brief-row-body">
        <h3 className="brief-row-title">{item.title}</h3>
        {preview && <p className="brief-row-desc">{preview}</p>}
      </div>
      <div className="brief-row-meta" aria-hidden="true">
        <span className="brief-meta-item"><FaHeart className="brief-meta-icon" /> {item.likes_count || 0}</span>
        <span className="brief-meta-item"><FaEye  className="brief-meta-icon" /> {item.views_count  || 0}</span>
        <span className="brief-meta-item">
          <FaStar className="brief-meta-icon brief-meta-star" />{' '}
          {item.avg_rating ? Number(item.avg_rating).toFixed(1) : '0.0'}
        </span>
        {item.created_at && <span className="brief-meta-date">{formatDate(item.created_at)}</span>}
      </div>
    </Link>
  );
};

/* ─────────────────────────────────────────────────────────────
   BRIEFS FEED
───────────────────────────────────────────────────────────── */
const BriefsFeed = () => {
  const [briefs,  setBriefs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy,  setSortBy]  = useState('newest');

  const load = useCallback(async () => {
    setLoading(true);
    setBriefs(await fetchBriefs(sortBy, BRIEFS_PAGE_SIZE));
    setLoading(false);
  }, [sortBy]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="centered-loader-viewport">
      <div className="centered-loader"><div className="spinner" /><p className="loader-text">Loading briefs…</p></div>
    </div>
  );

  if (!briefs.length) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
      <p>No Ogonjo Briefs from the last {BRIEFS_MAX_AGE_HOURS} hours.</p>
      <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Check back later for fresh business intelligence.</p>
    </div>
  );

  return (
    <div className="briefs-feed">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>📰 Ogonjo Briefs</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['newest', 'views', 'liked', 'rated'].map(opt => (
            <button key={opt} onClick={() => setSortBy(opt)}
              style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                borderColor: sortBy === opt ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                background:  sortBy === opt ? 'rgba(6,182,212,0.15)' : 'transparent',
                color:       sortBy === opt ? '#06b6d4' : '#94a3b8' }}>
              {opt === 'newest' ? 'Newest' : opt === 'views' ? 'Most Viewed' : opt === 'liked' ? 'Most Liked' : 'Most Rated'}
            </button>
          ))}
          <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); load(); }}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            title="Refresh briefs"><FaSync /></button>
        </div>
      </div>
      <div className="briefs-list">
        {briefs.map((item, idx) => <BriefRow key={item.id} item={item} index={idx} />)}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SECTION DEFINITIONS (for category view)
───────────────────────────────────────────────────────────── */
const SECTIONS = [
  { key: 'newest',       title: 'Newest',      sortKey: 'newest' },
  { key: 'mostLiked',    title: 'Most Liked',   sortKey: 'likes'  },
  { key: 'highestRated', title: 'Most Rated',   sortKey: 'rating' },
  { key: 'mostViewed',   title: 'Most Viewed',  sortKey: 'views'  },
];

/* ─────────────────────────────────────────────────────────────
   PERSONALISED FEED
   Key numbers:
     • INITIAL_VISIBLE = 60  → 5 horizontal rows shown immediately
     • LOAD_MORE_BATCH = 24  → 2 more rows appear each scroll
     • MAX_FEED_ITEMS  = 500 → up to ~41 rows available before refresh
───────────────────────────────────────────────────────────── */
const PersonalisedFeed = ({ userId }) => {
  const [allArticles,    setAllArticles]    = useState([]);
  const [visibleCount,   setVisibleCount]   = useState(INITIAL_VISIBLE);
  const [loading,        setLoading]        = useState(true);
  const [activeTag,      setActiveTag]      = useState(null);
  const [availableTags,  setAvailableTags]  = useState([]);
  const [refreshKey,     setRefreshKey]     = useState(0);
  const sentinelRef = useRef(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setVisibleCount(INITIAL_VISIBLE);
    setActiveTag(null);

    /* 1. weights */
    let weights = {};
    if (userId) {
      const { data: profile } = await supabase.from('user_topic_profiles')
        .select('topic_weights').eq('user_id', userId).maybeSingle();
      if (profile?.topic_weights) weights = profile.topic_weights;
    }
    if (!Object.keys(weights).length) {
      try { const s = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || '{}'); if (s.weights) weights = s.weights; } catch {}
    }
    if (!Object.keys(weights).length) {
      weights = {
        'entrepreneurship': 0.5, 'business strategy & systems': 0.5,
        'career development': 0.4, 'finance & funding': 0.4,
        'marketing & sales': 0.4, 'leadership & management': 0.4,
        'digital skills & technology': 0.3, 'mindset & motivation': 0.3,
        'business ideas': 0.3, 'self-improvement': 0.3,
      };
    }

    /* 2. behavior vectors */
    const tagWeights = {}, kwWeights = {}, catWeights = {};
    let recentlySeen = new Set();
    const now = Date.now(), DAY = 86400000;

    if (userId) {
      try {
        const { data: events } = await supabase.from('behavior_events')
          .select('article_id, event_type, value, created_at').eq('user_id', userId)
          .gte('created_at', new Date(now - 90 * DAY).toISOString()).limit(5000);
        if (events) {
          events.filter(e => new Date(e.created_at).getTime() > now - 2 * DAY)
            .forEach(e => recentlySeen.add(e.article_id));
          const articleIds = [...new Set(events.map(e => e.article_id))];
          if (articleIds.length) {
            const chunks = [];
            for (let i = 0; i < articleIds.length; i += 100) chunks.push(articleIds.slice(i, i + 100));
            const metaMap = {};
            (await Promise.all(chunks.map(ids =>
              supabase.from('book_summaries').select('id, tags, keywords, category').in('id', ids).then(r => r.data || [])
            ))).flat().forEach(a => { metaMap[a.id] = a; });
            events.forEach(e => {
              const meta = metaMap[e.article_id]; if (!meta) return;
              const decay = Math.pow(0.95, Math.max(0, (now - new Date(e.created_at).getTime()) / DAY));
              let w = 0;
              if      (e.event_type === 'completed')    w = 15;
              else if (e.event_type === 'saved')        w = 12;
              else if (e.event_type === 'time_spent')   w = Math.min(10, (e.value || 0) / 30);
              else if (e.event_type === 'scroll_depth') w = Math.min(8,  (e.value || 0) / 12.5);
              else w = 1;
              const eff = w * decay;
              (meta.tags     || []).forEach(t => { const k = t.toLowerCase().trim(); tagWeights[k] = (tagWeights[k] || 0) + eff; });
              (meta.keywords || []).forEach(k => { const kk = k.toLowerCase().trim(); kwWeights[kk] = (kwWeights[kk] || 0) + eff; });
              const cat = (meta.category || '').toLowerCase().trim();
              if (cat) catWeights[cat] = (catWeights[cat] || 0) + eff;
            });
          }
        }
      } catch (e) { console.debug('Behavior vector build failed', e); }
    }

    /* 3. merge */
    const merged = { ...weights };
    for (const [k, v] of Object.entries(tagWeights)) merged[k] = (merged[k] || 0) + v * 0.5;
    for (const [k, v] of Object.entries(kwWeights))  merged[k] = (merged[k] || 0) + v * 0.4;
    for (const [k, v] of Object.entries(catWeights)) merged[k] = (merged[k] || 0) + v * 0.6;

    /* 4. collaborative */
    let collabBoost = {};
    if (userId) {
      try {
        const { data: allProfiles } = await supabase.from('user_topic_profiles')
          .select('user_id, topic_weights').neq('user_id', userId).limit(200);
        if (allProfiles?.length) {
          const cv = Object.values(weights);
          const cn = Math.sqrt(cv.reduce((s, v) => s + v * v, 0)) || 1;
          const topPeers = allProfiles.map(p => {
            const ow = p.topic_weights || {};
            let dot = 0; for (const [k, v] of Object.entries(ow)) dot += (weights[k] || 0) * v;
            const on = Math.sqrt(Object.values(ow).reduce((s, v) => s + v * v, 0)) || 1;
            return { uid: p.user_id, sim: dot / (cn * on) };
          }).sort((a, b) => b.sim - a.sim).slice(0, 20).map(x => x.uid);

          const { data: ce } = await supabase.from('behavior_events').select('article_id')
            .in('user_id', topPeers).in('event_type', ['time_spent', 'completed', 'saved'])
            .gte('created_at', new Date(now - 60 * DAY).toISOString()).limit(5000);
          if (ce) {
            const cnt = {}; ce.forEach(e => { cnt[e.article_id] = (cnt[e.article_id] || 0) + 1; });
            const mx = Math.max(...Object.values(cnt), 1);
            for (const [id, c] of Object.entries(cnt)) collabBoost[id] = Math.min(0.4, (c / mx) * 0.4);
          }
        }
      } catch {}
    }

    /* 5. fetch pool — 1000 articles gives plenty of rows */
    const { data: articles } = await supabase.from('book_summaries').select(`
        id, created_at, title, author, description, category, tags, keywords,
        image_url, avg_rating, slug,
        likes_count:likes!likes_post_id_fkey(count),
        views_count:views!views_post_id_fkey(count),
        comments_count:comments!comments_post_id_fkey(count)
      `).eq('status', 'published').order('created_at', { ascending: false }).limit(1000);

    let pool = filterOutOldBriefs(
      (articles || []).map(a => ({
        ...a,
        likes_count:    parseNumber(a.likes_count),
        views_count:    parseNumber(a.views_count),
        comments_count: parseNumber(a.comments_count),
        avg_rating:     parseNumber(a.avg_rating),
      }))
    ).filter(a => {
      const ck = (a.category || '').toLowerCase().trim();
      const CLUTTER = new Set(['business concepts', 'concepts', 'concepts abbreviations']);
      return CLUTTER.has(ck) ? (merged[ck] || 0) > 0 : true;
    });

    /* 6. score */
    const scored = pool.map(a => {
      let score = 0;
      (a.tags     || []).forEach(t => { const k = t.toLowerCase().trim(); if (merged[k]) score += merged[k]; });
      (a.keywords || []).forEach(k => { const kk = k.toLowerCase().trim(); if (merged[kk]) score += merged[kk] * 0.8; });
      const ck = (a.category || '').toLowerCase().trim();
      if (ck && merged[ck]) score += merged[ck];
      score += collabBoost[a.id] || 0;
      if (recentlySeen.has(a.id)) score -= 3;
      const daysOld = Math.max(0, (now - new Date(a.created_at).getTime()) / DAY);
      score += Math.max(0, (30 - daysOld) * 0.02);
      return { ...a, _score: score };
    });

    /* 7. blend */
    scored.sort((a, b) => b._score - a._score);
    const total    = scored.length;
    const topMatch = scored.slice(0, Math.floor(total * 0.5));
    const related  = scored.slice(Math.floor(total * 0.5), Math.floor(total * 0.75));
    const fresh    = [...scored].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, Math.floor(total * 0.2));
    const rand     = scored.slice(Math.floor(total * 0.8));
    const shuffle  = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    /* ★ Use MAX_FEED_ITEMS (500) so there are ~41 rows available */
    const finalFeed = shuffle([
      ...shuffle(topMatch).slice(0, Math.ceil(MAX_FEED_ITEMS * 0.50)),
      ...shuffle(related).slice(0,  Math.ceil(MAX_FEED_ITEMS * 0.25)),
      ...shuffle(fresh).slice(0,    Math.ceil(MAX_FEED_ITEMS * 0.15)),
      ...shuffle(rand).slice(0,     Math.ceil(MAX_FEED_ITEMS * 0.10)),
    ]).slice(0, MAX_FEED_ITEMS);

    /* 8. tags for filter bar */
    const tagSet = new Set();
    finalFeed.forEach(a => (a.tags || []).forEach(t => tagSet.add(t)));

    setAllArticles(finalFeed);
    setAvailableTags([...tagSet].sort());
    setVisibleCount(INITIAL_VISIBLE); // show 60 cards = 5 rows immediately
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadFeed(); }, [loadFeed, refreshKey]);

  /* IntersectionObserver: add LOAD_MORE_BATCH (24) cards = 2 more rows each time */
  useEffect(() => {
    if (!sentinelRef.current || loading) return;
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting)
          setVisibleCount(prev => Math.min(prev + LOAD_MORE_BATCH, filteredArticles.length));
      },
      { rootMargin: '400px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, allArticles, activeTag]);

  const filteredArticles = activeTag
    ? allArticles.filter(a => (a.tags || []).includes(activeTag))
    : allArticles;

  /* Split into horizontal rows of ITEMS_PER_CAROUSEL (12) */
  const visible = filteredArticles.slice(0, visibleCount);
  const rows    = [];
  for (let i = 0; i < visible.length; i += ITEMS_PER_CAROUSEL)
    rows.push(visible.slice(i, i + ITEMS_PER_CAROUSEL));

  const handleTagClick = (tag) => {
    setActiveTag(prev => prev === tag ? null : tag);
    setVisibleCount(INITIAL_VISIBLE);
  };
  const handleRefresh = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setRefreshKey(prev => prev + 1);
  };

  if (loading) return (
    <div className="centered-loader-viewport">
      <div className="centered-loader"><div className="spinner" /><p className="loader-text">Loading your personalised feed…</p></div>
    </div>
  );

  if (!rows.length) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
      No content found. Read a few articles to train the algorithm.
    </div>
  );

  return (
    <div className="personalised-feed">
      {/* Tag filter bar */}
      {availableTags.length > 0 && (
        <div className="categories-bar" style={{ alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch', padding: '0 8px 8px', maxWidth: '100%' }}>
            {availableTags.map(tag => (
              <button key={tag} type="button" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                className={`category-chip${activeTag === tag ? ' active' : ''}`}
                onClick={() => handleTagClick(tag)}>
                {tag}
              </button>
            ))}
          </div>
          {activeTag && (
            <button className="hf-btn" type="button" onClick={() => setActiveTag(null)} style={{ marginLeft: 8 }}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* ★ Horizontal rows — each row = one HorizontalCarousel */}
      {rows.map((row, idx) => (
        <HorizontalCarousel
          key={idx}
          title={idx === 0 ? '✨ For You' : ''}
          items={row}
          loading={false}
          skeletonCount={6}
        >
          {row.map(article => (
            <BookSummaryCard key={article.id} summary={article} />
          ))}
        </HorizontalCarousel>
      ))}

      {/* Sentinel: triggers 2 more rows */}
      {visibleCount < filteredArticles.length && (
        <div ref={sentinelRef} style={{ height: 1, width: '100%' }} aria-hidden="true" />
      )}

      {/* End of feed */}
      {visibleCount >= filteredArticles.length && allArticles.length > 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>
            You've seen everything. Keep reading to improve your recommendations.
          </p>
          <button onClick={handleRefresh}
            style={{ padding: '6px 20px', borderRadius: '20px', border: '1px solid #2d3748',
              background: 'transparent', color: '#9ca3af', fontSize: '0.8rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#06b6d4'; e.currentTarget.style.color = '#06b6d4'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2d3748'; e.currentTarget.style.color = '#9ca3af'; }}>
            <FaSync /> Refresh Feed
          </button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN CONTENT FEED
══════════════════════════════════════════════════════════════════════════ */
const ContentFeed = ({
  selectedCategory = FOR_YOU_TAB,
  onEdit, onDelete,
  searchQuery  = '',
  userRole     = 'user',
  onSelectCategory,
}) => {
  const location = useLocation();
  const mountedRef    = useRef(true);
  const generationRef = useRef(0);
  const fastCacheRef  = useRef(new Map());
  const rootRef       = useRef(null);
  const sentinelRef   = useRef(null);

  const [loadingGlobal,        setLoadingGlobal]        = useState(true);
  const [globalContent,        setGlobalContent]        = useState({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });
  const [categoryQueue,        setCategoryQueue]        = useState([]);
  const [loadedCategoryBlocks, setLoadedCategoryBlocks] = useState([]);
  const [loadingCategories,    setLoadingCategories]    = useState(false);
  const [hasMoreCategories,    setHasMoreCategories]    = useState(false);
  const [availableTags,        setAvailableTags]        = useState([]);
  const [selectedTags,         setSelectedTags]         = useState([]);
  const [taggedResults,        setTaggedResults]        = useState(null);
  const [taggedLoading,        setTaggedLoading]        = useState(false);
  const [searchResults,        setSearchResults]        = useState([]);
  const [searchRelated,        setSearchRelated]        = useState([]);
  const [tagsReloadKey,        setTagsReloadKey]        = useState(0);
  const [effectiveQuery,       setEffectiveQuery]       = useState((searchQuery || '').trim());
  const [currentUserId,        setCurrentUserId]        = useState(null);
  const [authChecked,          setAuthChecked]          = useState(false);
  const [onboardingComplete,   setOnboardingComplete]   = useState(() =>
    !!(localStorage.getItem(ONBOARDING_KEY) || localStorage.getItem(ONBOARDING_SKIPPED_KEY))
  );

  const isDraftTab   = selectedCategory === DRAFTS_TAB;
  const isBriefTab   = selectedCategory === BRIEFS_TAB;
  const isForYou     = !isDraftTab && !isBriefTab && (selectedCategory === FOR_YOU_TAB || selectedCategory === 'All');
  const canSeeDrafts = userRole === 'admin' || userRole === 'team';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (mountedRef.current) { setCurrentUserId(data?.user?.id ?? null); setAuthChecked(true); }
    });
  }, []);

  useEffect(() => {
    if (!onSelectCategory) return;
    const h = (e) => { if (e.detail?.tab) onSelectCategory(e.detail.tab); };
    window.addEventListener('ogonjo:navigate-tab', h);
    return () => window.removeEventListener('ogonjo:navigate-tab', h);
  }, [onSelectCategory]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setEffectiveQuery((searchQuery || '').trim()); }, [searchQuery]);
  useEffect(() => { try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) {} }, [location.pathname]);

  useEffect(() => {
    const root = rootRef.current || document;
    if (!root) return;
    const h = (e) => {
      try {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target?.closest?.('a'); if (!a) return;
        const href = a.getAttribute('href') || a.href; if (!href) return;
        let url; try { url = new URL(href, window.location.origin); } catch { return; }
        if (url.origin !== window.location.origin) return;
        if (url.pathname.startsWith('/summary/') || url.pathname.startsWith('/library/'))
          window.scrollTo({ top: 0, behavior: 'auto' });
      } catch (_) {}
    };
    root.addEventListener('click', h, true);
    return () => root.removeEventListener('click', h, true);
  }, []);

  useEffect(() => {
    const go = () => {
      try {
        const el = rootRef.current;
        if (el) {
          const hH = document.querySelector('header')?.offsetHeight || 0;
          window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - hH - 8), behavior: 'auto' });
        } else window.scrollTo({ top: 0, behavior: 'auto' });
      } catch (_) { try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (__) {} }
    };
    go(); const t = setTimeout(go, 120); return () => clearTimeout(t);
  }, [selectedCategory, effectiveQuery]);

  useEffect(() => {
    try {
      const BASE = 'OGONJO — Business Knowledge for Builders';
      let title = BASE, description = BASE;
      if (isDraftTab)        { title = 'Drafts — OGONJO'; description = 'Your unpublished drafts.'; }
      else if (isBriefTab)   { title = 'Ogonjo Briefs — Business Intelligence'; description = 'Curated business intelligence for founders and investors.'; }
      else if (effectiveQuery) { title = `Results for "${effectiveQuery}" — OGONJO`; description = `Search results for "${effectiveQuery}".`; }
      else if (!isForYou)    { title = `${selectedCategory} — OGONJO`; description = `Explore ${selectedCategory} on OGONJO.`; }
      document.title = title;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'description'); document.head.appendChild(meta); }
      meta.setAttribute('content', description);
    } catch (_) {}
  }, [effectiveQuery, selectedCategory, isDraftTab, isBriefTab, isForYou]);

  useEffect(() => {
    if (isDraftTab || isBriefTab) return;
    (async () => {
      try {
        let q = supabase.from('book_summaries').select('tags').eq('status', 'published').limit(5000);
        if (!isForYou) q = q.eq('category', selectedCategory);
        const { data, error } = await q; if (error) throw error;
        const set = new Set();
        (data || []).forEach(row => { (row?.tags || []).forEach(t => { if (t && typeof t === 'string') set.add(t.trim().toLowerCase()); }); });
        const list = [...set].sort();
        if (mountedRef.current) {
          setAvailableTags(list);
          setSelectedTags(prev => { if (!prev.length) return []; const a = new Set(list); return prev.filter(t => a.has(t.toLowerCase())); });
        }
      } catch (err) { console.warn('Could not load tags', err); }
    })();
  }, [selectedCategory, tagsReloadKey, isDraftTab, isBriefTab, isForYou]);

  const fastFetchList = useCallback(async (limit = ITEMS_PER_CAROUSEL, category = null) => {
    const key = category ? `cat:${category}` : 'global';
    if (fastCacheRef.current.has(key)) return fastCacheRef.current.get(key);
    try {
      let q = supabase.from('book_summaries').select(LIGHT_SELECT).eq('status', 'published')
        .order('created_at', { ascending: false }).limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q; if (error) throw error;
      const rows     = (data || []).map(normalizeRow);
      const filtered = category === BRIEFS_CATEGORY ? filterOutOldBriefs(rows) : rows;
      fastCacheRef.current.set(key, filtered);
      return filtered;
    } catch (err) { console.warn('fastFetchList failed', err); return []; }
  }, []);

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
      const f = items => category === BRIEFS_CATEGORY ? filterOutOldBriefs(items) : items;
      return { category, newest: f(newest || []), mostLiked: f(mostLiked || []), highestRated: f(highestRated || []), mostViewed: f(mostViewed || []) };
    } catch (err) { console.error('fetchContentBlock error', err); return { category, newest: [], mostLiked: [], highestRated: [], mostViewed: [] }; }
  }, []);

  const replaceCategoryBlock = useCallback((newBlock) => {
    setLoadedCategoryBlocks(prev => {
      const idx = prev.findIndex(b => String(b.category) === String(newBlock.category));
      if (idx === -1) return [...prev, newBlock];
      const copy = [...prev]; copy[idx] = newBlock; return copy;
    });
  }, []);

  const rankItemsWithBoost = useCallback((items = [], tags = [], sortKey = 'newest') => {
    if (!items.length) return [];
    const filtered = filterOutOldBriefs(items); if (!filtered.length) return [];
    if (!tags.length) {
      const copy = filtered.slice();
      if (sortKey === 'newest') return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sortKey === 'likes')  return copy.sort((a, b) => (b.likes_count  || 0) - (a.likes_count  || 0));
      if (sortKey === 'rating') return copy.sort((a, b) => (b.avg_rating   || 0) - (a.avg_rating   || 0));
      if (sortKey === 'views')  return copy.sort((a, b) => (b.views_count  || 0) - (a.views_count  || 0));
      return copy;
    }
    const tagSet = new Set(tags.map(t => t.toLowerCase()));
    return filtered.map(it => {
      const mc = (Array.isArray(it.tags) ? it.tags.map(t => t.toLowerCase()) : []).reduce((acc, t) => acc + (tagSet.has(t) ? 1 : 0), 0);
      return { it, mc };
    }).sort((a, b) => {
      if (b.mc !== a.mc) return b.mc - a.mc;
      if (sortKey === 'newest') return new Date(b.it.created_at) - new Date(a.it.created_at);
      if (sortKey === 'likes')  return (b.it.likes_count  || 0) - (a.it.likes_count  || 0);
      if (sortKey === 'rating') return (b.it.avg_rating   || 0) - (a.it.avg_rating   || 0);
      if (sortKey === 'views')  return (b.it.views_count  || 0) - (a.it.views_count  || 0);
      return 0;
    }).map(s => s.it);
  }, []);

  const loadNextCategoryBatch = useCallback(async () => {
    if (loadingCategories || !categoryQueue.length) { setHasMoreCategories(false); return; }
    setLoadingCategories(true);
    const batch = categoryQueue.slice(0, CATEGORY_BATCH);
    const rest  = categoryQueue.slice(batch.length);
    setCategoryQueue(rest);
    try {
      const placeholders = await Promise.all(
        batch.map(c => fastFetchList(4, c).then(items => ({ category: c, newest: items, mostLiked: items, highestRated: items, mostViewed: items })))
      );
      if (!mountedRef.current) return;
      setLoadedCategoryBlocks(prev => [...prev, ...placeholders]);
      (async () => {
        try {
          const blocks = await Promise.all(batch.map(c => fetchContentBlock(c)));
          if (!mountedRef.current) return;
          blocks.filter(b => b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length)
            .forEach(blk => replaceCategoryBlock(blk));
        } catch (err) { console.error('background batch error', err); }
      })();
      setHasMoreCategories(rest.length > 0);
    } catch (err) { console.error('loadNextCategoryBatch err', err); }
    finally { if (mountedRef.current) setLoadingCategories(false); }
  }, [categoryQueue, loadingCategories, fetchContentBlock, fastFetchList, replaceCategoryBlock]);

  useEffect(() => {
    if (isDraftTab || isBriefTab) { setLoadingGlobal(false); return; }
    let cancelled = false;
    (async () => {
      generationRef.current += 1;
      const gen     = generationRef.current;
      const isStale = () => gen !== generationRef.current || cancelled || !mountedRef.current;
      fastCacheRef.current.clear();
      const safeSet = u => { if (isStale()) return; setGlobalContent(p => ({ ...p, ...(typeof u === 'function' ? u(p) : u) })); };
      setLoadingGlobal(true);
      setLoadedCategoryBlocks([]);
      setCategoryQueue([]);
      setHasMoreCategories(false);
      setSearchResults([]);
      setSearchRelated([]);

      if (effectiveQuery.trim()) {
        const start = Date.now();
        try {
          const sc = !isForYou ? selectedCategory : null;
          const fast = await fastFetchList(ITEMS_PER_CAROUSEL, sc);
          if (isStale()) return;
          safeSet({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });
          let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS).eq('status', 'published').limit(1200);
          if (sc) q = q.eq('category', sc);
          const { data, error } = await q; if (isStale()) return; if (error) throw error;
          const rows   = filterOutOldBriefs(safeData(data).map(normalizeRow));
          const qnorm  = normalizeText(effectiveQuery);
          const tokens = qnorm.split(/\s+/).filter(Boolean);
          const scored = rows.map(r => {
            let b = 0;
            const t = normalizeText(r.title || ''), d = normalizeText(r.description || '');
            tokens.forEach(tok => {
              if (t.includes(tok)) b += 30; if (d.includes(tok)) b += 10;
              if ((Array.isArray(r.tags) ? r.tags.map(normalizeText) : []).some(x => x === tok)) b += 20;
            });
            return { ...r, _score: similarityScore(r, qnorm) + b };
          }).filter(r => r._score > 0).sort((a, b) => b._score - a._score);
          let primary = scored.slice(0, ITEMS_PER_CAROUSEL);
          if (!primary.length) primary = rows.filter(r => {
            const t = normalizeText(r.title || ''), d = normalizeText(r.description || ''), a = normalizeText(r.author || '');
            return tokens.some(tok => t.includes(tok) || d.includes(tok) || a.includes(tok) ||
              (Array.isArray(r.tags) && r.tags.some(x => normalizeText(x).includes(tok))));
          }).slice(0, ITEMS_PER_CAROUSEL);
          const pIds = new Set(primary.map(p => p.id));
          const pTags = new Set(primary.flatMap(p => p.tags || []));
          const related = rows.filter(r => {
            if (pIds.has(r.id)) return false;
            if (Array.isArray(r.tags) && r.tags.some(t => pTags.has(t))) return true;
            if (primary[0] && r.category === primary[0].category) return true;
            const t = normalizeText(r.title || ''), d = normalizeText(r.description || '');
            return tokens.some(tok => t.includes(tok) || d.includes(tok));
          }).slice(0, ITEMS_PER_CAROUSEL);
          if (isStale()) return;
          setSearchResults(primary);
          setSearchRelated(related);
          setTagsReloadKey(k => k + 1);
        } catch (err) { console.error('search error', err); }
        finally { const e = Date.now() - start; if (e < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - e); if (!isStale()) setLoadingGlobal(false); }
        return;
      }

      if (!isForYou) {
        const start = Date.now();
        try {
          const block = await fetchContentBlock(selectedCategory);
          if (isStale()) return;
          if (block.newest.length || block.mostLiked.length || block.highestRated.length || block.mostViewed.length)
            setLoadedCategoryBlocks([block]);
          setTagsReloadKey(k => k + 1);
        } catch (err) { console.error('specific cat fetch error', err); }
        finally { const e = Date.now() - start; if (e < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - e); if (!isStale()) setLoadingGlobal(false); }
        return;
      }

      // ForYou is handled inside PersonalisedFeed
      setLoadingGlobal(false);
    })();
    return () => { cancelled = true; generationRef.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, effectiveQuery, isDraftTab, isBriefTab, isForYou]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting && hasMoreCategories && !loadingCategories) loadNextCategoryBatch(); }),
      { root: null, rootMargin: '600px', threshold: 0.1 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMoreCategories, loadingCategories, loadNextCategoryBatch]);

  const fetchTaggedContent = useCallback(async (tag, category = null, limit = ITEMS_PER_CAROUSEL) => {
    if (!tag) return [];
    try {
      let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS).eq('status', 'published')
        .contains('tags', [tag]).order('created_at', { ascending: false }).limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q; if (error) throw error;
      return filterOutOldBriefs((data || []).map(normalizeRow));
    } catch (err) { console.error('fetchTaggedContent error', err); return []; }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedTags.length) { setTaggedResults(null); setTaggedLoading(false); return; }
      setTaggedLoading(true);
      try {
        const rows = await fetchTaggedContent(selectedTags[0], !isForYou ? selectedCategory : null, ITEMS_PER_CAROUSEL);
        if (mountedRef.current && alive) setTaggedResults(rows);
      } catch (err) { if (mountedRef.current && alive) setTaggedResults([]); }
      finally { if (mountedRef.current && alive) setTaggedLoading(false); }
    })();
    return () => { alive = false; };
  }, [selectedTags, selectedCategory, fetchTaggedContent, isForYou]);

  const toggleTag    = useCallback((tag) => { setSelectedTags(prev => (prev.length > 0 && prev[0] === tag.toLowerCase()) ? [] : [tag.toLowerCase()]); }, []);
  const clearTags    = useCallback(() => setSelectedTags([]), []);

  const renderCards  = useCallback((items, mode = 'newest') => {
    if (!items || !Array.isArray(items)) return null;
    const src = mode === 'search' ? items : rankItemsWithBoost(items, selectedTags, mode);
    return (src || []).map(s => <BookSummaryCard key={String(s.id ?? s.slug)} summary={s} onEdit={onEdit} onDelete={onDelete} />);
  }, [onEdit, onDelete, rankItemsWithBoost, selectedTags]);

  const buildViewAllLink = useCallback((sortKey = 'newest', category = null, tag = null) => {
    const p = new URLSearchParams();
    if (sortKey)  p.set('sort', sortKey);
    if (category) p.set('category', category);
    if (tag)      { p.set('tag', tag); p.set('tag_only', '1'); }
    const s = p.toString(); return s ? `/explore?${s}` : '/explore';
  }, []);

  const buildSeeMoreText = useCallback(({ sortKey = 'newest', category = null, tag = null } = {}) => {
    const map = { newest: 'Newest Content', likes: 'Most Liked content', rating: 'Most Rated Content', views: 'Most Viewed Content' };
    const base = map[sortKey] || 'more content';
    if (tag)      return `Explore More From ${base} In "${tag}"`;
    if (category) return `Explore More From ${base} In ${category}`;
    return `Explore More From ${base}`;
  }, []);

  const SeeMoreCTA = useCallback(({ href, text }) => {
    if (!href) return null;
    return <div className="see-more-wrapper"><a href={href} className="see-more-btn" role="button">{text}</a></div>;
  }, []);

  /* ── Early returns ── */
  if (isDraftTab && canSeeDrafts)  return <div className="content-feed-root" ref={rootRef}><DraftPanel onEdit={onEdit} /></div>;
  if (isDraftTab && !canSeeDrafts) return <div className="content-feed-root" ref={rootRef}><p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>You don't have permission to view drafts.</p></div>;
  if (isBriefTab)                  return <div className="content-feed-root" ref={rootRef}><BriefsFeed /></div>;

  if (isForYou) {
    if (!authChecked) return (
      <div className="content-feed-root" ref={rootRef}>
        <div className="centered-loader-viewport"><div className="centered-loader"><div className="spinner" /><p className="loader-text">Loading…</p></div></div>
      </div>
    );
    if (!onboardingComplete) return (
      <div className="content-feed-root" ref={rootRef}>
        <FeedOnboarding onComplete={() => setOnboardingComplete(true)} />
      </div>
    );
  }

  /* ── Render ── */
  const renderContent = () => {
    if (isForYou) return <PersonalisedFeed userId={currentUserId} />;

    return (
      <>
        <div className="categories-bar" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {availableTags.length === 0
              ? <div className="hf-loading">{!isForYou ? 'No tags for this category.' : 'Loading tags…'}</div>
              : availableTags.map(tag => {
                  const active = selectedTags.includes(tag.toLowerCase());
                  return <button key={tag} className={`category-chip${active ? ' active' : ''}`} onClick={() => toggleTag(tag)} aria-pressed={active} type="button" title={`Filter by ${tag}`}>{tag}</button>;
                })
            }
          </div>
          {selectedTags.length > 0 && <button className="hf-btn" type="button" onClick={clearTags}>Clear tags ({selectedTags.length})</button>}
        </div>

        {selectedTags.length > 0 && (
          <section className="feed-section">
            <HorizontalCarousel title={`Tag: ${selectedTags[0]}`} items={taggedResults || []} loading={taggedLoading} skeletonCount={6}>
              {renderCards(taggedResults || [], 'newest')}
            </HorizontalCarousel>
            <SeeMoreCTA href={buildViewAllLink('newest', !isForYou ? selectedCategory : null, selectedTags[0])}
              text={buildSeeMoreText({ sortKey: 'newest', category: !isForYou ? selectedCategory : null, tag: selectedTags[0] })} />
          </section>
        )}

        {effectiveQuery.trim() && (<>
          <section className="feed-section">
            <HorizontalCarousel title={`Results for "${effectiveQuery}"`} items={searchResults} loading={loadingGlobal} skeletonCount={6} emptyMessage={`No results for "${effectiveQuery}"`}>
              {renderCards(searchResults, 'search')}
            </HorizontalCarousel>
            <SeeMoreCTA href={`/explore?q=${encodeURIComponent(effectiveQuery)}`} text={`Explore more results for "${effectiveQuery}"`} />
          </section>
          {searchRelated.length > 0 && (
            <section className="feed-section">
              <HorizontalCarousel title="Related content" items={searchRelated} loading={loadingGlobal} skeletonCount={6}>{renderCards(searchRelated, 'search')}</HorizontalCarousel>
              <SeeMoreCTA href={buildViewAllLink('newest')} text="Explore more related content" />
            </section>
          )}
        </>)}

        {!isForYou && !effectiveQuery && loadedCategoryBlocks.length > 0 && (
          <div key={`${loadedCategoryBlocks[0].category}-single`}>
            {SECTIONS.map(({ key, title, sortKey }) => {
              const items = loadedCategoryBlocks[0][key];
              return (
                <section className="feed-section" key={key}>
                  <HorizontalCarousel title={`${title} in ${loadedCategoryBlocks[0].category}`} items={items} loading={loadingGlobal} skeletonCount={6}>
                    {renderCards(items, sortKey)}
                  </HorizontalCarousel>
                  <SeeMoreCTA href={buildViewAllLink(sortKey, loadedCategoryBlocks[0].category)} text={buildSeeMoreText({ sortKey, category: loadedCategoryBlocks[0].category })} />
                </section>
              );
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="content-feed-root" ref={rootRef}>
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
      {renderContent()}
    </div>
  );
};

export default ContentFeed;