// src/components/CreateSummaryForm/CreateSummaryForm.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import ReactQuill from "react-quill";
import Quill from "quill";
import slugify from "slugify";
import "quill/dist/quill.snow.css";
import "./CreateSummaryForm.css";

const Clipboard = Quill.import("modules/clipboard");
const Delta = Quill.import("delta");

class CustomClipboard extends Clipboard {
  onPaste(e) {
    try {
      if (e.clipboardData && e.clipboardData.getData("text/plain")) {
        const text = e.clipboardData.getData("text/plain");
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length > 1 && lines.every((line) => line.includes("\t"))) {
          e.preventDefault();
          const tableDelta = new Delta();
          tableDelta.insert({ table: true });
          lines.forEach((line) => {
            const cells = line.split("\t").map((cell) => cell.trim());
            tableDelta.insert({ "table-row": cells });
          });
          tableDelta.insert({ "table-end": true });
          this.quill.updateContents(tableDelta, "user");
          return;
        }
      }
    } catch (err) {
      console.warn("CustomClipboard paste handler error:", err);
    }
    super.onPaste(e);
  }
}
Quill.register("modules/clipboard", CustomClipboard, true);

try {
  const icons = Quill.import("ui/icons");
  icons.internalLink = '<svg viewBox="0 0 18 18"><path d="M7 7h4v1H7z"/></svg>';
} catch (e) {}

const categories = [
  "Apps","Best Books","Book Summaries","Business Concepts","Business Giants",
  "Business Ideas","Business Legends","Business Strategy & Systems","Career Development",
  "Companies & Organizations","Concepts","Concepts Abbreviations","Courses & Learning Paths",
  "Digital Skills & Technology","Entrepreneurship","Leadership & Management","Marketing & Sales",
  "Markets & Geography","Mindset & Motivation","Money & Productivity","People","Quotes",
  "Self-Improvement","Strategic Communication","Tools & Software","Video Insights"
];

const difficulties = [
  { value: "", label: "Not specified (optional)" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
];

const normalize = (s = "") => String(s || "").trim().toLowerCase();
const uniqueWords = (s = "") => Array.from(new Set(normalize(s).split(/\s+/).filter(Boolean)));

function wordMatchScore(a = "", b = "") {
  const aw = uniqueWords(a); const bw = uniqueWords(b);
  if (!aw.length || !bw.length) return 0;
  return aw.filter((w) => bw.includes(w)).length / Math.max(aw.length, bw.length);
}

function longestCommonSubstringRatio(a = "", b = "") {
  const A = String(a || ""), B = String(b || "");
  const n = A.length, m = B.length;
  if (!n || !m) return 0;
  const dp = new Array(m + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = m; j >= 1; j--) {
      if (A[i-1] === B[j-1]) { dp[j] = dp[j-1] + 1; if (dp[j] > best) best = dp[j]; } else dp[j] = 0;
    }
  }
  return best / Math.max(n, m);
}

function combinedScore(candidateTitle = "", query = "") {
  return Math.min(1, 0.55 * wordMatchScore(candidateTitle, query) + 0.35 * longestCommonSubstringRatio(candidateTitle, query) + 0.1 * (normalize(candidateTitle).startsWith(normalize(query)) ? 1 : 0));
}

function generateVariants(word) {
  const w = normalize(word);
  const v = new Set([w]);
  v.add(`${w}s`); v.add(`${w}es`);
  if (w.endsWith("y") && w.length > 1) v.add(`${w.slice(0,-1)}ies`);
  if (w.endsWith("is")) v.add(`${w.slice(0,-2)}es`);
  return Array.from(v);
}

function parseKeywords(input, max = 8) {
  if (!input) return [];
  const seen = new Set(); const uniq = [];
  for (const k of input.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)) {
    if (!seen.has(k)) { seen.add(k); uniq.push(k); if (uniq.length >= max) break; }
  }
  return uniq;
}

// Helper: build /library/ href from a DB row (prefers slug, falls back to id)
const toLibraryHref = (row) => row?.slug ? `/library/${row.slug}` : `/library/${row?.id}`;

const CreateSummaryForm = ({ onClose, onNewSummary }) => {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [affiliateType, setAffiliateType] = useState("book");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tags, setTags] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const quillRef = useRef(null);
  const [showInternalLinkModal, setShowInternalLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState([]);
  const [selectedRangeForLink, setSelectedRangeForLink] = useState(null);

  useEffect(() => {
    if (!title?.trim()) { setSlug(""); return; }
    setSlug(slugify(title, { lower: true, strict: true, replacement: "-" }));
  }, [title]);

  const parsedKeywordsPreview = useMemo(() => parseKeywords(keywordsInput, 8), [keywordsInput]);

  const quillModules = useMemo(() => ({
    toolbar: {
      container: [[{ header: [1,2,3,false] }],["bold","italic","underline","strike"],[{ list:"ordered" },{ list:"bullet" }],["blockquote","code-block"],["link","image"],["internalLink"],["clean"]],
      handlers: {
        internalLink: () => {
          const editor = quillRef.current?.getEditor();
          if (!editor) return;
          const range = editor.getSelection();
          if (!range || range.length === 0) { alert("Select text to link, then click 'Link to summary'."); return; }
          setSelectedRangeForLink(range);
          setShowInternalLinkModal(true);
        },
      },
    },
    clipboard: { matchVisual: false },
  }), []);

  const quillFormats = useMemo(() => ["header","bold","italic","underline","strike","list","bullet","blockquote","code-block","link","image","table"], []);

  // Search — fetch slug too
  useEffect(() => {
    let cancelled = false;
    if (!linkSearch?.trim()) { setLinkResults([]); return; }
    (async () => {
      try {
        const { data, error } = await supabase.from("book_summaries").select("id, title, slug").ilike("title", `%${linkSearch}%`).limit(10);
        if (!cancelled) setLinkResults(error ? [] : (data || []));
      } catch { if (!cancelled) setLinkResults([]); }
    })();
    return () => { cancelled = true; };
  }, [linkSearch]);

  // insertInternalLink — href uses /library/slug
  const insertInternalLink = (summaryItem) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = selectedRangeForLink || editor.getSelection();
    if (!range) { alert("Selection lost. Please re-select text and try again."); setShowInternalLinkModal(false); return; }
    try { editor.focus(); editor.setSelection(range.index, range.length); } catch (e) {}
    let selectedText = "";
    try { if (range.length) selectedText = editor.getText(range.index, range.length).trim(); } catch (e) {}
    if (!selectedText) selectedText = summaryItem.title || "link";
    const linkHref = toLibraryHref(summaryItem);
    try { editor.deleteText(range.index, range.length); editor.insertText(range.index, selectedText, { link: linkHref }, "user"); } catch (e) {}
    const tryAttach = (attempt = 0) => {
      try {
        const [leaf] = editor.getLeaf(range.index);
        const anchor = leaf?.domNode?.parentElement?.tagName === "A" ? leaf.domNode.parentElement : null;
        if (anchor) { anchor.setAttribute("data-summary-id", summaryItem.id); anchor.classList.add("internal-summary-link"); anchor.setAttribute("href", linkHref); return true; }
      } catch (e) {}
      if (attempt < 4) { setTimeout(() => tryAttach(attempt + 1), 30 * (attempt + 1)); return false; }
      try {
        const safe = selectedText.replace(/</g,"&lt;").replace(/>/g,"&gt;");
        editor.deleteText(range.index, selectedText.length);
        editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="${linkHref}">${safe}</a>`);
      } catch (e) {}
    };
    tryAttach(0);
    try { editor.setSelection(range.index + selectedText.length, 0); } catch (e) {}
    try { setSummaryText(editor.root.innerHTML); } catch (e) {}
    setShowInternalLinkModal(false); setLinkSearch(""); setLinkResults([]); setSelectedRangeForLink(null);
  };

  // DB fetch helpers — include slug
  const fetchTitleCandidates = async (text, limit = 200) => {
    const q = String(text || "").trim();
    if (!q) return [];
    try {
      const { data, error } = await supabase.from("book_summaries").select("id, title, slug, keywords").ilike("title", `%${q}%`).limit(limit);
      return error ? [] : (data || []);
    } catch (e) { return []; }
  };

  const fetchKeywordRows = async (limit = 1000) => {
    try {
      const { data, error } = await supabase.from("book_summaries").select("id, title, slug, keywords").not("keywords", "is", null).limit(limit);
      return error ? [] : (data || []);
    } catch (e) { return []; }
  };

  // searchBestMatch — include slug in select
  const searchBestMatch = async (text, opts = { limitCandidates: 50, minScore: 0.6 }) => {
    const q = String(text || "").trim();
    if (!q) return null;
    const tokens = uniqueWords(q);
    const isSingleToken = tokens.length === 1;
    const token = tokens[0] ?? "";

    try { const { data: exact } = await supabase.from("book_summaries").select("id, title, slug").eq("title", q).maybeSingle(); if (exact?.id) return exact; } catch (e) {}
    try { const { data: phrase } = await supabase.from("book_summaries").select("id, title, slug").ilike("title", `%${q}%`).limit(1).maybeSingle(); if (phrase?.id && !isSingleToken) return phrase; } catch (e) {}

    if (isSingleToken) {
      const variants = generateVariants(token);
      try { for (const v of variants) { const { data: eq } = await supabase.from("book_summaries").select("id, title, slug").ilike("title", v).limit(1).maybeSingle(); if (eq?.id) return eq; } } catch (e) {}
      const orFilters = variants.map(t => `title.ilike.%${t}%`).join(",");
      try {
        const { data: candidates = [] } = await supabase.from("book_summaries").select("id, title, slug").or(orFilters).limit(opts.limitCandidates);
        if (!candidates?.length) return null;
        const tvariants = generateVariants(normalize(token));
        const filtered = candidates.filter(c => tvariants.some(v => uniqueWords(c.title || "").includes(v)));
        let best = null, bestScore = 0;
        filtered.forEach(c => { const s = combinedScore(c.title || "", q); if (s > bestScore) { bestScore = s; best = c; } });
        return (best && bestScore >= (opts.minScore ?? 0.7)) ? best : null;
      } catch (e) { return null; }
    }

    try {
      const orFilters = tokens.slice(0, 6).map(t => `title.ilike.%${t}%`).join(",");
      const { data: candidates = [] } = await supabase.from("book_summaries").select("id, title, slug").or(orFilters).limit(opts.limitCandidates);
      if (!candidates?.length) return null;
      let best = null, bestScore = 0;
      candidates.forEach(c => { const s = combinedScore(c.title || "", q); if (s > bestScore) { bestScore = s; best = c; } });
      return (best && bestScore >= (opts.minScore ?? 0.5)) ? best : (best && bestScore > 0.25 ? best : null);
    } catch (e) { return null; }
  };

  // Helper: wrap node in anchor using /library/ href
  const wrapNodeInAnchor = (node, row) => {
    const linkHref = toLibraryHref(row);
    try {
      if (node.closest && node.closest("a")) return false;
      const anchor = document.createElement("a");
      anchor.setAttribute("data-summary-id", row.id);
      anchor.setAttribute("href", linkHref);
      anchor.className = "internal-summary-link";
      node.parentNode && node.parentNode.replaceChild(anchor, node);
      anchor.appendChild(node);
      return true;
    } catch (err) {
      try {
        const safeText = (node.textContent || "").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        const parent = node.parentNode;
        if (parent) { parent.replaceChild(document.createTextNode(""), node); parent.innerHTML += `<a data-summary-id="${row.id}" class="internal-summary-link" href="${linkHref}">${safeText}</a>`; return true; }
      } catch (e) {}
    }
    return false;
  };

  // Collect bold nodes helper
  const collectBoldNodes = (root) => {
    const nodeList = Array.from(root.querySelectorAll("strong, b, .ql-bold, *[style*='font-weight']"));
    const candidates = [];
    nodeList.forEach(node => {
      if (node.closest && node.closest("a")) return;
      let isBold = ["strong","b"].includes(node.tagName?.toLowerCase());
      if (!isBold) { try { const fw = window.getComputedStyle(node).fontWeight; const num = parseInt(fw,10); if (!isNaN(num) && num >= 600) isBold = true; if (fw === "bold" || fw === "bolder") isBold = true; } catch (e) {} }
      if (!isBold) return;
      const text = (node.textContent || "").trim();
      if (!text || text.length < 3) return;
      candidates.push({ text, node });
    });
    const mapByText = new Map();
    candidates.forEach(({ text, node }) => {
      const key = normalize(text);
      if (!mapByText.has(key)) mapByText.set(key, { text: text.trim(), nodes: [node] });
      else mapByText.get(key).nodes.push(node);
    });
    return mapByText;
  };

  // Slug-based link (no DB)
  const autoLinkBoldTextBySlug = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert("Editor not available."); return; }
    const range = editor.getSelection();
    if (!range || range.length === 0) { alert("Please select the text you want to link."); return; }
    let selectedText = "";
    try { selectedText = editor.getText(range.index, range.length).trim(); } catch (e) {}
    if (!selectedText) { alert("Selected text is empty."); return; }
    const generatedSlug = slugify(selectedText, { lower: true, strict: true, replacement: "-" });
    if (!generatedSlug) { alert("Could not generate slug."); return; }
    try { editor.focus(); editor.deleteText(range.index, range.length); editor.insertText(range.index, selectedText, { link: `/library/${generatedSlug}` }, "user"); } catch (e) {}
    const tryAttach = (attempt = 0) => {
      try {
        const [leaf] = editor.getLeaf(range.index);
        const anchor = leaf?.domNode?.parentElement?.tagName === "A" ? leaf.domNode.parentElement : null;
        if (anchor) { anchor.classList.add("slug-summary-link"); anchor.setAttribute("href", `/library/${generatedSlug}`); anchor.setAttribute("data-slug", generatedSlug); return; }
      } catch (e) {}
      if (attempt < 4) { setTimeout(() => tryAttach(attempt + 1), 30 * (attempt + 1)); return; }
      try { const safe = selectedText.replace(/</g,"&lt;").replace(/>/g,"&gt;"); try { editor.deleteText(range.index, selectedText.length); } catch (e) {} editor.clipboard.dangerouslyPasteHTML(range.index, `<a class="slug-summary-link" data-slug="${generatedSlug}" href="/library/${generatedSlug}">${safe}</a>`); } catch (e) {}
    };
    tryAttach(0);
    try { editor.setSelection(range.index + selectedText.length, 0); } catch (e) {}
    try { setSummaryText(editor.root.innerHTML); } catch (e) {}
    alert(`Linked selection to /library/${generatedSlug}`);
  };

  // Exact auto-link
  const autoLinkBoldTextExact = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert("Editor not available."); return; }
    const mapByText = collectBoldNodes(editor.root);
    if (mapByText.size === 0) { alert("No bold text found to auto-link (exact)."); return; }
    let linkedCount = 0;
    for (const [, { text, nodes }] of mapByText.entries()) {
      try {
        let matched = null;
        const variants = generateVariants(text);
        for (const c of await fetchTitleCandidates(text, 50)) {
          if (!c?.title) continue;
          const nt = normalize(c.title);
          if (nt === normalize(text) || variants.includes(nt)) { matched = c; break; }
        }
        if (!matched) {
          for (const c of await fetchKeywordRows(500)) {
            if (!c?.title) continue;
            const nt = normalize(c.title);
            if (nt === normalize(text) || variants.includes(nt)) { matched = c; break; }
          }
        }
        if (!matched?.id) continue;
        nodes.forEach(node => { if (wrapNodeInAnchor(node, matched)) linkedCount++; });
      } catch (err) {}
    }
    try { if (editor.update) editor.update("user"); } catch (e) {}
    try { setSummaryText(editor.root.innerHTML); } catch (e) {}
    alert(`Exact auto-link complete — ${linkedCount} item(s) linked.`);
  };

  // Keyword auto-link
  const autoLinkBoldTextKeywords = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert("Editor not available."); return; }
    const mapByText = collectBoldNodes(editor.root);
    if (mapByText.size === 0) { alert("No bold text found to auto-link (keywords)."); return; }
    let keywordRowsSample = [];
    try { keywordRowsSample = await fetchKeywordRows(800); } catch (e) {}
    let linkedCount = 0;
    for (const [, { text, nodes }] of mapByText.entries()) {
      try {
        const normalizedTokens = uniqueWords(text).map(t => normalize(t));
        const titleCandidates = await fetchTitleCandidates(text, 200);
        const keywordCandidates = keywordRowsSample.filter(r => { try { if (!r?.keywords) return false; const kws = r.keywords.map(k => normalize(String(k || ""))); return normalizedTokens.some(t => kws.includes(t) || kws.some(k => k.includes(t))); } catch (e) { return false; } });
        const byId = new Map();
        titleCandidates.forEach(c => { if (c?.id) byId.set(c.id, c); });
        keywordCandidates.forEach(c => { if (c?.id && !byId.has(c.id)) byId.set(c.id, c); });
        const merged = Array.from(byId.values());
        if (!merged.length) continue;
        let best = null, bestScore = 0;
        for (const c of merged) {
          try {
            let score = combinedScore(c.title || "", text);
            if (normalize(c.title) === normalize(text)) score = Math.max(score, 0.95);
            if (Array.isArray(c.keywords)) {
              const kws = c.keywords.map(k => normalize(String(k || "")));
              if (kws.includes(normalize(text))) score = Math.max(score, score + 0.6);
              else { const matches = normalizedTokens.filter(t => kws.some(k => k === t || k.includes(t))).length; if (matches > 0) score += Math.min(0.35, 0.12 * matches); }
            }
            if (score > 1) score = 1;
            if (score > bestScore) { bestScore = score; best = c; }
          } catch (e) {}
        }
        if (!best?.id || bestScore < 0.65) continue;
        nodes.forEach(node => { if (wrapNodeInAnchor(node, best)) linkedCount++; });
      } catch (err) {}
    }
    try { if (editor.update) editor.update("user"); } catch (e) {}
    try { setSummaryText(editor.root.innerHTML); } catch (e) {}
    alert(`Keyword auto-link complete — ${linkedCount} item(s) linked.`);
  };

  // Fuzzy auto-link
  const autoLinkBoldText = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert("Editor not available."); return; }
    const mapByText = collectBoldNodes(editor.root);
    if (mapByText.size === 0) { alert("No bold text found to auto-link."); return; }
    let linkedCount = 0;
    for (const [, { text, nodes }] of mapByText.entries()) {
      try {
        const isSingleToken = uniqueWords(text).length === 1;
        let best = null;
        if (isSingleToken) { best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.75 }); if (!best) best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.6 }); }
        else { best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.5 }); if (!best) best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.4 }); }
        if (!best?.id) continue;
        nodes.forEach(node => { if (wrapNodeInAnchor(node, best)) linkedCount++; });
      } catch (err) {}
    }
    try { if (editor.update) editor.update("user"); } catch (e) {}
    try { setSummaryText(editor.root.innerHTML); } catch (e) {}
    alert(`Auto-linking complete — ${linkedCount} item(s) linked.`);
  };

  const removeInternalLinksAndBold = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert("Editor not available."); return; }
    const anchors = Array.from(editor.root.querySelectorAll('a[data-summary-id].internal-summary-link, a[data-summary-id]'));
    if (!anchors.length) { alert("No internal links found."); return; }
    let removed = 0;
    anchors.forEach(a => { try { const strong = document.createElement("strong"); strong.textContent = (a.textContent || "").trim(); a.parentNode?.replaceChild(strong, a); removed++; } catch (e) {} });
    try { if (editor.update) editor.update("user"); } catch (e) {}
    try { setSummaryText(editor.root.innerHTML); } catch (e) {}
    alert(`Removed ${removed} internal link(s) and made them bold.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (!title.trim()) { setErrorMsg("Title is required."); return; }
    if (!author.trim()) { setErrorMsg("Author is required."); return; }
    setLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) { setErrorMsg("You must be logged in to create a summary."); setLoading(false); return; }
      let finalSlug = slug || slugify(title || "", { lower: true, strict: true, replacement: "-" });
      try {
        const { data: existing } = await supabase.from("book_summaries").select("id").eq("slug", finalSlug).maybeSingle();
        if (existing) {
          let counter = 2;
          while (true) {
            const newSlug = `${finalSlug}-${counter}`;
            const { data: exists } = await supabase.from("book_summaries").select("id").eq("slug", newSlug).maybeSingle();
            if (!exists) { finalSlug = newSlug; break; }
            if (++counter > 1000) { finalSlug = `${finalSlug}-${Date.now()}`; break; }
          }
        }
      } catch (err) {}
      const parsedTags = (tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
      const parsedKeywords = parseKeywords(keywordsInput, 8);
      const affiliateValue = affiliateLink?.trim() ? `${affiliateType}|${affiliateLink.trim()}` : null;
      const difficultyToSave = ["Beginner","Intermediate","Advanced"].includes(difficulty) ? difficulty : null;
      const finalDescription = description?.trim() || String(summaryText || "").replace(/<[^>]*>/g, "").slice(0, 200);
      const { error } = await supabase.from("book_summaries").insert([{
        title: title.trim(), author: author.trim(), description: finalDescription,
        summary: summaryText || null, category, user_id: user.id,
        image_url: imageUrl || null, affiliate_link: affiliateValue,
        youtube_url: youtubeUrl || null, tags: parsedTags,
        keywords: parsedKeywords.length ? parsedKeywords : null,
        slug: finalSlug || null, difficulty_level: difficultyToSave,
      }]);
      setLoading(false);
      if (error) setErrorMsg(error.message || "Error creating summary.");
      else { if (typeof onNewSummary === "function") onNewSummary(); if (typeof onClose === "function") onClose(); }
    } catch (err) { console.error("Unexpected submit error:", err); setErrorMsg("Unexpected error. See console."); setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Create a New Summary</h2>
        {errorMsg && <div className="form-error">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="summary-form">
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
          {slug && <small className="slug-preview">Generated slug: <code>/library/{slug}</code></small>}
          <label>Author</label>
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)} required />
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} required>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <label>Difficulty level (optional)</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>{difficulties.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
          <label>Description (short preview for feeds)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description (150-250 chars)" maxLength={300} rows={3} />
          <label>Book Cover Image URL</label>
          <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/cover.jpg" />
          <label>Affiliate Link</label>
          <div className="affiliate-row" style={{ display:"flex", gap:8, alignItems:"center", width:"100%", marginBottom:6 }}>
            <input type="url" value={affiliateLink} onChange={e => setAffiliateLink(e.target.value)} placeholder="Affiliate link (https://...)" style={{ flex:1, minWidth:0, padding:"8px 10px" }} />
            <select value={affiliateType} onChange={e => setAffiliateType(e.target.value)} style={{ width:"12%", minWidth:100, padding:"6px 8px" }}>
              <option value="book">Get Book</option><option value="pdf">Get PDF</option><option value="app">Open App</option>
            </select>
          </div>
          <label>YouTube URL</label>
          <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          <label>Tags (comma separated)</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="business, leadership, strategy" />
          <label>Keywords (optional, comma separated)</label>
          <input type="text" value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} placeholder="e.g. business strategy, growth, productivity" />
          <div style={{ fontSize:12, color:"#6b7280", marginBottom:8 }}>
            <span>{parsedKeywordsPreview.length} / 8 keywords</span>
            <span style={{ marginLeft:8 }}>Normalized, deduped, limited to 8.</span>
          </div>
          <label>Summary</label>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextBySlug}>🔗 Slug-link bold text</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldText}>🔗 Auto-link bold text</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextExact}>🎯 Exact auto-link</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextKeywords}>🧠 Keyword auto-link</button>
            <button type="button" className="hf-btn" onClick={removeInternalLinksAndBold}>✂️ Remove links & bold</button>
            <button type="button" className="hf-btn" onClick={() => setShowInternalLinkModal(true)}>🔎 Manual link</button>
            <div style={{ color:"#6b7280", fontSize:12, marginLeft:8 }}>All links use /library/ route.</div>
          </div>
          <div className="quill-container">
            <ReactQuill ref={quillRef} value={summaryText} onChange={setSummaryText} modules={quillModules} formats={quillFormats} theme="snow" />
          </div>
          <button type="submit" disabled={loading} style={{ marginTop:12 }}>{loading ? "Submitting..." : "Submit Summary"}</button>
        </form>

        {showInternalLinkModal && (
          <div className="internal-link-modal" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(""); setLinkResults([]); }}>
            <div className="internal-link-box" onClick={e => e.stopPropagation()}>
              <h4>Link to summary</h4>
              <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Search summaries by title..." autoFocus />
              <div className="link-results" style={{ maxHeight:260, overflowY:"auto", marginTop:8 }}>
                {linkResults.length === 0 && <div style={{ padding:8, color:"#666" }}>No results</div>}
                <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                  {linkResults.map(r => (
                    <li key={r.id} style={{ marginBottom:6 }}>
                      <button type="button" className="hf-btn" onClick={() => insertInternalLink(r)} style={{ width:"100%", textAlign:"left" }}>{r.title}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop:10, display:"flex", gap:8 }}>
                <button className="hf-btn" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(""); setLinkResults([]); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateSummaryForm;