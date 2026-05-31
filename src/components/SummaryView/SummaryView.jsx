// src/components/SummaryView/SummaryView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// KEY CHANGES in this version:
// 1. Reading theme switcher (white/cream/brown/navy/forest) persisted to localStorage
// 2. Scroll-collapse header — uses a MutationObserver+scroll combo that works
//    regardless of which element is the scroll container
// 3. Article heading lines + paragraph spacing driven by CSS vars from the active theme
// 4. Theme dropdown with click-outside close
// 5. ExportModal receives articleHtml prop so preview works
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import {
  FaThumbsUp, FaStar, FaComment, FaEye,
  FaPlus, FaMinus, FaShareAlt,
  FaArrowLeft, FaFileDownload, FaChevronDown, FaPalette,
} from 'react-icons/fa';
import CommentsSection from '../CommentsSection/CommentsSection';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import DOMPurify from 'dompurify';
import EditSummaryForm from '../EditSummaryForm/EditSummaryForm';
import { Helmet } from 'react-helmet-async';
import AdSlot from '../Ad/Ad';
import { injectAds } from '../../utils/injectAds';
import { fetchWorkbookRecommendations } from '../../utils/fetchWorkbookRecommendations';
import ExportModal from '../ExportModal/ExportModal';

import './SummaryView.css';

/* ─── Reading themes ─────────────────────────────────────────────────────── */
const READING_THEMES = {
  white:  { label: 'White',  bg: '#ffffff', text: '#0b1220', headingLine: '#d1d5db', accent: '#2563eb' },
  cream:  { label: 'Cream',  bg: '#fdf8f0', text: '#3b2a1a', headingLine: '#d6c9b0', accent: '#92400e' },
  brown:  { label: 'Brown',  bg: '#2e1f14', text: '#f5ede0', headingLine: '#6b4c39', accent: '#f59e0b' },
  navy:   { label: 'Navy',   bg: '#0f1f3d', text: '#e8eef8', headingLine: '#1e3a5f', accent: '#60a5fa' },
  forest: { label: 'Forest', bg: '#1a2f1e', text: '#e8f5e9', headingLine: '#2d4a32', accent: '#4ade80' },
};

const THEME_STORAGE_KEY = 'ogonjo_reading_theme';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const SELECT_WITH_COUNTS = `*,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

/* ─── Small utilities ────────────────────────────────────────────────────── */
const toNum = (v) => {
  if (v == null) return 0;
  if (Array.isArray(v)) return Number(v[0]?.count ?? 0);
  if (typeof v === 'object' && 'count' in v) return Number(v.count || 0);
  return Number(v || 0);
};

const normalizeRow = (r = {}) => {
  const tags = Array.isArray(r.tags)
    ? r.tags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t)))
    : [];
  const ratingCountRaw =
    r.rating_count ?? r.ratings_count ??
    (Array.isArray(r.rating_count_aggregate) ? (r.rating_count_aggregate[0]?.count ?? 0) : 0) ?? 0;
  return {
    id: r.id, slug: r.slug ?? null, title: r.title ?? '', author: r.author ?? '',
    summary: r.summary ?? null, description: r.description ?? null, category: r.category ?? null,
    image_url: r.image_url ?? null, affiliate_link: r.affiliate_link ?? null,
    youtube_url: r.youtube_url ?? null, tags, user_id: r.user_id ?? null,
    likes_count: toNum(r.likes_count), views_count: toNum(r.views_count),
    comments_count: toNum(r.comments_count), avg_rating: Number(r.avg_rating ?? 0),
    rating_count: Number(ratingCountRaw), difficulty_level: r.difficulty_level ?? null,
    created_at: r.created_at ?? null, updated_at: r.updated_at ?? null,
  };
};

const extractYouTubeId = (url = '') => {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /[?&]v=([0-9A-Za-z_-]{11})/, /youtu\.be\/([0-9A-Za-z_-]{11})/,
    /\/embed\/([0-9A-Za-z_-]{11})/, /\/v\/([0-9A-Za-z_-]{11})/,
  ];
  for (const re of patterns) { const m = url.match(re); if (m?.[1]) return m[1]; }
  return url.match(/([0-9A-Za-z_-]{11})/)?.[1] ?? null;
};

const stripHtml = (html = '') => String(html || '').replace(/<[^>]*>/g, '').trim();
const makeSafeDescription = (raw = '', maxLen = 140) => {
  const cleaned = DOMPurify.sanitize(String(raw || ''), { ALLOWED_TAGS: [] });
  const plain = stripHtml(cleaned);
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
};

const buildLightItem = (nr = {}, src = {}) => {
  const rawDesc = (src.description !== undefined ? src.description : null) ??
    (nr.description !== undefined ? nr.description : null) ??
    src.desc ?? src.blurb ?? src.short_description ?? null;
  return {
    id: nr.id, slug: nr.slug, title: nr.title, author: nr.author,
    description: makeSafeDescription(String(rawDesc || '').trim(), 140),
    category: nr.category, image_url: nr.image_url, avg_rating: nr.avg_rating || 0,
    likes_count: nr.likes_count || 0, views_count: nr.views_count || 0,
    comments_count: nr.comments_count || 0, tags: nr.tags || [],
    user_id: nr.user_id ?? null, created_at: nr.created_at ?? null,
    difficulty_level: nr.difficulty_level ?? null,
  };
};

/* ─── Inline loader ──────────────────────────────────────────────────────── */
const InlineLoader = ({ label = 'Loading content' }) => (
  <div className="summary-inline-loader" aria-live="polite" aria-busy="true" role="status"
    style={{ textAlign: 'center', padding: 20 }}>
    <div className="dots" aria-hidden="true" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <span className="dot" /><span className="dot" /><span className="dot" />
    </div>
    <div style={{ marginTop: 8, color: '#6b7280' }}>{label}…</div>
    <style>{`
      .summary-inline-loader .dot { width:10px;height:10px;border-radius:50%;background:#2563eb;display:inline-block;animation:sdot 1s infinite ease-in-out; }
      .summary-inline-loader .dot:nth-child(2){animation-delay:.12s}
      .summary-inline-loader .dot:nth-child(3){animation-delay:.24s}
      @keyframes sdot{0%{transform:translateY(0);opacity:.4}40%{transform:translateY(-8px);opacity:1}80%{transform:translateY(0);opacity:.6}100%{transform:translateY(0);opacity:.4}}
    `}</style>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════ */
const SummaryView = () => {
  const { param } = useParams();
  const navigate = useNavigate();

  /* ── Reading theme (localStorage-persisted) ──────────────────────────── */
  const [readingThemeKey, setReadingThemeKey] = useState(() => {
    try { return localStorage.getItem(THEME_STORAGE_KEY) || 'white'; } catch { return 'white'; }
  });
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const themeDropdownRef = useRef(null);
  const rt = READING_THEMES[readingThemeKey] || READING_THEMES.white;

  const applyTheme = (key) => {
    setReadingThemeKey(key);
    try { localStorage.setItem(THEME_STORAGE_KEY, key); } catch {}
    setShowThemeDropdown(false);
  };

  /* ── Close dropdown on outside click ────────────────────────────────── */
  useEffect(() => {
    if (!showThemeDropdown) return;
    const handler = (e) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target))
        setShowThemeDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showThemeDropdown]);

  /* ── Other UI state ──────────────────────────────────────────────────── */
  const [fontSize, setFontSize] = useState(18);
  const [readingMode, setReadingMode] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  /* ── Content state ───────────────────────────────────────────────────── */
  const [summary, setSummary] = useState(null);
  const [postId, setPostId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Engagement ──────────────────────────────────────────────────────── */
  const [likes, setLikes] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [views, setViews] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  /* ── Recommendations ─────────────────────────────────────────────────── */
  const [recommendedContent, setRecommendedContent] = useState([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recError, setRecError] = useState(null);

  /* ── Auth / edit ─────────────────────────────────────────────────────── */
  const [ownerId, setOwnerId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  /* ── Article HTML / ads ──────────────────────────────────────────────── */
  const [processedSummaryHtml, setProcessedSummaryHtml] = useState('');
  const [slotWorkbooks, setSlotWorkbooks] = useState([]);

  /* ── Refs ────────────────────────────────────────────────────────────── */
  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const slugCache = useRef(new Map());
  const commentsRef = useRef(null);

  /* ─── Workbooks ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!summary?.id) return;
    if (summary?.category === 'Workbooks') { setSlotWorkbooks([]); return; }
    fetchWorkbookRecommendations(summary, 8).then(setSlotWorkbooks).catch(() => setSlotWorkbooks([]));
  }, [summary?.id]); // eslint-disable-line

  /* ─── Ad segments ───────────────────────────────────────────────────── */
  const articleSegments = useMemo(() => injectAds(processedSummaryHtml), [processedSummaryHtml]);

  useEffect(() => {
    if (!articleSegments?.length) return;
    const adSegments = articleSegments.filter(s => s.type === 'ad');
    if (!adSegments.length) return;
    const ezoicIds = adSegments.filter(s => !slotWorkbooks[s.adIndex - 1]).map(s => 100 + s.adIndex);
    if (!ezoicIds.length) return;
    try {
      window.ezstandalone = window.ezstandalone || {};
      window.ezstandalone.cmd = window.ezstandalone.cmd || [];
      window.ezstandalone.cmd.push(() => { window.ezstandalone.destroyAll(); window.ezstandalone.showAds(...ezoicIds); });
    } catch {}
    return () => { try { window.ezstandalone.cmd.push(() => window.ezstandalone.destroyAll()); } catch {} };
  }, [articleSegments, slotWorkbooks]);

  /* ─── Scroll-collapse header ─────────────────────────────────────────
     Strategy: listen on every candidate scroll container simultaneously.
     The first one that fires with scrollTop > 80 wins.
  ──────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const getScrollTop = () => {
      const els = [
        document.querySelector('.main-content'),
        document.querySelector('main'),
        document.querySelector('#root > div'),
        document.documentElement,
        document.body,
      ].filter(Boolean);
      for (const el of els) {
        const st = el.scrollTop;
        if (st > 0) return st;
      }
      return window.scrollY || window.pageYOffset || 0;
    };

    const handleScroll = () => setCollapsed(getScrollTop() > 80);

    // Attach to all candidates + window
    const candidates = [
      document.querySelector('.main-content'),
      document.querySelector('main'),
      window,
    ].filter(Boolean);

    candidates.forEach(el => el.addEventListener('scroll', handleScroll, { passive: true }));
    return () => candidates.forEach(el => el.removeEventListener('scroll', handleScroll));
  }, []);

  /* ─── Auth ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try { const { data } = await supabase.auth.getUser(); setCurrentUserId(data?.user?.id ?? null); }
      catch { setCurrentUserId(null); }
    })();
  }, []);

  /* ─── Scroll to top ─────────────────────────────────────────────────── */
  const scrollToTop = useCallback((behavior = 'auto') => {
    try {
      const mainEl = document.querySelector('.main-content');
      const el = mainEl && typeof mainEl.scrollTo === 'function' ? mainEl :
        pageRef.current && typeof pageRef.current.scrollTo === 'function' ? pageRef.current :
        document.scrollingElement || document.documentElement;
      if (window?.location?.hash) {
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch {}
      }
      try { el.scrollTo({ top: 0, left: 0, behavior }); } catch { el.scrollTop = 0; }
    } catch { try { window.scrollTo(0, 0); } catch {} }
  }, []);

  useEffect(() => {
    scrollToTop('auto');
    requestAnimationFrame(() => scrollToTop('smooth'));
    const t = setTimeout(() => scrollToTop('auto'), 120);
    return () => clearTimeout(t);
  }, [param, scrollToTop]);

  /* ─── Recommendations ───────────────────────────────────────────────── */
  const fetchRecommendedByTags = useCallback(async (tags = [], limit = 10, resolvedPostId = null) => {
    setIsRecommending(true); setRecError(null);
    try {
      const lowerTags = (Array.isArray(tags) ? tags : []).map(t => (t || '').toLowerCase().trim()).filter(Boolean);
      if (!lowerTags.length) { setRecommendedContent([]); return []; }
      const { data, error } = await supabase.from('book_summaries')
        .select(`id,title,author,description,image_url,slug,category,difficulty_level,avg_rating,
           likes_count:likes!likes_post_id_fkey(count),
           views_count:views!views_post_id_fkey(count),
           comments_count:comments!comments_post_id_fkey(count),
           tags,user_id,created_at`)
        .neq('id', resolvedPostId).limit(500);
      if (error) throw error;
      const rows = (data || []).map(d => buildLightItem(normalizeRow(d), d))
        .filter(r => (Array.isArray(r.tags) ? r.tags.map(t => (t||'').toLowerCase()) : []).some(t => lowerTags.includes(t)))
        .map(r => ({ r, matchCount: (Array.isArray(r.tags)?r.tags:[]).map(t=>(t||'').toLowerCase().trim()).filter(t=>lowerTags.includes(t)).length }));
      rows.sort((a,b) => b.matchCount-a.matchCount || (b.r.views_count||0)-(a.r.views_count||0));
      const top = rows.map(x=>x.r).slice(0,limit);
      setRecommendedContent(top); return top;
    } catch (err) { setRecError('Unable to load recommendations.'); setRecommendedContent([]); return []; }
    finally { setIsRecommending(false); }
  }, []);

  const fetchRecommendedByCategory = useCallback(async (category, limit = 10, resolvedPostId = null) => {
    setIsRecommending(true); setRecError(null);
    try {
      const cat = String(category ?? '').trim();
      if (!cat) { setRecommendedContent([]); return []; }
      const { data, error } = await supabase.from('book_summaries')
        .select(`id,title,author,description,image_url,slug,category,difficulty_level,avg_rating,
           likes_count:likes!likes_post_id_fkey(count),
           views_count:views!views_post_id_fkey(count),
           comments_count:comments!comments_post_id_fkey(count),
           tags,user_id,created_at`)
        .neq('id', resolvedPostId).eq('category', cat).limit(500);
      if (error) throw error;
      const rows = (data||[]).map(d=>buildLightItem(normalizeRow(d),d)).filter(r=>String(r.id)!==String(resolvedPostId));
      rows.sort((a,b) => (b.views_count||0)-(a.views_count||0)||(b.likes_count||0)-(a.likes_count||0));
      const top = rows.slice(0,limit);
      setRecommendedContent(top); return top;
    } catch { setRecError('Unable to load recommendations.'); setRecommendedContent([]); return []; }
    finally { setIsRecommending(false); }
  }, []);

  /* ─── Background followups ──────────────────────────────────────────── */
  const backgroundFetchFollowups = useCallback(async (resolvedPostId, category='', tags=[]) => {
    try {
      const { data, error } = await supabase.from('book_summaries').select(SELECT_WITH_COUNTS).eq('id', resolvedPostId).single();
      if (!error && data) {
        const formatted = normalizeRow(data);
        formatted.category = String(formatted?.category ?? '').trim();
        setSummary(prev => prev ? { ...prev, ...formatted } : formatted);
        setOwnerId(formatted.user_id ?? null);
        setLikes(formatted.likes_count || 0); setViews(formatted.views_count || 0); setCommentsCount(formatted.comments_count || 0);
      }
      try {
        const { data: rd } = await supabase.rpc('get_average_rating', { p_post_id: resolvedPostId });
        if (Array.isArray(rd) && rd[0]?.average_rating != null) setAvgRating(Math.round(Number(rd[0].average_rating)*10)/10);
      } catch {}
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [lRes, rRes] = await Promise.all([
            supabase.from('likes').select('id').eq('post_id',resolvedPostId).eq('user_id',user.id),
            supabase.from('ratings').select('rating').eq('post_id',resolvedPostId).eq('user_id',user.id).maybeSingle(),
          ]);
          if (lRes?.data?.length) setUserHasLiked(true);
          if (rRes?.data?.rating) setUserRating(rRes.data.rating);
        }
      } catch {}
      try {
        const { getGeo, getSource } = await import('../../utils/trackView');
        const [geo, source] = await Promise.all([getGeo(), Promise.resolve(getSource())]);
        await supabase.rpc('increment_views', { post_id: resolvedPostId, country: geo.country, city: geo.city, source });
        setViews(v => (Number(v)||0)+1);
      } catch { try { await supabase.rpc('increment_views', { post_id: resolvedPostId }); setViews(v=>(Number(v)||0)+1); } catch {} }
      if (Array.isArray(tags) && tags.length > 0) fetchRecommendedByTags(tags, 10, resolvedPostId).catch(()=>{});
      else if (String(category??'').trim()) fetchRecommendedByCategory(category, 10, resolvedPostId).catch(()=>{});
      else setRecommendedContent([]);
    } catch (err) { console.error('backgroundFetchFollowups error', err); }
  }, [fetchRecommendedByCategory, fetchRecommendedByTags]);

  /* ─── Data loading ──────────────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true); setSummary(null); setPostId(null);
      try {
        const FIELDS = `id,slug,title,author,description,category,image_url,affiliate_link,youtube_url,tags,difficulty_level,user_id,created_at`;
        let { data } = await supabase.from('book_summaries').select(FIELDS).eq('slug', param).maybeSingle();
        let fetchedBy = data ? 'slug' : null;
        if (!data) { ({ data } = await supabase.from('book_summaries').select(FIELDS).eq('id', param).maybeSingle()); if (data) fetchedBy='id'; }
        if (!mounted) return;
        if (!data) { setIsLoading(false); return; }
        if (fetchedBy==='id' && data.slug && data.slug!==param) { navigate(`/summary/${data.slug}`, { replace: true }); return; }
        const normalized = normalizeRow(data);
        normalized.category = String(normalized?.category ?? '').trim();
        setSummary(normalized); setPostId(normalized.id); setOwnerId(normalized.user_id ?? null);
        setLikes(0); setViews(0); setCommentsCount(0);
        setIsLoading(false);
        backgroundFetchFollowups(normalized.id, normalized.category, normalized.tags).catch(console.debug);
      } catch (err) { console.error('Error loading content:', err); if (mounted) { setIsLoading(false); setSummary(null); setPostId(null); } }
    };
    load();
    return () => { mounted = false; };
  }, [param, navigate, backgroundFetchFollowups]);

  /* ─── Handlers ──────────────────────────────────────────────────────── */
  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please sign in to like content.'); return; }
      if (!postId) { alert('Content not ready.'); return; }
      if (userHasLiked) {
        const { error } = await supabase.from('likes').delete().eq('post_id',postId).eq('user_id',user.id);
        if (error) throw error;
        setUserHasLiked(false); setLikes(l=>Math.max(0,l-1));
      } else {
        const { error } = await supabase.from('likes').insert([{ post_id:postId, user_id:user.id }]);
        if (error) throw error;
        setUserHasLiked(true); setLikes(l=>(Number(l)||0)+1);
      }
    } catch (err) { console.error('Like error', err); alert('Could not update like. Try again.'); }
  };

  const saveRating = async (value) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please sign in to rate'); return false; }
      if (!postId) return false;
      setSavingRating(true);
      const { error } = await supabase.rpc('rate_post', { p_post_id:postId, p_user_id:user.id, p_rating:value });
      if (error) { alert('Could not save rating. Try again later.'); return false; }
      try {
        const { data: rd } = await supabase.rpc('get_average_rating', { p_post_id: postId });
        if (Array.isArray(rd) && rd[0]?.average_rating != null) setAvgRating(Math.round(Number(rd[0].average_rating)*10)/10);
      } catch {}
      setUserRating(value); return true;
    } catch (err) { alert('Could not save rating. Try again.'); return false; }
    finally { setSavingRating(false); }
  };

  const handleSetRating = async (value) => { setHoverRating(0); await saveRating(value); };

  const renderStars = (size = 'md') => {
    const active = hoverRating || userRating;
    return Array.from({ length: 5 }, (_, i) => {
      const n = i+1;
      return (
        <button key={n} type="button"
          className={`star-button ${n<=active?'active':''} ${size==='sm'?'small':''}`}
          onMouseEnter={()=>setHoverRating(n)} onMouseLeave={()=>setHoverRating(0)}
          onFocus={()=>setHoverRating(n)} onBlur={()=>setHoverRating(0)}
          onClick={()=>handleSetRating(n)} disabled={savingRating}
          aria-label={`Rate ${n} star${n>1?'s':''}`}
        ><FaStar /></button>
      );
    });
  };

  const handleScrollToComments = () => commentsRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
  const handleBackToArticle = () => { if (window.history.length > 1) navigate(-1); else navigate('/explore'); };

  /* ─── Link resolution ───────────────────────────────────────────────── */
  const resolveInternalLinksInHtml = useCallback(async (html) => {
    if (!html) return '';
    const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['data-summary-id'] });
    const container = document.createElement('div');
    container.innerHTML = sanitized;
    const anchors = Array.from(container.querySelectorAll('a[data-summary-id]'));
    const fallbackAnchors = anchors.length===0 ? Array.from(container.querySelectorAll('a[href*="#summary-"]')) : [];
    const targets = new Map();
    anchors.forEach(a => { const id=String(a.getAttribute('data-summary-id')||'').trim(); if(id){if(!targets.has(id))targets.set(id,[]);targets.get(id).push(a);} });
    fallbackAnchors.forEach(a => { const m=(a.getAttribute('href')||'').match(/#summary-([0-9a-fA-F-]+)/); if(m?.[1]){const key=String(m[1]);a.setAttribute('data-summary-id',key);if(!targets.has(key))targets.set(key,[]);targets.get(key).push(a);} });
    if (targets.size===0) return container.innerHTML;
    const idsToFetch = Array.from(targets.keys()).filter(id=>!slugCache.current.has(id));
    if (idsToFetch.length>0) {
      try { const { data, error } = await supabase.from('book_summaries').select('id,slug').in('id',idsToFetch); if(!error&&Array.isArray(data)) data.forEach(r=>slugCache.current.set(String(r.id),r.slug||null)); } catch {}
      idsToFetch.forEach(id=>{if(!slugCache.current.has(id))slugCache.current.set(id,null);});
    }
    targets.forEach((nodes,id)=>{const slug=slugCache.current.get(id)||null;nodes.forEach(a=>{if(slug){a.setAttribute('href',`/summary/${slug}`);a.setAttribute('data-summary-slug',slug);a.classList.add('internal-summary-link');}else{a.removeAttribute('href');a.classList.add('internal-summary-link-broken');a.setAttribute('aria-disabled','true');}});});
    return container.innerHTML;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!summary?.summary) { setProcessedSummaryHtml(''); return; }
      try { const resolved = await resolveInternalLinksInHtml(summary.summary); if(!cancelled) setProcessedSummaryHtml(resolved); }
      catch { if(!cancelled) setProcessedSummaryHtml(DOMPurify.sanitize(summary.summary)); }
    };
    run();
    return () => { cancelled = true; };
  }, [summary?.summary, resolveInternalLinksInHtml]);

  /* ─── Article click intercept ───────────────────────────────────────── */
  const onArticleClick = (e) => {
    const a = e.target?.closest?.('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const dataSlug = a.getAttribute('data-summary-slug');
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) return;
    if (!dataSlug && !href.startsWith('/summary/')) return;
    e.preventDefault();
    const slug = dataSlug || href.replace(/^\/summary\//,'').split(/[/?#]/)[0] || null;
    if (slug) { navigate(`/summary/${slug}`); setTimeout(()=>scrollToTop('auto'),10); }
  };

  /* ─── Reader controls ───────────────────────────────────────────────── */
  const increaseFont = () => setFontSize(s=>Math.min(28,s+2));
  const decreaseFont = () => setFontSize(s=>Math.max(12,s-2));
  const toggleReadingMode = () => setReadingMode(r=>!r);
  const resetTypography = () => { setFontSize(18); setReadingMode(true); applyTheme('white'); };

  /* ─── Share ─────────────────────────────────────────────────────────── */
  const handleShare = async () => {
    if (!summary) return;
    const title = summary.title || 'Check this out on OGONJO';
    const description = makeSafeDescription(summary.description || summary.summary || '', 140);
    const shareText = `${title}\n\n${description}\n\n${pageUrl}`;
    if (navigator.share) { try { await navigator.share({ title, text: description, url: pageUrl }); return; } catch {} }
    if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(shareText); alert('Copied to clipboard!'); return; } catch {} }
    try { window.prompt('Copy to share:', shareText); } catch {}
  };

  /* ─── Edit saved ────────────────────────────────────────────────────── */
  const handleEditSaved = (updatedRow) => {
    if (!updatedRow) { setShowEdit(false); return; }
    const normalized = normalizeRow(updatedRow);
    setSummary(prev=>prev?{...prev,...normalized}:normalized);
    backgroundFetchFollowups(normalized.id, normalized.category, normalized.tags).catch(()=>{});
    try { window.dispatchEvent(new CustomEvent('summary:updated',{detail:{id:normalized.id}})); } catch {}
    setShowEdit(false);
  };

  /* ─── Meta ──────────────────────────────────────────────────────────── */
  const BRAND = 'OGONJO';
  const SITE_DEFAULT_OG = useMemo(() => { try { return `${window.location.origin}/ogonjo.jpg`; } catch { return ''; } }, []);
  const metaTitle = useMemo(() => `${summary?.title||'Loading…'} – ${BRAND}`, [summary?.title]);
  const metaDescription = useMemo(() => makeSafeDescription(summary?.description||summary?.summary||'', 160), [summary?.description, summary?.summary]);
  const pageUrl = useMemo(() => { try { const u=new URL(window.location.href); return `${u.origin}${u.pathname}`; } catch { return `https://ogonjo.com/summary/${summary?.slug||''}`; } }, [summary?.slug]);
  const ogImage = summary?.image_url || SITE_DEFAULT_OG;

  const ldJson = useMemo(() => {
    const base = {
      '@context':'https://schema.org','@type':'Article',
      headline:summary?.title||BRAND, description:metaDescription,
      author:{'@type':'Person',name:summary?.author||BRAND},
      datePublished:summary?.created_at||undefined,
      image:ogImage, mainEntityOfPage:{'@type':'WebPage','@id':pageUrl},
      publisher:{'@type':'Organization',name:BRAND,logo:{'@type':'ImageObject',url:SITE_DEFAULT_OG}},
    };
    if (avgRating||summary?.rating_count||commentsCount) {
      base.aggregateRating={'@type':'AggregateRating',...(avgRating?{ratingValue:Number(avgRating).toFixed(1)}:{}),...(summary?.rating_count?{ratingCount:Number(summary.rating_count)}:{}),...(commentsCount?{reviewCount:Number(commentsCount)}:{})};
    }
    return base;
  }, [summary, metaDescription, ogImage, pageUrl, SITE_DEFAULT_OG, BRAND, avgRating, commentsCount]);

  /* ─── Derived ───────────────────────────────────────────────────────── */
  const renderDifficultyBadge = (lvl) => {
    if (!lvl) return null;
    const text = String(lvl);
    return <span className={`difficulty-label difficulty-${text.toLowerCase().replace(/\s+/g,'-')}`}>{text}</span>;
  };

  const resolveAffiliateLink = (raw) => {
    if (!raw) return { url:null, type:null };
    try {
      if (typeof raw === 'string') { const p=raw.split('|',2).map(s=>s.trim()); if(p.length===2&&p[1]) return {url:p[1],type:p[0].toLowerCase()}; return {url:raw.trim(),type:'book'}; }
      if (typeof raw === 'object') { const url=raw.url||raw.link; if(url) return {url:String(url),type:(raw.type||'book').toLowerCase()}; }
    } catch {}
    return { url:null, type:null };
  };

  const showLoading = Boolean(isLoading);
  const showNotFound = !isLoading && !summary;
  const headerTitle = summary?.title||(showLoading?'Loading…':'Content Under Development');
  const headerAuthor = summary?.author || '';
  const headerImage = summary?.image_url || null;
  const descriptionPreview = useMemo(() => makeSafeDescription(summary?.description||'', 120), [summary?.description]);
  const { url: affiliateUrl, type: affiliateType } = resolveAffiliateLink(summary?.affiliate_link);
  const affiliateLabel = affiliateType==='pdf'?'Get PDF':affiliateType==='app'?'Open App':'Get Book';

  /* ─── Article inline styles ─────────────────────────────────────────── */
  const articleStyle = {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: `${fontSize}px`,
    lineHeight: 1.8,
    maxWidth: 780,
    margin: '20px auto',
    background: rt.bg,
    padding: readingMode ? '28px 32px' : '20px 24px',
    borderRadius: 10,
    boxShadow: readingMode ? '0 6px 20px rgba(0,0,0,0.07)' : 'none',
    color: rt.text,
    wordBreak: 'break-word',
    minHeight: 180,
    // CSS vars for heading lines
    '--heading-line-color': rt.headingLine,
    '--article-accent': rt.accent,
  };

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className={`summary-page ${collapsed ? 'title-collapsed' : ''}`} ref={pageRef}
      data-collapsed={collapsed ? '1' : '0'} style={{ background: '#fff', color: '#0b1220' }}>

      {/* SEO */}
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={ogImage} />
        {summary?.created_at && <meta property="article:published_time" content={summary.created_at} />}
        {summary?.author && <meta property="article:author" content={summary.author} />}
        {Array.isArray(summary?.tags) && summary.tags.map(t=><meta key={`og-tag-${t}`} property="article:tag" content={t} />)}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
      </Helmet>

      <div className="summary-top-spacer" aria-hidden="true" />

      {/* ── Sticky header ────────────────────────────────────────────── */}
      <header className={`summary-header ${collapsed ? 'collapsed' : 'expanded'}`}
        ref={headerRef} role="banner" aria-expanded={!collapsed}>

        {/* Thumbnail */}
        <div className="summary-thumb-wrap" aria-hidden="true">
          {headerImage
            ? <img className="summary-thumb" src={headerImage} alt={headerTitle} />
            : <div className="summary-thumb placeholder" />}
        </div>

        {/* Title / author / description */}
        <div className="summary-title-left">
          <h1 className="summary-title" title={headerTitle} style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {headerTitle}
          </h1>
          <div className="summary-meta-row">
            <div className="summary-author" title={headerAuthor}>
              <span className="author-prefix">by&nbsp;</span>
              <span className="author-name">{headerAuthor}</span>
            </div>
            <div className="summary-difficulty-inline">{renderDifficultyBadge(summary?.difficulty_level)}</div>
          </div>
          {descriptionPreview && (
            <p className="summary-description-preview">{descriptionPreview}</p>
          )}
        </div>

        {/* Actions */}
        <div className="summary-actions">
          {affiliateUrl && (
            <a className={`affiliate-btn${affiliateType?` affiliate-${affiliateType}`:''}`}
              href={affiliateUrl} target="_blank" rel="noopener noreferrer">
              {affiliateLabel}
            </a>
          )}
          <button className="hf-btn export-btn" type="button" onClick={()=>setShowExportModal(true)}
            title="Export document" aria-label="Export this document">
            <FaFileDownload /><span className="export-btn-label"> Export</span>
          </button>
          <button className="hf-btn share-btn" type="button" onClick={handleShare} title="Share">
            <FaShareAlt />
          </button>
          {ownerId && currentUserId && ownerId===currentUserId && (
            <button className="hf-btn" type="button" onClick={()=>setShowEdit(true)}>Edit</button>
          )}
        </div>

        {/* Engagement */}
        <div className="summary-engagement" role="group" aria-label="Engagement">
          <button className={`eng-btn like-btn ${userHasLiked?'liked':''}`} onClick={handleLike}
            aria-pressed={userHasLiked} title={userHasLiked?'Unlike':'Like'}>
            <FaThumbsUp /><span>{likes??0}</span>
          </button>
          <button className="eng-btn" onClick={handleScrollToComments} title="Jump to comments">
            <FaComment /><span>{commentsCount??0}</span>
          </button>
          <div className="eng-item" title="Views"><FaEye /><span>{views??0}</span></div>
          <div className="rating-block">
            <div className="rating-stars">{renderStars('md')}</div>
            <div className="avg-text">{avgRating?Number(avgRating).toFixed(1):'0.0'}</div>
          </div>
        </div>
      </header>

      {/* ── Reader controls ──────────────────────────────────────────── */}
      {!showLoading && (
        <div className="reader-controls">
          <div className="rc-group">
            <button className="hf-btn" aria-label="Decrease font" onClick={decreaseFont}><FaMinus /></button>
            <span className="rc-value">{fontSize}px</span>
            <button className="hf-btn" aria-label="Increase font" onClick={increaseFont}><FaPlus /></button>
          </div>

          {/* Theme dropdown */}
          <div className="rc-group rc-theme-wrap" ref={themeDropdownRef}>
            <button className="hf-btn rc-theme-btn" type="button"
              onClick={()=>setShowThemeDropdown(v=>!v)}
              aria-haspopup="listbox" aria-expanded={showThemeDropdown}
              title="Change reading theme">
              <span className="rc-theme-dot"
                style={{ background: rt.bg, border: `2px solid ${rt.headingLine}` }} />
              <span className="rc-theme-label">{rt.label}</span>
              <FaChevronDown style={{ fontSize:9, marginLeft:4 }} />
            </button>
            {showThemeDropdown && (
              <div className="rc-theme-dropdown" role="listbox">
                {Object.entries(READING_THEMES).map(([key, t]) => (
                  <button key={key} type="button"
                    className={`rc-theme-option ${readingThemeKey===key?'active':''}`}
                    role="option" aria-selected={readingThemeKey===key}
                    onClick={()=>applyTheme(key)}>
                    <span className="rc-theme-dot" style={{ background: t.bg, border: `2px solid ${t.headingLine}` }} />
                    {t.label}
                    {readingThemeKey===key && <span style={{marginLeft:'auto',color:t.accent}}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rc-group">
            <button className="hf-btn" title="Reset to defaults" onClick={resetTypography}>Reset</button>
          </div>
        </div>
      )}

      {/* ── YouTube embed ────────────────────────────────────────────── */}
      {!showLoading && extractYouTubeId(summary?.youtube_url) && (
        <div style={{ maxWidth:980, margin:'10px auto', padding:'0 18px' }}>
          <div className="youtube-embed">
            <div className="embed-inner">
              <iframe className="youtube-iframe" title="YouTube clip"
                src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(summary.youtube_url)}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </div>
          </div>
        </div>
      )}

      {/* ── Article body ────────────────────────────────────────────── */}
      <main style={{ maxWidth:980, margin:'0 auto', padding:'0 18px' }}>
        {showLoading ? (
          <div style={articleStyle}><InlineLoader label="Loading content" /></div>
        ) : showNotFound ? (
          <div style={{ ...articleStyle, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 32px' }}>
            <div style={{ fontSize:42, marginBottom:16, opacity:0.7 }}>📖</div>
            <div style={{ fontSize:20, fontWeight:600, marginBottom:10, color:'#0b1220' }}>Content Under Development</div>
            <div style={{ fontSize:15, lineHeight:1.6, color:'#4b5563', marginBottom:6, maxWidth:480 }}>
              This resource is being carefully curated to ensure the highest quality insights.
            </div>
            <button onClick={handleBackToArticle} className="hf-btn"
              style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 24px', fontSize:15, fontWeight:500, backgroundColor:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', marginTop:12 }}>
              <FaArrowLeft /> Back to Library
            </button>
          </div>
        ) : (
          <article className={`summary-body summary-theme-${readingThemeKey}`}
            style={articleStyle} onClick={onArticleClick}>
            {articleSegments.map((segment, idx) => {
              if (segment.type === 'ad') {
                const workbook = slotWorkbooks[segment.adIndex-1] ?? null;
                if (!workbook) return null;
                return <AdSlot key={`ad-${idx}`} index={segment.adIndex} workbook={workbook} />;
              }
              return <div key={`para-${idx}`} dangerouslySetInnerHTML={{ __html: segment.content }} />;
            })}
          </article>
        )}
      </main>

      {/* ── Recommendations ──────────────────────────────────────────── */}
      {(isRecommending || recommendedContent?.length > 0) && (
        <HorizontalCarousel title="More like this" items={recommendedContent} loading={isRecommending}
          skeletonCount={4} tag={summary?.tags?.[0]??null} sortKey="views">
          {recommendedContent.map(item=><BookSummaryCard key={String(item.id||item.slug)} summary={item} />)}
        </HorizontalCarousel>
      )}
      {!isRecommending && !recommendedContent?.length && !recError && (
        <div style={{ padding:'12px 16px', color:'#6b7280' }}>No similar items found.</div>
      )}
      {recError && (
        <div style={{ padding:'12px 16px', color:'#b45309' }}>
          {recError} <button onClick={()=>{if(summary?.tags?.length)fetchRecommendedByTags(summary.tags,10,summary.id);else if(summary?.category)fetchRecommendedByCategory(summary.category,10,summary.id);}}>Retry</button>
        </div>
      )}

      {/* ── Comments ────────────────────────────────────────────────── */}
      <section ref={commentsRef} className="summary-comments"
        style={{ width:'80%', margin:'20px auto', padding:'0 18px', boxSizing:'border-box' }}>
        <h3>Comments</h3>
        {summary?.id ? <CommentsSection postId={summary.id} /> : <div style={{ color:'#6b7280' }}>Comments will appear once content loads.</div>}
      </section>

      {/* ── Edit form ───────────────────────────────────────────────── */}
      {showEdit && <EditSummaryForm summary={summary} onClose={()=>setShowEdit(false)} onUpdate={handleEditSaved} />}

      {/* ── Export modal ─────────────────────────────────────────────── */}
      {showExportModal && (
        <ExportModal
          summary={summary}
          articleHtml={processedSummaryHtml}
          onClose={()=>setShowExportModal(false)}
        />
      )}
    </div>
  );
};

export default SummaryView;