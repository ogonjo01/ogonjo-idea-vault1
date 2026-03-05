// src/components/EditSummaryForm/EditSummaryForm.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactQuill from 'react-quill';
import Quill from 'quill';
import slugify from 'slugify';
import { supabase } from '../../supabase/supabaseClient';
import 'react-quill/dist/quill.snow.css';
import './EditSummaryForm.css';

const categories = [
  "Apps","Best Books","Book Summaries","Business Concepts","Business Giants",
  "Business Ideas","Business Legends","Business Strategy & Systems","Career Development",
  "Companies & Organizations","Concepts","Concepts Abbreviations","Courses & Learning Paths",
  "Digital Skills & Technology","Entrepreneurship","Leadership & Management","Marketing & Sales",
  "Markets & Geography","Mindset & Motivation","Money & Productivity","People","Quotes",
  "Self-Improvement","Strategic Communication","Tools & Software","Video Insights"
];

const DIFFICULTIES = [
  { value: "", label: "Not specified (optional)" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" }
];

const quillFormats = ['header','bold','italic','underline','strike','list','bullet','blockquote','code-block','link','image'];
const KEYWORDS_LIMIT = 8;

const normalize = (s = '') => String(s || '').trim().toLowerCase();
const uniqueWords = (s = '') => Array.from(new Set(normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)));

function wordMatchScore(a = '', b = '') {
  const aw = uniqueWords(a); const bw = uniqueWords(b);
  if (!aw.length || !bw.length) return 0;
  return aw.filter(w => bw.includes(w)).length / Math.max(aw.length, bw.length);
}

function longestCommonSubstringRatio(a = '', b = '') {
  const A = String(a || ''), B = String(b || '');
  const n = A.length, m = B.length;
  if (!n || !m) return 0;
  const dp = new Array(m + 1).fill(0); let best = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = m; j >= 1; j--) {
      if (A[i-1] === B[j-1]) { dp[j] = dp[j-1] + 1; if (dp[j] > best) best = dp[j]; } else dp[j] = 0;
    }
  }
  return best / Math.max(n, m);
}

function combinedScore(candidateTitle = '', query = '') {
  return Math.min(1, 0.55 * wordMatchScore(candidateTitle, query) + 0.35 * longestCommonSubstringRatio(candidateTitle, query) + 0.10 * (normalize(candidateTitle).startsWith(normalize(query)) ? 1 : 0));
}

const pluralVariants = (word = '') => {
  const w = normalize(word); if (!w) return [w];
  const v = new Set([w]);
  if (!w.endsWith('s')) v.add(`${w}s`);
  if (!w.endsWith('es')) v.add(`${w}es`);
  if (w.endsWith('s')) v.add(w.replace(/s+$/, ''));
  return Array.from(v);
};

const parseAffiliateValue = (raw) => {
  if (!raw) return { type: null, url: null };
  try {
    if (typeof raw === 'string') {
      const parts = raw.split('|').map(p => p.trim());
      if (parts.length === 2 && parts[1]) return { type: (parts[0] || 'book').toLowerCase(), url: parts[1] };
      if (raw.trim()) return { type: 'book', url: raw.trim() };
      return { type: null, url: null };
    }
    if (typeof raw === 'object' && raw !== null) {
      if (raw.url) return { type: (raw.type || 'book').toLowerCase(), url: String(raw.url).trim() };
      if (raw.link) return { type: (raw.type || 'book').toLowerCase(), url: String(raw.link).trim() };
    }
  } catch (e) {}
  return { type: null, url: null };
};

function parseKeywordsCSV(input, max = KEYWORDS_LIMIT) {
  if (!input) return [];
  const seen = new Set(); const uniq = [];
  for (const k of String(input).split(',').map(k => k.trim().toLowerCase()).filter(Boolean)) {
    if (!seen.has(k)) { seen.add(k); uniq.push(k); if (uniq.length >= max) break; }
  }
  return uniq;
}

// KEY CHANGE: build /library/ href from a row (prefers slug, falls back to id)
const toLibraryHref = (row) => row && row.slug ? `/library/${row.slug}` : `/library/${row && row.id}`;

const EditSummaryForm = ({ summary = {}, onClose = () => {}, onUpdate = () => {} }) => {
  const [title, setTitle] = useState(summary.title || '');
  const [slug, setSlug] = useState(summary.slug || '');
  const [author, setAuthor] = useState(summary.author || '');
  const [description, setDescription] = useState(summary.description || '');
  const [summaryText, setSummaryText] = useState(summary.summary || '');
  const [category, setCategory] = useState(summary.category || categories[0]);
  const [imageUrl, setImageUrl] = useState(summary.image_url || '');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [affiliateType, setAffiliateType] = useState('book');
  const [youtubeUrl, setYoutubeUrl] = useState(summary.youtube_url || '');
  const [tags, setTags] = useState(Array.isArray(summary.tags) ? summary.tags.map(t => String(t).trim().toLowerCase()) : []);
  const [tagInput, setTagInput] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [editedKeywords, setEditedKeywords] = useState(false);
  const [difficulty, setDifficulty] = useState(summary.difficulty_level || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const initialIdRef = useRef(null);
  useEffect(() => { initialIdRef.current = summary && summary.id ? summary.id : null; }, [summary && summary.id]);

  useEffect(() => {
    setTitle(summary.title || ''); setSlug(summary.slug || ''); setAuthor(summary.author || '');
    setDescription(summary.description || ''); setSummaryText(summary.summary || '');
    setCategory(summary.category || categories[0]); setImageUrl(summary.image_url || '');
    setYoutubeUrl(summary.youtube_url || '');
    setTags(Array.isArray(summary.tags) ? summary.tags.map(t => String(t).trim().toLowerCase()) : []);
  }, [summary.id]);

  const portalElRef = useRef(null);
  const quillRef = useRef(null);
  const [showInternalLinkModal, setShowInternalLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [selectedRangeForLink, setSelectedRangeForLink] = useState(null);

  useEffect(() => {
    const parsed = parseAffiliateValue(summary.affiliate_link);
    if (parsed && parsed.url) { setAffiliateLink(parsed.url); setAffiliateType(parsed.type || 'book'); }
    else { setAffiliateLink(''); setAffiliateType('book'); }
  }, [summary.affiliate_link]);

  useEffect(() => { setDifficulty(summary.difficulty_level || ''); }, [summary.difficulty_level]);

  useEffect(() => {
    const raw = summary && summary.keywords;
    let incoming = [];
    try {
      if (Array.isArray(raw)) incoming = raw.map(k => String(k || '').trim().toLowerCase()).filter(Boolean);
      else if (raw == null) incoming = [];
      else if (typeof raw === 'string') {
        try { const p = JSON.parse(raw); incoming = Array.isArray(p) ? p.map(k => String(k || '').trim().toLowerCase()).filter(Boolean) : raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean); }
        catch { incoming = raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean); }
      }
    } catch (e) { incoming = []; }
    const uniq = Array.from(new Set(incoming)).slice(0, KEYWORDS_LIMIT);
    setKeywords(uniq); setKeywordInput(uniq.length ? uniq.join(', ') : ''); setEditedKeywords(false);
  }, [summary && summary.keywords, summary && summary.id]);

  useEffect(() => {
    if (initialIdRef.current) return;
    if (!title) { setSlug(''); return; }
    setSlug(slugify(title, { lower: true, replacement: '-', strict: true }));
  }, [title]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'edit-summary-portal';
    document.body.appendChild(el);
    portalElRef.current = el;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow || '';
      if (portalElRef.current) { document.body.removeChild(portalElRef.current); portalElRef.current = null; }
    };
  }, []);

  const normalizeTag = t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).trim().toLowerCase());
  const addTagFromInput = (raw = '') => {
    const value = (raw || tagInput || '').trim(); if (!value) return;
    const parts = value.split(',').map(p => normalizeTag(p)).filter(Boolean);
    setTags(prev => Array.from(new Set([...(prev || []), ...parts])).slice(0, 20));
    setTagInput('');
  };
  const handleTagKey = e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromInput(); } else if (e.key === 'Backspace' && !tagInput) setTags(prev => prev && prev.length ? prev.slice(0,-1) : []); };
  const removeTag = t => setTags(prev => (prev || []).filter(x => x !== t));

  const addKeywordFromInput = (raw = '') => {
    const value = (raw || keywordInput || '').trim(); if (!value) return;
    const parts = value.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
    setKeywords(prev => {
      const s = new Set(prev || []);
      for (const p of parts) { if (s.size >= KEYWORDS_LIMIT) break; s.add(p); }
      const out = Array.from(s);
      if (JSON.stringify(out) !== JSON.stringify(prev || [])) setEditedKeywords(true);
      return out;
    });
    setKeywordInput('');
  };
  const handleKeywordKey = e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeywordFromInput(); }
    else if (e.key === 'Backspace' && !keywordInput) { setKeywords(prev => { const out = prev && prev.length ? prev.slice(0,-1) : []; setEditedKeywords(true); return out; }); }
    else if (!editedKeywords) setEditedKeywords(true);
  };
  const removeKeyword = k => { setKeywords(prev => { const out = (prev || []).filter(x => x !== k); setEditedKeywords(true); return out; }); };
  const parsedKeywordsPreview = useMemo(() => (Array.isArray(keywords) ? keywords.slice(0, KEYWORDS_LIMIT) : []), [keywords]);

  const validate = () => { setErrorMsg(''); if (!title.trim()) return 'Title is required'; if (!author.trim()) return 'Author is required'; if (!category) return 'Category is required'; return null; };

  const extractYouTubeId = (url = '') => { if (!url) return null; const m = url.match(/[?&]v=([0-9A-Za-z_-]{11})/) || url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/) || url.match(/\/embed\/([0-9A-Za-z_-]{11})/); return m ? m[1] : null; };
  const youtubeId = extractYouTubeId(youtubeUrl);

  useEffect(() => { try { const icons = Quill.import('ui/icons'); icons.internalLink = '<svg viewBox="0 0 18 18"><path d="M7 7h4v1H7z"/></svg>'; } catch (e) {} }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [[{ header: [1,2,3,false] }],['bold','italic','underline','strike'],[{ list:'ordered' },{ list:'bullet' }],['blockquote','code-block'],['link','image'],['internalLink'],['clean']],
      handlers: {
        internalLink: function() {
          const editor = quillRef.current && quillRef.current.getEditor ? quillRef.current.getEditor() : null;
          if (!editor) return;
          const range = editor.getSelection();
          if (!range || range.length === 0) { alert('Select the text you want to link, then click "Link to summary".'); return; }
          setSelectedRangeForLink(range); setShowInternalLinkModal(true);
        }
      }
    },
    clipboard: { matchVisual: false }
  }), []);

  // Search — fetch slug too
  useEffect(() => {
    let cancelled = false;
    if (!linkSearch || !linkSearch.trim()) { setLinkResults([]); return; }
    (async () => {
      const { data, error } = await supabase.from('book_summaries').select('id, title, slug').ilike('title', '%' + linkSearch + '%').limit(10);
      if (!cancelled) setLinkResults(error ? [] : (data || []));
    })();
    return () => { cancelled = true; };
  }, [linkSearch]);

  // insertInternalLink — href now uses /library/slug
  const insertInternalLink = (summaryItem) => {
    const editor = quillRef.current && quillRef.current.getEditor ? quillRef.current.getEditor() : null;
    if (!editor) return;
    const range = selectedRangeForLink || editor.getSelection();
    if (!range) { alert('Unable to determine selection.'); setShowInternalLinkModal(false); return; }
    editor.focus(); editor.setSelection(range.index, range.length);
    const selectedText = (range.length && editor.getText(range.index, range.length).trim()) || summaryItem.title || 'link';
    const linkHref = toLibraryHref(summaryItem);
    editor.deleteText(range.index, range.length);
    editor.insertText(range.index, selectedText, { link: linkHref }, 'user');
    try {
      const leaf = editor.getLeaf(range.index);
      const domNode = leaf && leaf[0] && leaf[0].domNode;
      const anchor = domNode && domNode.parentElement && domNode.parentElement.tagName === 'A' ? domNode.parentElement : null;
      if (anchor) { anchor.setAttribute('data-summary-id', summaryItem.id); anchor.classList.add('internal-summary-link'); anchor.setAttribute('href', linkHref); }
      else {
        const safe = selectedText.replace(/</g,'&lt;').replace(/>/g,'&gt;');
        editor.deleteText(range.index, selectedText.length);
        editor.clipboard.dangerouslyPasteHTML(range.index, '<a data-summary-id="' + summaryItem.id + '" class="internal-summary-link" href="' + linkHref + '">' + safe + '</a>');
      }
    } catch (err) {
      const safe = selectedText.replace(/</g,'&lt;').replace(/>/g,'&gt;');
      try { editor.deleteText(range.index, selectedText.length); } catch(e) {}
      editor.clipboard.dangerouslyPasteHTML(range.index, '<a data-summary-id="' + summaryItem.id + '" class="internal-summary-link" href="' + linkHref + '">' + safe + '</a>');
    }
    editor.setSelection(range.index + selectedText.length, 0);
    setShowInternalLinkModal(false); setLinkSearch(''); setLinkResults([]); setSelectedRangeForLink(null);
  };

  // DB helpers — include slug
  const fetchTitleCandidates = async (text, limit) => {
    const q = String(text || '').trim(); if (!q) return [];
    try { const { data, error } = await supabase.from('book_summaries').select('id, title, slug, keywords').ilike('title', '%' + q + '%').limit(limit || 200); return error ? [] : (data || []); } catch (e) { return []; }
  };

  const fetchKeywordRows = async (limit) => {
    try { const { data, error } = await supabase.from('book_summaries').select('id, title, slug, keywords').not('keywords', 'is', null).limit(limit || 800); return error ? [] : (data || []); } catch (e) { return []; }
  };

  // searchBestMatch — include slug
  const searchBestMatch = async (text, opts) => {
    const q = String(text || '').trim(); if (!q) return null;
    const minScore = (opts && opts.minScore != null) ? opts.minScore : 0.5;
    const limitCandidates = (opts && opts.limitCandidates) ? opts.limitCandidates : 40;
    try { const { data: exact } = await supabase.from('book_summaries').select('id, title, slug').ilike('title', q).maybeSingle(); if (exact && exact.id) return exact; } catch (e) {}
    try { const { data: phrase } = await supabase.from('book_summaries').select('id, title, slug').ilike('title', '%' + q + '%').limit(1).maybeSingle(); if (phrase && phrase.id) return phrase; } catch (e) {}
    const tokens = uniqueWords(q).slice(0, 6); if (!tokens.length) return null;
    const orFilters = tokens.map(t => 'title.ilike.%' + t + '%').join(',');
    try {
      const { data: candidates = [] } = await supabase.from('book_summaries').select('id, title, slug').or(orFilters).limit(limitCandidates);
      if (!candidates || !candidates.length) return null;
      const singleWord = q.split(/\s+/).length === 1;
      const qVariants = singleWord ? pluralVariants(q) : [normalize(q)];
      let best = null, bestScore = 0;
      candidates.forEach(c => {
        const score = combinedScore(c.title || '', q);
        if (singleWord && !qVariants.some(v => uniqueWords(c.title || '').includes(v))) return;
        if (score > bestScore) { bestScore = score; best = c; }
      });
      if (best && bestScore >= minScore) return best;
      return (best && bestScore > 0.25) ? best : null;
    } catch (e) { return null; }
  };

  // Helper: wrap node in anchor with /library/ href
  const wrapNodeInAnchor = (node, row) => {
    const linkHref = toLibraryHref(row);
    try {
      if (node.closest && node.closest('a')) return false;
      const a = document.createElement('a');
      a.setAttribute('data-summary-id', row.id);
      a.setAttribute('href', linkHref);
      a.className = 'internal-summary-link';
      a.innerHTML = node.innerHTML;
      node.parentNode.replaceChild(a, node);
      return true;
    } catch (err) { return false; }
  };

  const removeLinksAndMakeBold = () => {
    const editor = quillRef.current && quillRef.current.getEditor ? quillRef.current.getEditor() : null;
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const anchors = Array.from(container.querySelectorAll('a[data-summary-id], a[href^="#summary-"], a[href^="/library/"]'));
      if (!anchors.length) { alert('No internal links found.'); return; }
      anchors.forEach(a => { const strong = document.createElement('strong'); strong.innerHTML = a.innerHTML; a.parentNode.replaceChild(strong, a); });
      const delta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(delta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert('Removed ' + anchors.length + ' link(s) and bolded the text.');
    } catch (err) { alert('Could not remove links automatically. See console.'); }
  };

  const autoLinkBoldedPhrases = async () => {
    const editor = quillRef.current && quillRef.current.getEditor ? quillRef.current.getEditor() : null;
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const phrases = Array.from(new Set(boldNodes.map(n => (n.textContent || '').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 40);
      if (!phrases.length) { alert('No bolded phrases found.'); return; }
      const mapping = {};
      for (const phrase of phrases) { try { mapping[phrase] = await searchBestMatch(phrase, { limitCandidates: 40, minScore: 0.5 }); } catch (e) { mapping[phrase] = null; } }
      let linkedCount = 0;
      boldNodes.forEach(node => {
        const text = (node.textContent || '').trim();
        const match = mapping[text];
        if (match && match.id) { if (wrapNodeInAnchor(node, match)) linkedCount++; }
      });
      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert('Auto-link completed. ' + linkedCount + ' phrase(s) linked.');
    } catch (err) { alert('Auto-link failed. See console.'); }
  };

  const autoLinkBoldToSlug = () => {
    const editor = quillRef.current && quillRef.current.getEditor ? quillRef.current.getEditor() : null;
    if (!editor) { alert('Editor not ready'); return; }
    const range = editor.getSelection();
    if (!range || range.length === 0) { alert('Please select the text you want to link.'); return; }
    let selectedText = '';
    try { selectedText = editor.getText(range.index, range.length).trim(); } catch (e) {}
    if (!selectedText) { alert('Selected text is empty.'); return; }
    const generatedSlug = slugify(selectedText, { lower: true, strict: true, replacement: '-' });
    if (!generatedSlug) { alert('Could not generate slug.'); return; }
    try { editor.focus(); editor.deleteText(range.index, range.length); editor.insertText(range.index, selectedText, { link: '/library/' + generatedSlug }, 'user'); } catch (e) {}
    const tryAttach = (attempt) => {
      attempt = attempt || 0;
      try {
        const leaf = editor.getLeaf(range.index);
        const domNode = leaf && leaf[0] && leaf[0].domNode;
        const anchor = domNode && domNode.parentElement && domNode.parentElement.tagName === 'A' ? domNode.parentElement : null;
        if (anchor) { anchor.classList.add('slug-summary-link'); anchor.setAttribute('href', '/library/' + generatedSlug); anchor.setAttribute('data-slug', generatedSlug); return; }
      } catch (e) {}
      if (attempt < 4) { setTimeout(function() { tryAttach(attempt + 1); }, 30 * (attempt + 1)); return; }
      try { const safe = selectedText.replace(/</g,'&lt;').replace(/>/g,'&gt;'); try { editor.deleteText(range.index, selectedText.length); } catch(e) {} editor.clipboard.dangerouslyPasteHTML(range.index, '<a class="slug-summary-link" data-slug="' + generatedSlug + '" href="/library/' + generatedSlug + '">' + safe + '</a>'); } catch (e) {}
    };
    tryAttach(0);
    try { editor.setSelection(range.index + selectedText.length, 0); } catch (e) {}
    try { setSummaryText(editor.root.innerHTML); } catch (e) {}
    alert('Linked selection to /library/' + generatedSlug);
  };

  const autoLinkBoldExact = async () => {
    const editor = quillRef.current && quillRef.current.getEditor ? quillRef.current.getEditor() : null;
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const phrases = Array.from(new Set(boldNodes.map(n => (n.textContent || '').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 200);
      if (!phrases.length) { alert('No bolded phrases found.'); return; }
      let linkedCount = 0;
      for (const phrase of phrases) {
        try {
          const variants = pluralVariants(phrase);
          let matched = null;
          for (const c of await fetchTitleCandidates(phrase, 200)) { if (!c || !c.title) continue; const nt = normalize(c.title); if (nt === normalize(phrase) || variants.includes(nt)) { matched = c; break; } }
          if (!matched) { for (const c of await fetchKeywordRows(400)) { if (!c || !c.title) continue; const nt = normalize(c.title); if (nt === normalize(phrase) || variants.includes(nt)) { matched = c; break; } } }
          if (!matched || !matched.id) continue;
          boldNodes.forEach(node => { if (normalize((node.textContent || '').trim()) !== normalize(phrase)) return; if (wrapNodeInAnchor(node, matched)) linkedCount++; });
        } catch (err) {}
      }
      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert('Exact auto-link complete — ' + linkedCount + ' item(s) linked.');
    } catch (err) { alert('Exact auto-link failed. See console.'); }
  };

  const autoLinkBoldKeywords = async () => {
    const editor = quillRef.current && quillRef.current.getEditor ? quillRef.current.getEditor() : null;
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const uniquePhrases = Array.from(new Set(boldNodes.map(n => (n.textContent || '').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 200);
      if (!uniquePhrases.length) { alert('No bolded phrases found.'); return; }
      let keywordSample = [];
      try { keywordSample = await fetchKeywordRows(800); } catch (e) {}
      let linkedCount = 0;
      for (const phrase of uniquePhrases) {
        try {
          const tokens = uniqueWords(phrase);
          const normalizedTokens = tokens.map(t => normalize(t));
          const titleCandidates = await fetchTitleCandidates(phrase, 200);
          const keywordCandidates = keywordSample.filter(r => { try { if (!r || !r.keywords) return false; const kws = r.keywords.map(k => normalize(String(k || ''))); return normalizedTokens.some(t => kws.includes(t) || kws.some(k => k.includes(t))) || kws.includes(normalize(phrase)); } catch (e) { return false; } });
          const byId = new Map();
          titleCandidates.forEach(c => { if (c && c.id) byId.set(c.id, c); });
          keywordCandidates.forEach(c => { if (c && c.id && !byId.has(c.id)) byId.set(c.id, c); });
          const merged = Array.from(byId.values()); if (!merged.length) continue;
          let best = null, bestScore = 0;
          for (const c of merged) {
            try {
              let score = combinedScore(c.title || '', phrase);
              if (normalize(c.title) === normalize(phrase)) score = Math.max(score, 0.95);
              if (Array.isArray(c.keywords)) {
                const kws = c.keywords.map(k => normalize(String(k || '')));
                if (kws.includes(normalize(phrase))) score = Math.max(score, score + 0.6);
                else { const matches = normalizedTokens.filter(t => kws.some(k => k === t || k.includes(t))).length; if (matches > 0) score += Math.min(0.35, 0.12 * matches); }
              }
              if (score > 1) score = 1;
              if (score > bestScore) { bestScore = score; best = c; }
            } catch (e) {}
          }
          if (!best || !best.id || bestScore < 0.65) continue;
          boldNodes.forEach(node => { if (normalize((node.textContent || '').trim()) !== normalize(phrase)) return; if (wrapNodeInAnchor(node, best)) linkedCount++; });
        } catch (err) {}
      }
      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert('Keyword auto-link complete — ' + linkedCount + ' item(s) linked.');
    } catch (err) { alert('Keyword auto-link failed. See console.'); }
  };

  const resetAndAutoRelink = async () => {
    if (!confirm('This will remove existing internal links, make them bold, then attempt to auto-link bolded phrases. Continue?')) return;
    removeLinksAndMakeBold();
    await new Promise(r => setTimeout(r, 140));
    await autoLinkBoldedPhrases();
  };

  const copyContentId = async () => {
    if (!summary.id) return;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(summary.id);
      else { const ta = document.createElement('textarea'); ta.value = summary.id; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      alert('Content ID copied to clipboard');
    } catch (e) { alert('Failed to copy ID'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setLoading(true); setErrorMsg('');
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData && authData.user ? authData.user : null;
      if (!user) { setErrorMsg('You must be signed in.'); setLoading(false); return; }
      const affiliateValue = affiliateLink && affiliateLink.trim() ? ((affiliateType || 'book').toLowerCase() + '|' + affiliateLink.trim()) : null;
      const difficultyToSave = ['Beginner','Intermediate','Advanced'].includes(difficulty) && difficulty.trim() ? difficulty : null;
      const payload = {
        title: title.trim(), author: author.trim(), description: description.trim() || null,
        summary: summaryText || null, category: category || null,
        image_url: imageUrl || null, affiliate_link: affiliateValue,
        youtube_url: youtubeUrl || null, tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
        difficulty_level: difficultyToSave,
      };
      if (!initialIdRef.current) { const pk = keywords && keywords.length ? keywords.slice(0, KEYWORDS_LIMIT) : []; payload.keywords = pk.length ? pk : null; }
      else if (editedKeywords) { const pk = keywords && keywords.length ? keywords.slice(0, KEYWORDS_LIMIT) : []; payload.keywords = pk.length ? pk : null; }
      if (!initialIdRef.current) payload.slug = slug || null;

      let resultData = null;
      if (initialIdRef.current) {
        const { data, error } = await supabase.from('book_summaries').update(payload).eq('id', initialIdRef.current).select().maybeSingle();
        if (error) { setErrorMsg(error.message || 'Failed to update'); setLoading(false); return; }
        resultData = data || null;
      } else {
        const { data, error } = await supabase.from('book_summaries').insert([Object.assign({}, payload)]).select().maybeSingle();
        if (error) { setErrorMsg(error.message || 'Failed to create'); setLoading(false); return; }
        resultData = data || null;
      }

      if (resultData) {
        const dbKeywords = Array.isArray(resultData.keywords) ? resultData.keywords.map(k => String(k || '').trim().toLowerCase()).filter(Boolean) : (typeof resultData.keywords === 'string' ? parseKeywordsCSV(resultData.keywords) : []);
        const uniq = Array.from(new Set(dbKeywords)).slice(0, KEYWORDS_LIMIT);
        setKeywords(uniq); setKeywordInput(uniq.length ? uniq.join(', ') : ''); setEditedKeywords(false);
      }

      setLoading(false);
      if (typeof onUpdate === 'function') onUpdate(resultData);
      if (typeof onClose === 'function') onClose();
    } catch (err) { console.error('Unexpected edit error', err); setErrorMsg('Unexpected error. Check console.'); setLoading(false); }
  };

  if (!portalElRef.current) return null;

  const modal = (
    <div className="modal-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content edit-large" role="dialog" aria-modal="true" aria-label="Edit Summary" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">&times;</button>
        <h2>{initialIdRef.current ? 'Edit Summary' : 'Create Summary'}</h2>

        <form onSubmit={handleSubmit} className="summary-form">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required />
          <small className="slug-preview">Slug preview: <code>{slug || '(will be generated)'}</code></small>

          {summary.id && (
            <div style={{ marginTop:6, marginBottom:8 }}>
              <small>Content ID: <code style={{ wordBreak:'break-all' }}>{summary.id}</code></small>{' '}
              <button type="button" className="hf-btn" onClick={copyContentId} style={{ marginLeft:8 }}>Copy ID</button>
            </div>
          )}

          <label htmlFor="author">Author</label>
          <input id="author" type="text" value={author} onChange={e => setAuthor(e.target.value)} required />

          <label htmlFor="category">Category</label>
          <select id="category" value={category} onChange={e => setCategory(e.target.value)} required>
            {categories.map(c => <option value={c} key={c}>{c}</option>)}
          </select>

          <label htmlFor="difficulty">Difficulty level (optional)</label>
          <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          <label htmlFor="description">Short description (feed preview)</label>
          <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short 1-2 sentence description" />

          <label htmlFor="imageUrl">Cover image URL</label>
          <input id="imageUrl" type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />

          <label htmlFor="affiliateLink">Affiliate link</label>
          <div className="affiliate-row-edit" style={{ display:"flex", gap:8, alignItems:"center", width:"100%", marginBottom:6 }}>
            <input id="affiliateLink" type="url" value={affiliateLink} onChange={e => setAffiliateLink(e.target.value)} placeholder="Paste affiliate link" style={{ flex:1, minWidth:0, padding:"8px 10px" }} />
            <select value={affiliateType} onChange={e => setAffiliateType(e.target.value)} style={{ width:"12%", minWidth:100, padding:"6px 8px" }}>
              <option value="book">Get Book</option><option value="pdf">Get PDF</option><option value="app">Open App</option>
            </select>
          </div>
          <small style={{ display:"block", marginTop:6, color:"#666" }}>Choose the type and paste the link.</small>

          <label htmlFor="youtubeUrl">YouTube URL</label>
          <input id="youtubeUrl" type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          {youtubeId && (
            <div className="youtube-preview">
              <iframe title="youtube-preview" src={"https://www.youtube.com/embed/" + youtubeId} frameBorder="0" allowFullScreen style={{ width:'100%', height:200, borderRadius:8 }} />
            </div>
          )}

          <label htmlFor="tags">Tags</label>
          <div className="tags-input-row">
            <input id="tags" type="text" placeholder="type tag then Enter or comma" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} />
            <button type="button" className="hf-btn" onClick={() => addTagFromInput(tagInput)}>Add</button>
          </div>
          <div className="tags-list">
            {(tags || []).map(t => <button type="button" key={t} className="tag-chip" onClick={() => removeTag(t)} title="click to remove">{t} <span aria-hidden>✕</span></button>)}
          </div>

          <label htmlFor="keywords">Keywords (optional)</label>
          <div className="keywords-row" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
            <input id="keywords" type="text" value={keywordInput} onChange={e => { setKeywordInput(e.target.value); if (!editedKeywords) setEditedKeywords(true); }} onKeyDown={handleKeywordKey} placeholder="type keyword then Enter or comma" style={{ flex:'1 1 220px', minWidth:0, padding:'8px 10px' }} />
            <button type="button" className="hf-btn" onClick={() => addKeywordFromInput(keywordInput)}>Add</button>
            <button type="button" className="hf-btn" onClick={() => { setKeywords([]); setEditedKeywords(true); setKeywordInput(''); }}>Clear</button>
          </div>
          <div className="keywords-list" style={{ marginBottom:8 }}>
            {parsedKeywordsPreview.map(k => <button key={k} type="button" className="tag-chip" onClick={() => removeKeyword(k)} title="Click to remove keyword" style={{ marginRight:6 }}>{k} <span aria-hidden>✕</span></button>)}
            {parsedKeywordsPreview.length === 0 && <div style={{ color:'#666', fontSize:13 }}>No keywords yet</div>}
          </div>
          <div style={{ fontSize:12, color:"#6b7280", marginBottom:12 }}>
            <span>{parsedKeywordsPreview.length} / {KEYWORDS_LIMIT} keywords</span>
            <span style={{ marginLeft:8 }}>Click ✕ to remove. Leaving untouched preserves them on save.</span>
          </div>

          <label htmlFor="summaryText">Full summary</label>
          <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
            <button type="button" className="hf-btn" onClick={removeLinksAndMakeBold}>✂️ Remove links & Bold</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldedPhrases}>🔗 Auto-link bolded phrases</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldToSlug}>🔗 Bold → Slug Link</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldExact}>🎯 Exact auto-link</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldKeywords}>🧠 Keyword auto-link</button>
            <button type="button" className="hf-btn" onClick={resetAndAutoRelink} style={{ background:'#eef2ff' }}>Reset & Auto-Relink</button>
            <div style={{ color:'#6b7280', fontSize:12 }}>All links use /library/ route.</div>
          </div>

          <div className="quill-container">
            <ReactQuill ref={quillRef} theme="snow" value={summaryText} onChange={setSummaryText} modules={modules} formats={quillFormats} />
          </div>

          {errorMsg && <div className="form-error" role="alert">{errorMsg}</div>}

          <div style={{ display:'flex', gap:8, marginTop:12, alignItems:'center' }}>
            <button className="hf-btn" type="submit" disabled={loading}>{loading ? 'Updating...' : (initialIdRef.current ? 'Save changes' : 'Create')}</button>
            <button type="button" className="hf-btn" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>

        {showInternalLinkModal && (
          <div className="internal-link-modal" role="dialog" aria-modal="true" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(''); setLinkResults([]); }}>
            <div className="internal-link-box" onClick={e => e.stopPropagation()}>
              <h4>Link to summary</h4>
              <input type="text" placeholder="Search summaries by title..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} autoFocus />
              <div className="link-results" style={{ maxHeight:240, overflowY:'auto', marginTop:8 }}>
                {linkResults.length === 0 && <div style={{ padding:8, color:'#666' }}>No results</div>}
                <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                  {linkResults.map(r => (
                    <li key={r.id} style={{ marginBottom:6 }}>
                      <button type="button" className="hf-btn" onClick={() => insertInternalLink(r)} style={{ width:'100%', textAlign:'left' }}>{r.title}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button className="hf-btn" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(''); setLinkResults([]); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, portalElRef.current);
};

export default EditSummaryForm;