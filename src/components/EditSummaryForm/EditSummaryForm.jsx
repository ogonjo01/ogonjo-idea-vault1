// src/components/EditSummaryForm/EditSummaryForm.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactQuill from 'react-quill';
import Quill from 'quill';
import slugify from 'slugify';
import { supabase } from '../../supabase/supabaseClient';
import 'react-quill/dist/quill.snow.css';
import './EditSummaryForm.css';

const CATEGORIES = [
  "Apps","Business Legends","Best Books","People","Business Giants","Business Concepts",
  "Business Strategy & Systems","Courses & Learning Paths","Business Ideas",
  "Book Summaries","Entrepreneurship","Self-Improvement","Marketing & Sales",
  "Money & Productivity","Mindset & Motivation","Career Development","Video Insights",
  "Digital Skills & Technology","Leadership & Management","Strategic Communication"
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

const normalizeTag = (t) => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).trim().toLowerCase());

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

const EditSummaryForm = ({ summary = {}, onClose = () => {}, onUpdate = () => {} }) => {
  // core fields
  const [title, setTitle] = useState(summary.title || '');
  const [slug, setSlug] = useState(summary.slug || '');
  const [author, setAuthor] = useState(summary.author || '');
  const [description, setDescription] = useState(summary.description || '');
  const [summaryText, setSummaryText] = useState(summary.summary || '');
  const [category, setCategory] = useState(summary.category || CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState(summary.image_url || '');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [affiliateType, setAffiliateType] = useState('book');
  const [youtubeUrl, setYoutubeUrl] = useState(summary.youtube_url || '');
  const [tags, setTags] = useState(Array.isArray(summary.tags) ? summary.tags.map(normalizeTag) : []);
  const [tagInput, setTagInput] = useState('');
  const [difficulty, setDifficulty] = useState(summary.difficulty_level || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // stable id ref (truth if editing)
  const initialIdRef = useRef(summary.id || null);

  // portal and quill refs
  const portalElRef = useRef(null);
  const quillRef = useRef(null);

  // internal link modal state
  const [showInternalLinkModal, setShowInternalLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [selectedRangeForLink, setSelectedRangeForLink] = useState(null);

  // parse affiliate initial
  useEffect(() => {
    const parsed = parseAffiliateValue(summary.affiliate_link);
    if (parsed && parsed.url) { setAffiliateLink(parsed.url); setAffiliateType(parsed.type || 'book'); }
    else { setAffiliateLink(''); setAffiliateType('book'); }
  }, [summary.affiliate_link]);

  useEffect(() => { setDifficulty(summary.difficulty_level || ''); }, [summary.difficulty_level]);

  // SLUG generation: only generate for NEW content (do NOT overwrite on edit)
  useEffect(() => {
    if (initialIdRef.current) return;
    if (!title) { setSlug(''); return; }
    const generated = slugify(title, { lower: true, replacement: '-', strict: true });
    setSlug(generated);
  }, [title]);

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
          // 'this' is toolbar module context; we use quillRef to get actual editor & selection
          const editor = quillRef.current?.getEditor();
          if (!editor) {
            // safety
            console.error('Quill editor not ready');
            return;
          }
          const range = editor.getSelection();
          if (!range || range.length === 0) {
            alert('Select the text you want to link, then click "Link to summary".');
            return;
          }
          // store current range to insert later
          setSelectedRangeForLink(range);
          // open modal
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

    // restore selection (range may be stale after modal)
    const range = selectedRangeForLink || editor.getSelection();
    if (!range) {
      alert('Unable to determine selection. Re-select text and try again.');
      setShowInternalLinkModal(false);
      return;
    }

    // ensure editor has focus and selection
    editor.focus();
    editor.setSelection(range.index, range.length);

    // get text (if none, fall back to summary title)
    const selectedText = (range.length && editor.getText(range.index, range.length).trim()) || summaryItem.title || 'link';

    // delete selected range
    editor.deleteText(range.index, range.length);

    // insert the text with a temporary link href; we will add data-summary-id attribute to the rendered anchor
    // Use insertText with link format; formats param can be { link: '#summary-id' }
    editor.insertText(range.index, selectedText, { link: `#summary-${summaryItem.id}` }, 'user');

    // Now locate the inserted leaf and set data-summary-id attribute on parent anchor if possible
    try {
      const [leaf] = editor.getLeaf(range.index);
      const domNode = leaf?.domNode;
      // if the inserted text is wrapped in an <a>, domNode.parentElement should be the anchor
      const possibleAnchor = domNode?.parentElement && domNode.parentElement.tagName === 'A' ? domNode.parentElement : null;
      if (possibleAnchor) {
        possibleAnchor.setAttribute('data-summary-id', summaryItem.id);
        possibleAnchor.classList.add('internal-summary-link');
        // keep href as placeholder (renderer will replace it later to actual /book-summary/:slug), or you can set to #summary-id
        possibleAnchor.setAttribute('href', `#summary-${summaryItem.id}`);
      } else {
        // fallback: ensure there's an anchor by pasting anchor HTML
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

    // move cursor after inserted content
    editor.setSelection(range.index + selectedText.length, 0);

    // cleanup modal state
    setShowInternalLinkModal(false);
    setLinkSearch('');
    setLinkResults([]);
    setSelectedRangeForLink(null);
  };

  // copy content id helper with fallback for local dev
  const copyContentId = async () => {
    if (!summary.id) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summary.id);
      } else {
        // fallback - works on http/local
        const textArea = document.createElement('textarea');
        textArea.value = summary.id;
        // avoid scrolling to bottom
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      // small UI feedback
      try { /* prefer non-blocking feedback if you have a toast system */ } catch {}
      alert('Content ID copied to clipboard');
    } catch (e) {
      console.error('Copy failed', e);
      alert('Failed to copy ID');
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setErrorMsg(v); return; }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) {
        setErrorMsg('You must be signed in to update this summary.');
        setLoading(false);
        return;
      }

      const affiliateValue = (affiliateLink && affiliateLink.trim())
        ? `${(affiliateType || 'book').toLowerCase()}|${affiliateLink.trim()}`
        : null;

      const allowedDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
      const difficultyToSave = allowedDifficulties.includes(difficulty) && difficulty.trim()
        ? difficulty
        : null;

      // Build payload WITHOUT slug for updates. slug only included when creating new content.
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

      // include slug only for new content (when there's no initial id)
      if (!initialIdRef.current) {
        payload.slug = slug || null;
      }

      // run update (or insert depending on presence of id)
      let resultData = null;
      if (initialIdRef.current) {
        const { data, error } = await supabase
          .from('book_summaries')
          .update(payload)
          .eq('id', initialIdRef.current)
          .select()
          .maybeSingle();
        if (error) {
          console.error('Update error', error);
          setErrorMsg(error.message || 'Failed to update');
          setLoading(false);
          return;
        }
        resultData = data ?? null;
      } else {
        // create new summary
        const { data, error } = await supabase
          .from('book_summaries')
          .insert([{ ...payload }])
          .select()
          .maybeSingle();
        if (error) {
          console.error('Insert error', error);
          setErrorMsg(error.message || 'Failed to create');
          setLoading(false);
          return;
        }
        resultData = data ?? null;
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

  // Modal JSX
  const modal = (
    <div className="modal-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content edit-large" role="dialog" aria-modal="true" aria-label="Edit summary" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">&times;</button>
        <h2>Edit Summary</h2>

        <form onSubmit={handleSubmit} className="summary-form">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required />

          <small className="slug-preview">Slug preview: <code>{slug || '(will be generated)'}</code></small>

          {/* Show content ID and copy button (helpful for debugging / manual linking if desired) */}
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
            {CATEGORIES.map(c => <option value={c} key={c}>{c}</option>)}
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

          <label htmlFor="summaryText">Full summary</label>
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

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
