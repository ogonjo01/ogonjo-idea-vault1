// src/components/EditSummaryForm/EditSummaryForm.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactQuill from 'react-quill';
import Quill from 'quill';
import slugify from 'slugify';
import { supabase } from '../../supabase/supabaseClient';
import 'react-quill/dist/quill.snow.css';
import './EditSummaryForm.css';

/* ---------- Constants ---------- */
const categories = [
  "Apps",
  "Best Books",
  "Book Summaries",
  "Business Concepts",
  "Business Giants",
  "Business Ideas",
  "Business Legends",
  "Business Strategy & Systems",
  "Career Development",
  "Companies & Organizations",
  "Concepts",
  "Courses & Learning Paths",
  "Digital Skills & Technology",
  "Entrepreneurship",
  "Leadership & Management",
  "Marketing & Sales",
  "Markets & Geography",
  "Mindset & Motivation",
  "Money & Productivity",
  "People",
  "Quotes",
  "Self-Improvement",
  "Strategic Communication",
  "Tools & Software",
  "Video Insights"
];


const DIFFICULTIES = [
  { value: "", label: "Not specified (optional)" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" }
];

const quillFormats = [
  'header','bold','italic','underline','strike',
  'list','bullet','blockquote','code-block','link','image'
];

const KEYWORDS_LIMIT = 8;

/* ---------- Utilities / scoring helpers ---------- */
const normalize = (s = '') => String(s || '').trim().toLowerCase();
const uniqueWords = (s = '') => Array.from(new Set(normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)));

function wordMatchScore(a = '', b = '') {
  const aw = uniqueWords(a);
  const bw = uniqueWords(b);
  if (aw.length === 0 || bw.length === 0) return 0;
  const common = aw.filter((w) => bw.includes(w)).length;
  return common / Math.max(aw.length, bw.length);
}

function longestCommonSubstringRatio(a = '', b = '') {
  const A = String(a || '');
  const B = String(b || '');
  const n = A.length, m = B.length;
  if (n === 0 || m === 0) return 0;
  const dp = new Array(m + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = m; j >= 1; j--) {
      if (A[i - 1] === B[j - 1]) {
        dp[j] = dp[j - 1] + 1;
        if (dp[j] > best) best = dp[j];
      } else {
        dp[j] = 0;
      }
    }
  }
  const maxLen = Math.max(n, m);
  return best / maxLen;
}

function combinedScore(candidateTitle = '', query = '') {
  const wscore = wordMatchScore(candidateTitle, query); // 0..1
  const lcsr = longestCommonSubstringRatio(candidateTitle, query); // 0..1
  const starts = normalize(candidateTitle).startsWith(normalize(query)) ? 1 : 0;
  return Math.min(1, 0.55 * wscore + 0.35 * lcsr + 0.10 * starts);
}

// single-word pluralization helpers
const pluralVariants = (word = '') => {
  const w = normalize(word);
  if (!w) return [w];
  const variants = new Set([w]);
  if (!w.endsWith('s')) variants.add(`${w}s`);
  if (!w.endsWith('es')) variants.add(`${w}es`);
  if (w.endsWith('s')) variants.add(w.replace(/s+$/, ''));
  return Array.from(variants);
};

/* ---------- Affiliate parsing helper ---------- */
const parseAffiliateValue = (raw) => {
  if (!raw) return { type: null, url: null };
  try {
    if (typeof raw === 'string') {
      const parts = raw.split('|').map(p => (p || '').trim());
      if (parts.length === 2 && parts[1]) return { type: (parts[0] || 'book').toLowerCase(), url: parts[1] };
      if (raw.trim()) return { type: 'book', url: raw.trim() };
      return { type: null, url: null };
    }
    if (typeof raw === 'object' && raw !== null) {
      if (raw.url) return { type: (raw.type || 'book').toLowerCase(), url: String(raw.url).trim() };
      if (raw.link) return { type: (raw.type || 'book').toLowerCase(), url: String(raw.link).trim() };
    }
  } catch (e) {}
  try { return { type: null, url: String(raw).trim() || null }; } catch (e) { return { type: null, url: null }; }
};

/* ---------- Keywords helper (for CSV input) ---------- */
function parseKeywordsCSV(input, max = KEYWORDS_LIMIT) {
  if (!input) return [];
  const parts = String(input)
    .split(',')
    .map((k) => (k || '').trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set();
  const uniq = [];
  for (const k of parts) {
    if (!seen.has(k)) {
      seen.add(k);
      uniq.push(k);
      if (uniq.length >= max) break;
    }
  }
  return uniq;
}

/* ---------- Component ---------- */
const EditSummaryForm = ({ summary = {}, onClose = () => {}, onUpdate = () => {} }) => {
  // core fields (init from summary, and we also sync when summary changes)
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
  // keywords: array + visible input. We show existing keywords in the input so they are visible on edit.
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  // track whether user actually edited keywords (so we don't overwrite unless intended)
  const [editedKeywords, setEditedKeywords] = useState(false);

  const [difficulty, setDifficulty] = useState(summary.difficulty_level || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // stable id ref (truth if editing) — start null and sync to incoming summary id to avoid stale values
  const initialIdRef = useRef(null);
  useEffect(() => {
    initialIdRef.current = summary?.id || null;
  }, [summary?.id]);

  // sync core fields when summary prop changes (useful if modal is reused)
  useEffect(() => {
    setTitle(summary.title || '');
    setSlug(summary.slug || '');
    setAuthor(summary.author || '');
    setDescription(summary.description || '');
    setSummaryText(summary.summary || '');
    setCategory(summary.category || categories[0]);
    setImageUrl(summary.image_url || '');
    setYoutubeUrl(summary.youtube_url || '');
    setTags(Array.isArray(summary.tags) ? summary.tags.map(t => String(t).trim().toLowerCase()) : []);
    // affiliate sync handled below
  }, [summary.id]); // only when summary identity changes

  // portal and quill refs
  const portalElRef = useRef(null);
  const quillRef = useRef(null);

  // internal link modal state
  const [showInternalLinkModal, setShowInternalLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [selectedRangeForLink, setSelectedRangeForLink] = useState(null);

  // keep affiliate and difficulty in sync with incoming summary
  useEffect(() => {
    const parsed = parseAffiliateValue(summary.affiliate_link);
    if (parsed && parsed.url) { setAffiliateLink(parsed.url); setAffiliateType(parsed.type || 'book'); }
    else { setAffiliateLink(''); setAffiliateType('book'); }
  }, [summary.affiliate_link]);

  useEffect(() => { setDifficulty(summary.difficulty_level || ''); }, [summary.difficulty_level]);

  // keep keywords in sync if summary changes (robust parsing)
  // IMPORTANT: this ensures keywords are visible on edit and not lost unless user explicitly edits them.
  useEffect(() => {
    const raw = summary?.keywords;
    let incoming = [];

    try {
      if (Array.isArray(raw)) {
        incoming = raw.map(k => String(k || '').trim().toLowerCase()).filter(Boolean);
      } else if (raw == null) {
        incoming = [];
      } else if (typeof raw === 'string') {
        // attempt JSON parse first (in case DB returned JSON-string), else CSV split
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) incoming = parsed.map(k => String(k || '').trim().toLowerCase()).filter(Boolean);
          else incoming = String(raw).split(',').map(k => (k || '').trim().toLowerCase()).filter(Boolean);
        } catch (e) {
          incoming = String(raw).split(',').map(k => (k || '').trim().toLowerCase()).filter(Boolean);
        }
      } else {
        // other types (e.g. object) — attempt to extract array-like
        if (typeof raw === 'object' && raw !== null) {
          // try to read keys that are arrays
          if (Array.isArray(raw)) incoming = raw.map(k => String(k || '').trim().toLowerCase()).filter(Boolean);
          else incoming = [];
        } else {
          incoming = [];
        }
      }
    } catch (e) {
      incoming = [];
    }

    // dedupe and limit
    const uniq = Array.from(new Set(incoming)).slice(0, KEYWORDS_LIMIT);

    // set into state
    setKeywords(uniq);
    // show them in the input so the user sees existing values immediately
    setKeywordInput(uniq.length ? uniq.join(', ') : '');
    setEditedKeywords(false); // no local edits yet
  }, [summary?.keywords, summary?.id]); // depend on both keywords and id to catch fetch updates

  // SLUG generation: only generate for NEW content (do NOT overwrite on edit)
  useEffect(() => {
    if (initialIdRef.current) return;
    if (!title) { setSlug(''); return; }
    const generated = slugify(title, { lower: true, replacement: '-', strict: true });
    setSlug(generated);
  }, [title, initialIdRef.current]);

  // create portal element on mount and cleanup
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
      if (portalElRef.current) {
        document.body.removeChild(portalElRef.current);
        portalElRef.current = null;
      }
    };
  }, []);

  // Tag helpers
  const normalizeTag = (t) => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).trim().toLowerCase());
  const addTagFromInput = (raw = '') => {
    const value = (raw || tagInput || '').trim();
    if (!value) return;
    const parts = value.split(',').map(p => normalizeTag(p)).filter(Boolean);
    setTags(prev => {
      const s = new Set(prev || []);
      parts.forEach(p => s.add(p));
      return Array.from(s).slice(0, 20);
    });
    setTagInput('');
  };
  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromInput(); }
    else if (e.key === 'Backspace' && !tagInput) { setTags(prev => (prev && prev.length ? prev.slice(0, -1) : [])); }
  };
  const removeTag = (t) => setTags(prev => (prev || []).filter(x => x !== t));

  // Keywords UI helpers (chips + input)
  const addKeywordFromInput = (raw = '') => {
    const value = (raw || keywordInput || '').trim();
    if (!value) return;
    // allow comma-separated additions
    const parts = value.split(',').map(p => (p || '').trim().toLowerCase()).filter(Boolean);
    setKeywords(prev => {
      const s = new Set(prev || []);
      for (const p of parts) {
        if (s.size >= KEYWORDS_LIMIT) break;
        s.add(p);
      }
      const out = Array.from(s);
      if (JSON.stringify(out) !== JSON.stringify(prev || [])) setEditedKeywords(true);
      return out;
    });
    setKeywordInput('');
  };
  const handleKeywordKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeywordFromInput(); }
    else if (e.key === 'Backspace' && !keywordInput) {
      setKeywords(prev => {
        if (!prev || prev.length === 0) return [];
        const out = prev.slice(0, -1);
        setEditedKeywords(true);
        return out;
      });
    } else {
      // user typed — mark intention to edit keywords
      if (!editedKeywords) setEditedKeywords(true);
    }
  };
  const removeKeyword = (k) => {
    setKeywords(prev => {
      const out = (prev || []).filter(x => x !== k);
      setEditedKeywords(true);
      return out;
    });
  };

  // parsed keywords preview derived from keywords array
  const parsedKeywordsPreview = useMemo(() => (Array.isArray(keywords) ? keywords.slice(0, KEYWORDS_LIMIT) : []), [keywords]);

  const validate = () => {
    setErrorMsg('');
    if (!title.trim()) return 'Title is required';
    if (!author.trim()) return 'Author is required';
    if (!category) return 'Category is required';
    return null;
  };

  // small youtube id extractor
  const extractYouTubeId = (url = '') => {
    if (!url) return null;
    const vMatch = url.match(/[?&]v=([0-9A-Za-z_-]{11})/);
    if (vMatch) return vMatch[1];
    const shortMatch = url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const embedMatch = url.match(/\/embed\/([0-9A-Za-z_-]{11})/);
    if (embedMatch) return embedMatch[1];
    return null;
  };
  const youtubeId = extractYouTubeId(youtubeUrl);

  // QUILL: register a small icon for internalLink (visual)
  useEffect(() => {
    try {
      const icons = Quill.import('ui/icons');
      icons.internalLink = '<svg viewBox="0 0 18 18"><path d="M7 7h4v1H7z"/></svg>';
    } catch (e) {
      // ignore if Quill not available
    }
  }, []);

  // QUILL modules with handler for internalLink; memoize so ReactQuill reuses it
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['internalLink'], // custom button
        ['clean'],
      ],
      handlers: {
        internalLink: function () {
          const editor = quillRef.current?.getEditor();
          if (!editor) { console.error('Quill editor not ready'); return; }
          const range = editor.getSelection();
          if (!range || range.length === 0) { alert('Select the text you want to link, then click "Link to summary".'); return; }
          setSelectedRangeForLink(range);
          setShowInternalLinkModal(true);
        }
      }
    },
    clipboard: { matchVisual: false }
  }), []);

  // search for summaries when user types in internal link modal
  useEffect(() => {
    let cancelled = false;
    if (!linkSearch || linkSearch.trim().length < 1) {
      setLinkResults([]);
      return;
    }
    const q = async () => {
      const { data, error } = await supabase
        .from('book_summaries')
        .select('id, title')
        .ilike('title', `%${linkSearch}%`)
        .limit(10);

      if (cancelled) return;
      setLinkResults(error ? [] : (data || []));
    };
    q();
    return () => { cancelled = true; };
  }, [linkSearch]);

  // insert an internal link (as anchor with data-summary-id)
  const insertInternalLink = (summaryItem) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.error('Quill editor missing in insertInternalLink');
      return;
    }

    const range = selectedRangeForLink || editor.getSelection();
    if (!range) {
      alert('Unable to determine selection. Re-select text and try again.');
      setShowInternalLinkModal(false);
      return;
    }

    editor.focus();
    editor.setSelection(range.index, range.length);

    const selectedText = (range.length && editor.getText(range.index, range.length).trim()) || summaryItem.title || 'link';
    editor.deleteText(range.index, range.length);

    editor.insertText(range.index, selectedText, { link: `#summary-${summaryItem.id}` }, 'user');

    try {
      const [leaf] = editor.getLeaf(range.index);
      const domNode = leaf?.domNode;
      const possibleAnchor = domNode?.parentElement && domNode.parentElement.tagName === 'A' ? domNode.parentElement : null;
      if (possibleAnchor) {
        possibleAnchor.setAttribute('data-summary-id', summaryItem.id);
        possibleAnchor.classList.add('internal-summary-link');
        possibleAnchor.setAttribute('href', `#summary-${summaryItem.id}`);
      } else {
        const safeText = selectedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        editor.deleteText(range.index, selectedText.length);
        editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="#summary-${summaryItem.id}">${safeText}</a>`);
      }
    } catch (err) {
      console.warn('Could not set anchor attributes via DOM. Falling back to HTML paste.', err);
      const safeText = selectedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      editor.deleteText(range.index, selectedText.length);
      editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="#summary-${summaryItem.id}">${safeText}</a>`);
    }

    editor.setSelection(range.index + selectedText.length, 0);

    setShowInternalLinkModal(false);
    setLinkSearch('');
    setLinkResults([]);
    setSelectedRangeForLink(null);
  };

  /* ---------- Advanced search best-match (used by fuzzy auto-link) ---------- */
  const searchBestMatch = async (text, opts = { limitCandidates: 40, minScore: 0.50 }) => {
    const q = String(text || '').trim();
    if (!q) return null;

    try {
      const { data: exact, error: errExact } = await supabase
        .from('book_summaries')
        .select('id, title')
        .ilike('title', q)
        .maybeSingle();

      if (!errExact && exact && exact.id) return exact;
    } catch (e) {}

    try {
      const { data: phrase, error: errPhrase } = await supabase
        .from('book_summaries')
        .select('id, title')
        .ilike('title', `%${q}%`)
        .limit(1)
        .maybeSingle();

      if (!errPhrase && phrase && phrase.id) return phrase;
    } catch (e) {}

    const tokens = uniqueWords(q).slice(0, 6);
    if (tokens.length === 0) return null;
    const orFilters = tokens.map((t) => `title.ilike.%${t}%`).join(',');

    try {
      const { data: candidates = [], error } = await supabase
        .from('book_summaries')
        .select('id, title')
        .or(orFilters)
        .limit(opts.limitCandidates);

      if (error) return null;
      if (!candidates || candidates.length === 0) return null;

      let best = null;
      let bestScore = 0;
      const singleWord = q.split(/\s+/).length === 1;
      const qVariants = singleWord ? pluralVariants(q) : [normalize(q)];

      candidates.forEach((c) => {
        const score = combinedScore(c.title || '', q);
        if (singleWord) {
          const cWords = uniqueWords(c.title || '');
          const hasVariant = qVariants.some(v => cWords.includes(v));
          if (!hasVariant) return;
        }
        if (score > bestScore) { bestScore = score; best = c; }
      });

      if (best && bestScore >= (opts.minScore || 0.5)) return best;
      return best && bestScore > 0.25 ? best : null;
    } catch (e) {
      console.error('Candidate search exception', e);
      return null;
    }
  };

  /* ---------- DOM utilities for link operations ---------- */
  const removeLinksAndMakeBold = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }

    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;

      const anchors = Array.from(container.querySelectorAll('a[data-summary-id], a[href^="#summary-"]'));
      if (anchors.length === 0) { alert('No internal links found.'); return; }

      anchors.forEach(a => {
        const strong = document.createElement('strong');
        strong.innerHTML = a.innerHTML; // preserve inner formatting
        a.parentNode.replaceChild(strong, a);
      });

      const delta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(delta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Removed ${anchors.length} link(s) and bolded the text.`);
    } catch (err) {
      console.error('removeLinksAndMakeBold error', err);
      alert('Could not remove links automatically. See console.');
    }
  };

  /* ---------- Existing fuzzy auto-link bolded phrases ---------- */
  const autoLinkBoldedPhrases = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }

    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;

      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const phrases = Array.from(new Set(boldNodes.map(n => (n.textContent || '').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 40);
      if (phrases.length === 0) { alert('No bolded phrases found to auto-link.'); return; }

      const mapping = {};
      for (const phrase of phrases) {
        try {
          const best = await searchBestMatch(phrase, { limitCandidates: 40, minScore: 0.5 });
          mapping[phrase] = best || null;
        } catch (e) {
          mapping[phrase] = null;
        }
      }

      let linkedCount = 0;
      boldNodes.forEach(node => {
        const text = (node.textContent || '').trim();
        const match = mapping[text];
        if (match && match.id) {
          const a = document.createElement('a');
          a.setAttribute('data-summary-id', match.id);
          a.setAttribute('href', `#summary-${match.id}`);
          a.className = 'internal-summary-link';
          a.innerHTML = node.innerHTML;
          node.parentNode.replaceChild(a, node);
          linkedCount++;
        }
      });

      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Auto-link completed. ${linkedCount} phrase(s) linked.`);
    } catch (err) {
      console.error('autoLinkBoldedPhrases error', err);
      alert('Auto-link failed. See console for details.');
    }
  };

  // ----------------- Slug-based auto-link (NO DB, selection-based) -----------------
  // NOW: Links only the currently selected text to /summary/<slug>.
  // If nothing is selected, warns the user and does nothing.
  const autoLinkBoldToSlug = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      alert('Editor not ready');
      return;
    }

    const range = editor.getSelection();
    if (!range || range.length === 0) {
      alert("Please select the text you want to link before clicking 'Bold → Slug Link'.");
      return;
    }

    let selectedText = '';
    try {
      selectedText = editor.getText(range.index, range.length).trim();
    } catch (e) {
      console.error('Could not read selection text:', e);
    }

    if (!selectedText) {
      alert('Selected text is empty. Please select valid text to link.');
      return;
    }

    const generatedSlug = slugify(selectedText, { lower: true, strict: true, replacement: '-' });
    if (!generatedSlug) {
      alert('Could not generate slug from the selected text.');
      return;
    }

    try {
      editor.focus();
      // replace selection with text that has link attribute
      editor.deleteText(range.index, range.length);
      editor.insertText(range.index, selectedText, { link: `/summary/${generatedSlug}` }, 'user');
    } catch (e) {
      console.error('Insert text failed:', e);
    }

    // Try to attach class/data attributes to the created anchor element.
    const tryAttachDataAttr = (attempt = 0) => {
      try {
        const [leaf] = editor.getLeaf(range.index);
        const domNode = leaf?.domNode;
        const anchor =
          domNode?.parentElement && domNode.parentElement.tagName === 'A'
            ? domNode.parentElement
            : null;

        if (anchor) {
          anchor.classList.add('slug-summary-link');
          anchor.setAttribute('href', `/summary/${generatedSlug}`);
          anchor.setAttribute('data-slug', generatedSlug);
          return true;
        }
      } catch (err) {
        // swallow and retry
      }

      if (attempt < 4) {
        setTimeout(() => tryAttachDataAttr(attempt + 1), 30 * (attempt + 1));
        return false;
      }

      // final fallback: paste an actual anchor HTML
      try {
        const safeText = selectedText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        try { editor.deleteText(range.index, selectedText.length); } catch (e) {}
        editor.clipboard.dangerouslyPasteHTML(range.index, `<a class="slug-summary-link" data-slug="${generatedSlug}" href="/summary/${generatedSlug}">${safeText}</a>`);
        return true;
      } catch (err) {
        console.warn('Fallback paste failed:', err);
        return false;
      }
    };

    tryAttachDataAttr(0);

    try {
      editor.setSelection(range.index + selectedText.length, 0);
    } catch (e) {}

    try {
      setSummaryText(editor.root.innerHTML);
    } catch (e) {}

    alert(`Linked selection to /summary/${generatedSlug}`);
  };

  /* ---------- Exact auto-link (NEW) ---------- */
  const fetchTitleCandidates = async (text, limit = 200) => {
    const q = String(text || '').trim();
    if (!q) return [];
    try {
      const { data, error } = await supabase
        .from('book_summaries')
        .select('id, title, keywords')
        .ilike('title', `%${q}%`)
        .limit(limit);
      if (error) {
        console.warn('fetchTitleCandidates error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('fetchTitleCandidates exception:', e);
      return [];
    }
  };

  const fetchKeywordRows = async (limit = 800) => {
    try {
      const { data, error } = await supabase
        .from('book_summaries')
        .select('id, title, keywords')
        .not('keywords', 'is', null)
        .limit(limit);
      if (error) {
        console.warn('fetchKeywordRows error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('fetchKeywordRows exception:', e);
      return [];
    }
  };

  const autoLinkBoldExact = async () => {
    // (kept similar to your previous implementation; uses fetchTitleCandidates + fetchKeywordRows)
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }

    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;

      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const phrases = Array.from(new Set(boldNodes.map(n => (n.textContent || '').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 200);
      if (phrases.length === 0) { alert('No bolded phrases found to exact-auto-link.'); return; }

      let linkedCount = 0;
      for (const phrase of phrases) {
        try {
          const tCandidates = await fetchTitleCandidates(phrase, 200);
          const variants = pluralVariants(phrase);
          let matched = null;
          for (const c of tCandidates) {
            if (!c || !c.title) continue;
            const nt = normalize(c.title || '');
            if (nt === normalize(phrase) || variants.includes(nt)) { matched = c; break; }
          }

          if (!matched) {
            const sample = await fetchKeywordRows(400);
            for (const c of sample) {
              if (!c || !c.title) continue;
              const nt = normalize(c.title || '');
              if (nt === normalize(phrase) || variants.includes(nt)) { matched = c; break; }
            }
          }

          if (!matched || !matched.id) continue;

          boldNodes.forEach(node => {
            const text = (node.textContent || '').trim();
            if (normalize(text) !== normalize(phrase)) return;
            try {
              if (node.closest && node.closest('a')) return;
              const a = document.createElement('a');
              a.setAttribute('data-summary-id', matched.id);
              a.setAttribute('href', `#summary-${matched.id}`);
              a.className = 'internal-summary-link';
              a.innerHTML = node.innerHTML;
              node.parentNode.replaceChild(a, node);
              linkedCount++;
            } catch (err) {}
          });

        } catch (err) {
          console.error('autoLinkBoldExact error for phrase', phrase, err);
        }
      }

      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Exact auto-link complete — ${linkedCount} item(s) linked.`);
    } catch (err) {
      console.error('autoLinkBoldExact failed', err);
      alert('Exact auto-link failed. See console.');
    }
  };

  /* ---------- Keyword+Title auto-link (NEW) ---------- */
  const autoLinkBoldKeywords = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }

    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;

      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const uniquePhrases = Array.from(new Set(boldNodes.map(n => (n.textContent || '').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 200);
      if (uniquePhrases.length === 0) { alert('No bolded phrases found to keyword-auto-link.'); return; }

      let keywordSample = [];
      try { keywordSample = await fetchKeywordRows(800); } catch (e) { keywordSample = []; }

      let linkedCount = 0;
      for (const phrase of uniquePhrases) {
        try {
          const tokens = uniqueWords(phrase);
          const normalizedTokens = tokens.map(t => normalize(t));
          const titleCandidates = await fetchTitleCandidates(phrase, 200);

          const keywordCandidates = keywordSample.filter((r) => {
            try {
              if (!r || !r.keywords) return false;
              const kws = (r.keywords || []).map(k => normalize(String(k || '')));
              return normalizedTokens.some(t => kws.includes(t) || kws.some(k => k.includes(t))) || kws.includes(normalize(phrase));
            } catch (e) { return false; }
          });

          const byId = new Map();
          titleCandidates.forEach(c => { if (c && c.id) byId.set(c.id, c); });
          keywordCandidates.forEach(c => { if (c && c.id && !byId.has(c.id)) byId.set(c.id, c); });
          const merged = Array.from(byId.values());
          if (merged.length === 0) continue;

          let best = null;
          let bestScore = 0;
          for (const c of merged) {
            try {
              const t = c.title || '';
              let score = combinedScore(t, phrase);
              const nt = normalize(t);
              if (nt === normalize(phrase)) score = Math.max(score, 0.95);
              if (c.keywords && Array.isArray(c.keywords)) {
                const kws = c.keywords.map(k => normalize(String(k || '')));
                if (kws.includes(normalize(phrase))) score = Math.max(score, score + 0.6);
                else {
                  const tokenMatches = normalizedTokens.filter(tk => kws.some(k => k === tk || k.includes(tk))).length;
                  if (tokenMatches > 0) score = score + Math.min(0.35, 0.12 * tokenMatches);
                }
              }
              if (score > 1) score = 1;
              if (score > bestScore) { bestScore = score; best = c; }
            } catch (e) {}
          }

          if (!best || !best.id) continue;
          if (bestScore < 0.65) continue;

          boldNodes.forEach(node => {
            const text = (node.textContent || '').trim();
            if (normalize(text) !== normalize(phrase)) return;
            try {
              if (node.closest && node.closest('a')) return;
              const a = document.createElement('a');
              a.setAttribute('data-summary-id', best.id);
              a.setAttribute('href', `#summary-${best.id}`);
              a.className = 'internal-summary-link';
              a.innerHTML = node.innerHTML;
              node.parentNode.replaceChild(a, node);
              linkedCount++;
            } catch (err) {}
          });

        } catch (err) {
          console.error('autoLinkBoldKeywords error for phrase', phrase, err);
        }
      }

      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Keyword auto-link complete — ${linkedCount} item(s) linked.`);
    } catch (err) {
      console.error('autoLinkBoldKeywords failed', err);
      alert('Keyword auto-link failed. See console.' );
    }
  };

  // Combined flow: remove links then auto-link (keeps existing behavior)
  const resetAndAutoRelink = async () => {
    if (!confirm('This will remove existing internal links, make them bold, then attempt to auto-link bolded phrases using your database. Continue?')) return;
    removeLinksAndMakeBold();
    await new Promise(r => setTimeout(r, 140));
    await autoLinkBoldedPhrases();
  };

  // copy content id helper (for debugging/manual linking)
  const copyContentId = async () => {
    if (!summary.id) return;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(summary.id);
      else {
        const textArea = document.createElement('textarea');
        textArea.value = summary.id;
        textArea.style.position = 'fixed'; textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);
      }
      alert('Content ID copied to clipboard');
    } catch (e) { console.error('Copy failed', e); alert('Failed to copy ID'); }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate(); if (v) { setErrorMsg(v); return; }
    setLoading(true); setErrorMsg('');

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) { setErrorMsg('You must be signed in to update this summary.'); setLoading(false); return; }

      const affiliateValue = (affiliateLink && affiliateLink.trim()) ? `${(affiliateType || 'book').toLowerCase()}|${affiliateLink.trim()}` : null;
      const allowedDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
      const difficultyToSave = allowedDifficulties.includes(difficulty) && difficulty.trim() ? difficulty : null;

      const payload = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || null,
        summary: summaryText || null,
        category: category || null,
        image_url: imageUrl || null,
        affiliate_link: affiliateValue,
        youtube_url: youtubeUrl || null,
        tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
        difficulty_level: difficultyToSave,
      };

      // keywords: include only when creating OR when the user actually edited keywords
      if (!initialIdRef.current) {
        // create flow: include keywords (or null)
        const pk = (keywords && keywords.length) ? keywords.slice(0, KEYWORDS_LIMIT) : [];
        payload.keywords = pk.length ? pk : null;
      } else if (editedKeywords) {
        // edit flow: user changed keywords explicitly -> include (allow empty -> null to clear)
        const pk = (keywords && keywords.length) ? keywords.slice(0, KEYWORDS_LIMIT) : [];
        payload.keywords = pk.length ? pk : null;
      }
      // else: editing but user did not touch keywords -> do NOT include payload.keywords (preserve existing DB value)

      if (!initialIdRef.current) payload.slug = slug || null;

      let resultData = null;
      if (initialIdRef.current) {
        const { data, error } = await supabase
          .from('book_summaries')
          .update(payload)
          .eq('id', initialIdRef.current)
          .select()
          .maybeSingle();
        if (error) { console.error('Update error', error); setErrorMsg(error.message || 'Failed to update'); setLoading(false); return; }
        resultData = data ?? null;
      } else {
        const { data, error } = await supabase
          .from('book_summaries')
          .insert([{ ...payload }])
          .select()
          .maybeSingle();
        if (error) { console.error('Insert error', error); setErrorMsg(error.message || 'Failed to create'); setLoading(false); return; }
        resultData = data ?? null;
      }

      // After successful save, sync local state from returned data (important so UI reflects DB)
      if (resultData) {
        // If keywords were not included in payload (edit without touching keywords), resultData.keywords should still contain DB value.
        const dbKeywords = Array.isArray(resultData.keywords)
          ? resultData.keywords.map(k => String(k || '').trim().toLowerCase()).filter(Boolean)
          : (typeof resultData.keywords === 'string' ? parseKeywordsCSV(resultData.keywords) : []);

        const uniq = Array.from(new Set(dbKeywords)).slice(0, KEYWORDS_LIMIT);
        setKeywords(uniq);
        setKeywordInput(uniq.length ? uniq.join(', ') : '');
        setEditedKeywords(false);
      }

      setLoading(false);
      if (typeof onUpdate === 'function') onUpdate(resultData);
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      console.error('Unexpected edit error', err);
      setErrorMsg('Unexpected error. Check console.');
      setLoading(false);
    }
  };

  // If portal hasn't been created yet (SSR safety), render nothing
  if (!portalElRef.current) return null;

  const modal = (
    <div className="modal-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content edit-large" role="dialog" aria-modal="true" aria-label="Edit Summary" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">&times;</button>
        <h2>{initialIdRef.current ? 'Edit Summary' : 'Create Summary'}</h2>

        <form onSubmit={handleSubmit} className="summary-form">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required />

          <small className="slug-preview">Slug preview: <code>{slug || '(will be generated)'}</code></small>

          {summary.id && (
            <div style={{ marginTop: 6, marginBottom: 8 }}>
              <small>Content ID: <code style={{ wordBreak: 'break-all' }}>{summary.id}</code></small>{' '}
              <button type="button" className="hf-btn" onClick={copyContentId} style={{ marginLeft: 8 }}>Copy ID</button>
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
          <div className="affiliate-row-edit" style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", marginBottom: 6 }}>
            <input id="affiliateLink" type="url" value={affiliateLink} onChange={(e) => setAffiliateLink(e.target.value)} placeholder="Paste affiliate link (e.g. https://...)" style={{ flex: 1, minWidth: 0, padding: "8px 10px" }} aria-label="Affiliate link" />
            <select value={affiliateType} onChange={(e) => setAffiliateType(e.target.value)} aria-label="Affiliate type" style={{ width: "12%", minWidth: 100, padding: "6px 8px", textAlign: "center" }}>
              <option value="book">Get Book</option>
              <option value="pdf">Get PDF</option>
              <option value="app">Open App</option>
            </select>
          </div>

          <small style={{ display: "block", marginTop: 6, color: "#666" }}>
            Choose the type and paste the link. If left blank, no affiliate link will be saved.
          </small>

          <label htmlFor="youtubeUrl">YouTube URL</label>
          <input id="youtubeUrl" type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          {youtubeId && (
            <div className="youtube-preview">
              <iframe title="youtube-preview" src={`https://www.youtube.com/embed/${youtubeId}`} frameBorder="0" allowFullScreen style={{ width: '100%', height: 200, borderRadius: 8 }} />
            </div>
          )}

          <label htmlFor="tags">Tags</label>
          <div className="tags-input-row">
            <input id="tags" type="text" placeholder="type tag then Enter or comma — e.g. leadership,strategy" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKey} />
            <button type="button" className="hf-btn" onClick={() => addTagFromInput(tagInput)}>Add</button>
          </div>

          <div className="tags-list">
            {(tags || []).map(t => (
              <button type="button" key={t} className="tag-chip" onClick={() => removeTag(t)} title="click to remove">
                {t} <span aria-hidden>✕</span>
              </button>
            ))}
          </div>

          {/* ---------------- Keywords (chips + input) ---------------- */}
          <label htmlFor="keywords">Keywords (optional)</label>
          <div className="keywords-row" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
            <input
              id="keywords"
              type="text"
              value={keywordInput}
              onChange={e => { setKeywordInput(e.target.value); if (!editedKeywords) setEditedKeywords(true); }}
              onKeyDown={handleKeywordKey}
              placeholder="type keyword then Enter or comma — e.g. growth,productivity"
              style={{ flex: '1 1 220px', minWidth: 0, padding: '8px 10px' }}
            />
            <button type="button" className="hf-btn" onClick={() => addKeywordFromInput(keywordInput)}>Add</button>
            <button type="button" className="hf-btn" onClick={() => { setKeywords([]); setEditedKeywords(true); setKeywordInput(''); }}>Clear</button>
          </div>

          <div className="keywords-list" style={{ marginBottom: 8 }}>
            {parsedKeywordsPreview.map(k => (
              <button key={k} type="button" className="tag-chip" onClick={() => removeKeyword(k)} title="Click to remove keyword" style={{ marginRight: 6 }}>
                {k} <span aria-hidden>✕</span>
              </button>
            ))}
            {parsedKeywordsPreview.length === 0 && <div style={{ color: '#666', fontSize: 13 }}>No keywords yet</div>}
          </div>

          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
            <span>{parsedKeywordsPreview.length} / {KEYWORDS_LIMIT} keywords</span>
            <span style={{ marginLeft: 8 }}>Click the ✕ on a keyword to remove it. Leaving keywords untouched will preserve them on save.</span>
          </div>

          <label htmlFor="summaryText">Full summary</label>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="hf-btn" onClick={removeLinksAndMakeBold}>✂️ Remove links & Bold</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldedPhrases}>🔗 Auto-link bolded phrases</button>

            {/* NEW slug-only button (does not call DB) */}
            <button type="button" className="hf-btn" onClick={autoLinkBoldToSlug}>🔗 Bold → Slug Link</button>

            {/* NEW buttons */}
            <button type="button" className="hf-btn" onClick={autoLinkBoldExact}>🎯 Exact auto-link</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldKeywords}>🧠 Keyword auto-link</button>

            <button type="button" className="hf-btn" onClick={resetAndAutoRelink} style={{ background: '#eef2ff' }}>Reset & Auto-Relink</button>
            <div style={{ color: '#6b7280', fontSize: 12 }}>
              Use 🎯 for strict exact-title linking, 🧠 to prioritize keywords+title, and 🔗 for fuzzy matches. Use Bold → Slug Link to deterministically create /summary/&lt;slug&gt; links.
            </div>
          </div>

          <div className="quill-container">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={summaryText}
              onChange={setSummaryText}
              modules={modules}
              formats={quillFormats}
            />
          </div>

          {errorMsg && <div className="form-error" role="alert">{errorMsg}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button className="hf-btn" type="submit" disabled={loading}>{loading ? 'Updating...' : (initialIdRef.current ? 'Save changes' : 'Create')}</button>
            <button type="button" className="hf-btn" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>

        {/* Internal Link Modal */}
        {showInternalLinkModal && (
          <div className="internal-link-modal" role="dialog" aria-modal="true" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(''); setLinkResults([]); }}>
            <div className="internal-link-box" onClick={(e) => e.stopPropagation()}>
              <h4>Link to summary</h4>
              <input type="text" placeholder="Search summaries by title..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)} autoFocus />
              <div className="link-results" style={{ maxHeight: 240, overflowY: 'auto', marginTop: 8 }}>
                {linkResults.length === 0 && <div style={{ padding: 8, color: '#666' }}>No results</div>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {linkResults.map(r => (
                    <li key={r.id} style={{ marginBottom: 6 }}>
                      <button type="button" className="hf-btn" onClick={() => insertInternalLink(r)} style={{ width: '100%', textAlign: 'left' }}>
                        {r.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
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
