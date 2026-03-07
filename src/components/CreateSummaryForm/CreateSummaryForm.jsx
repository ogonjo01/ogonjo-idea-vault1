// src/components/CreateSummaryForm/CreateSummaryForm.jsx
// ─────────────────────────────────────────────────────────────
//  NEW FEATURES:
//   • Default status = 'draft'  (auto-saves every 30s)
//   • Choosing a real category unlocks "Publish" button
//   • Duplicate-title check fires only on Publish
//   • Delete article button with confirmation dialog
//   • Manual "Save Draft" button
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "../../supabase/supabaseClient";
import ReactQuill from "react-quill";
import Quill from "quill";
import slugify from "slugify";
import "quill/dist/quill.snow.css";
import "./CreateSummaryForm.css";

/* ── Quill clipboard patch (unchanged from original) ─────── */
const Clipboard = Quill.import("modules/clipboard");
const Delta = Quill.import("delta");
class CustomClipboard extends Clipboard {
  onPaste(e) {
    try {
      if (e.clipboardData?.getData("text/plain")) {
        const text = e.clipboardData.getData("text/plain");
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length > 1 && lines.every((l) => l.includes("\t"))) {
          e.preventDefault();
          const td = new Delta();
          td.insert({ table: true });
          lines.forEach((l) => td.insert({ "table-row": l.split("\t").map((c) => c.trim()) }));
          td.insert({ "table-end": true });
          this.quill.updateContents(td, "user");
          return;
        }
      }
    } catch (err) { console.warn("paste error", err); }
    super.onPaste(e);
  }
}
Quill.register("modules/clipboard", CustomClipboard, true);
try { const icons = Quill.import("ui/icons"); icons.internalLink = '<svg viewBox="0 0 18 18"><path d="M7 7h4v1H7z"/></svg>'; } catch (_) {}

/* ── Constants ──────────────────────────────────────────── */
const REAL_CATEGORIES = [
  "Apps","Best Books","Book Summaries","Business Concepts","Business Giants",
  "Business Ideas","Business Legends","Business Strategy & Systems","Career Development",
  "Companies & Organizations","Concepts","Concepts Abbreviations","Courses & Learning Paths",
  "Digital Skills & Technology","Entrepreneurship","Leadership & Management","Marketing & Sales",
  "Markets & Geography","Mindset & Motivation","Money & Productivity","People","Quotes",
  "Self-Improvement","Strategic Communication","Tools & Software","Video Insights",
];
const DRAFT_SENTINEL = "__DRAFT__";
const DIFFICULTIES = [
  { value: "", label: "Not specified (optional)" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
];
const AUTO_SAVE_MS = 30_000;

/* ── Pure helpers (unchanged from original) ─────────────── */
const normalize = (s = "") => String(s || "").trim().toLowerCase();
const uniqueWords = (s = "") => Array.from(new Set(normalize(s).split(/\s+/).filter(Boolean)));
const wordMatchScore = (a = "", b = "") => { const aw = uniqueWords(a), bw = uniqueWords(b); if (!aw.length || !bw.length) return 0; return aw.filter((w) => bw.includes(w)).length / Math.max(aw.length, bw.length); };
const lcsr = (a = "", b = "") => { const A = String(a||""), B = String(b||""); const n = A.length, m = B.length; if (!n||!m) return 0; const dp = new Array(m+1).fill(0); let best=0; for (let i=1;i<=n;i++) for (let j=m;j>=1;j--) { if (A[i-1]===B[j-1]) { dp[j]=dp[j-1]+1; if (dp[j]>best) best=dp[j]; } else dp[j]=0; } return best/Math.max(n,m); };
const combinedScore = (cand = "", q = "") => Math.min(1, 0.55*wordMatchScore(cand,q) + 0.35*lcsr(cand,q) + 0.1*(normalize(cand).startsWith(normalize(q))?1:0));
const generateVariants = (word) => { const w=normalize(word); const v=new Set([w]); v.add(`${w}s`); v.add(`${w}es`); if (w.endsWith("y")&&w.length>1) v.add(`${w.slice(0,-1)}ies`); if (w.endsWith("is")) v.add(`${w.slice(0,-2)}es`); return Array.from(v); };
const parseKeywords = (input, max=8) => { if (!input) return []; const seen=new Set(),uniq=[]; for (const k of input.split(",").map(k=>k.trim().toLowerCase()).filter(Boolean)) { if (!seen.has(k)) { seen.add(k); uniq.push(k); if (uniq.length>=max) break; } } return uniq; };
const toLibraryHref = (row) => row?.slug ? `/library/${row.slug}` : `/library/${row?.id}`;

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
const CreateSummaryForm = ({ onClose, onNewSummary, editingSummary = null }) => {
  // editingSummary: pass a full summary row to edit an existing article

  /* ── Form fields ──────────────────────────────────────── */
  const [title, setTitle]             = useState(editingSummary?.title || "");
  const [slug, setSlug]               = useState(editingSummary?.slug || "");
  const [author, setAuthor]           = useState(editingSummary?.author || "");
  const [description, setDescription] = useState(editingSummary?.description || "");
  const [summaryText, setSummaryText] = useState(editingSummary?.summary || "");
  const [category, setCategory]       = useState(editingSummary?.category || DRAFT_SENTINEL);
  const [imageUrl, setImageUrl]       = useState(editingSummary?.image_url || "");
  const [affiliateLink, setAffiliateLink] = useState(() => {
    const r = editingSummary?.affiliate_link || "";
    return r.includes("|") ? r.split("|")[1] : r;
  });
  const [affiliateType, setAffiliateType] = useState(() => {
    const r = editingSummary?.affiliate_link || "";
    return r.includes("|") ? r.split("|")[0] : "book";
  });
  const [youtubeUrl, setYoutubeUrl]   = useState(editingSummary?.youtube_url || "");
  const [tags, setTags]               = useState((editingSummary?.tags || []).join(", "));
  const [keywordsInput, setKeywordsInput] = useState((editingSummary?.keywords || []).join(", "));
  const [difficulty, setDifficulty]   = useState(editingSummary?.difficulty_level || "");

  /* ── Draft / status state ─────────────────────────────── */
  const [draftId, setDraftId]         = useState(editingSummary?.id || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // idle|saving|saved|error
  const autoSaveTimer                 = useRef(null);
  const lastSnapshotRef               = useRef(null);

  /* ── UI state ─────────────────────────────────────────── */
  const [loading, setLoading]         = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [titleDupeWarning, setTitleDupeWarning] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Quill / link modal state (unchanged) ─────────────── */
  const quillRef = useRef(null);
  const [showLinkModal, setShowLinkModal]     = useState(false);
  const [linkSearch, setLinkSearch]           = useState("");
  const [linkResults, setLinkResults]         = useState([]);
  const [selectedRange, setSelectedRange]     = useState(null);

  const parsedKeywordsPreview = useMemo(() => parseKeywords(keywordsInput, 8), [keywordsInput]);

  /* ── Slug from title ──────────────────────────────────── */
  useEffect(() => {
    if (!editingSummary && title?.trim())
      setSlug(slugify(title, { lower:true, strict:true, replacement:"-" }));
    else if (!title?.trim())
      setSlug("");
  }, [title, editingSummary]);

  /* ── Quill modules ────────────────────────────────────── */
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [[{header:[1,2,3,false]}],["bold","italic","underline","strike"],[{list:"ordered"},{list:"bullet"}],["blockquote","code-block"],["link","image"],["internalLink"],["clean"]],
      handlers: {
        internalLink: () => {
          const editor = quillRef.current?.getEditor();
          if (!editor) return;
          const range = editor.getSelection();
          if (!range || range.length===0) { alert("Select text to link first."); return; }
          setSelectedRange(range);
          setShowLinkModal(true);
        },
      },
    },
    clipboard: { matchVisual: false },
  }), []);
  const quillFormats = useMemo(() => ["header","bold","italic","underline","strike","list","bullet","blockquote","code-block","link","image","table"], []);

  /* ── Internal link search ─────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    if (!linkSearch?.trim()) { setLinkResults([]); return; }
    (async () => {
      try {
        const { data, error } = await supabase.from("book_summaries").select("id, title, slug").ilike("title", `%${linkSearch}%`).limit(10);
        if (!cancelled) setLinkResults(error ? [] : (data||[]));
      } catch { if (!cancelled) setLinkResults([]); }
    })();
    return () => { cancelled = true; };
  }, [linkSearch]);

  /* ══════════════════════════════════════════════════════
     AUTO-SAVE
  ══════════════════════════════════════════════════════ */
  const buildSnapshot = useCallback(() =>
    JSON.stringify({ title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywordsInput, difficulty }),
    [title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywordsInput, difficulty]
  );

  const saveDraft = useCallback(async () => {
    if (!title.trim() && !summaryText.trim()) return null;
    setAutoSaveStatus("saving");
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) { setAutoSaveStatus("error"); return null; }

      let finalSlug = slug || slugify(title || `draft-${Date.now()}`, { lower:true, strict:true, replacement:"-" });
      const payload = {
        title:            title.trim() || "Untitled Draft",
        author:           author.trim() || "",
        description:      description?.trim() || String(summaryText||"").replace(/<[^>]*>/g,"").slice(0,200),
        summary:          summaryText || null,
        category:         category === DRAFT_SENTINEL ? null : category,
        user_id:          user.id,
        image_url:        imageUrl || null,
        affiliate_link:   affiliateLink?.trim() ? `${affiliateType}|${affiliateLink.trim()}` : null,
        youtube_url:      youtubeUrl || null,
        tags:             (tags||"").split(",").map(t=>t.trim().toLowerCase()).filter(Boolean),
        keywords:         parseKeywords(keywordsInput,8).length ? parseKeywords(keywordsInput,8) : null,
        slug:             finalSlug,
        difficulty_level: ["Beginner","Intermediate","Advanced"].includes(difficulty) ? difficulty : null,
        status:           "draft",
        auto_saved_at:    new Date().toISOString(),
      };

      if (draftId) {
        const { error } = await supabase.from("book_summaries").update(payload).eq("id", draftId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        // Slug collision check
        try {
          const { data: ex } = await supabase.from("book_summaries").select("id").eq("slug", finalSlug).maybeSingle();
          if (ex) {
            let c=2;
            while (true) {
              const ns = `${finalSlug}-${c}`;
              const { data: ex2 } = await supabase.from("book_summaries").select("id").eq("slug", ns).maybeSingle();
              if (!ex2) { finalSlug = ns; payload.slug = finalSlug; break; }
              if (++c>1000) { finalSlug=`${finalSlug}-${Date.now()}`; payload.slug=finalSlug; break; }
            }
          }
        } catch (_) {}
        const { data: ins, error } = await supabase.from("book_summaries").insert([payload]).select("id").single();
        if (error) throw error;
        setDraftId(ins.id);
      }
      lastSnapshotRef.current = buildSnapshot();
      setAutoSaveStatus("saved");
      return draftId;
    } catch (err) {
      console.error("Auto-save error:", err);
      setAutoSaveStatus("error");
      return null;
    }
  }, [title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywordsInput, difficulty, draftId, slug, buildSnapshot]);

  /* Auto-save timer */
  useEffect(() => {
    if (!title.trim() && !summaryText.trim()) return;
    if (buildSnapshot() === lastSnapshotRef.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(saveDraft, AUTO_SAVE_MS);
    return () => clearTimeout(autoSaveTimer.current);
  }, [title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywordsInput, difficulty, saveDraft, buildSnapshot]);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  /* ══════════════════════════════════════════════════════
     DUPLICATE TITLE CHECK  (on Publish only)
  ══════════════════════════════════════════════════════ */
  const checkTitleDuplicate = useCallback(async (t, excludeId = null) => {
    if (!t?.trim()) return false;
    try {
      let q = supabase.from("book_summaries").select("id").ilike("title", t.trim()).eq("status","published");
      if (excludeId) q = q.neq("id", excludeId);
      const { data } = await q.limit(1).maybeSingle();
      return !!data;
    } catch { return false; }
  }, []);

  /* ══════════════════════════════════════════════════════
     PUBLISH
  ══════════════════════════════════════════════════════ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(""); setTitleDupeWarning("");
    if (!title.trim()) { setErrorMsg("Title is required."); return; }
    if (!author.trim()) { setErrorMsg("Author is required."); return; }
    const publishCategory = category === DRAFT_SENTINEL ? null : category;
    if (!publishCategory) { await saveDraft(); return; } // no category = save as draft

    // Duplicate check
    const isDupe = await checkTitleDuplicate(title.trim(), draftId);
    if (isDupe) {
      setTitleDupeWarning(`⚠️ A published article called "${title.trim()}" already exists. Change the title before publishing.`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) { setErrorMsg("You must be logged in."); setLoading(false); return; }

      let finalSlug = slug || slugify(title||"", { lower:true, strict:true, replacement:"-" });
      if (!draftId) {
        try {
          const { data: ex } = await supabase.from("book_summaries").select("id").eq("slug", finalSlug).maybeSingle();
          if (ex) {
            let c=2; while (true) { const ns=`${finalSlug}-${c}`; const { data: ex2 } = await supabase.from("book_summaries").select("id").eq("slug", ns).maybeSingle(); if (!ex2) { finalSlug=ns; break; } if (++c>1000) { finalSlug=`${finalSlug}-${Date.now()}`; break; } }
          }
        } catch (_) {}
      }

      const payload = {
        title: title.trim(), author: author.trim(),
        description: description?.trim() || String(summaryText||"").replace(/<[^>]*>/g,"").slice(0,200),
        summary: summaryText||null, category: publishCategory, user_id: user.id,
        image_url: imageUrl||null,
        affiliate_link: affiliateLink?.trim() ? `${affiliateType}|${affiliateLink.trim()}` : null,
        youtube_url: youtubeUrl||null,
        tags: (tags||"").split(",").map(t=>t.trim().toLowerCase()).filter(Boolean),
        keywords: parseKeywords(keywordsInput,8).length ? parseKeywords(keywordsInput,8) : null,
        slug: finalSlug||null,
        difficulty_level: ["Beginner","Intermediate","Advanced"].includes(difficulty) ? difficulty : null,
        status: "published",
        auto_saved_at: null,
      };

      const { error } = draftId
        ? await supabase.from("book_summaries").update(payload).eq("id", draftId).eq("user_id", user.id)
        : await supabase.from("book_summaries").insert([payload]);

      setLoading(false);
      if (error) setErrorMsg(error.message || "Error publishing.");
      else {
        if (typeof onNewSummary === "function") onNewSummary();
        if (typeof onClose === "function") onClose();
      }
    } catch (err) { console.error(err); setErrorMsg("Unexpected error."); setLoading(false); }
  };

  /* ══════════════════════════════════════════════════════
     DELETE
  ══════════════════════════════════════════════════════ */
  const handleDelete = async () => {
    if (!draftId) return;
    setDeleteLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("book_summaries").delete().eq("id", draftId).eq("user_id", user.id);
      if (error) throw error;
      setShowDeleteConfirm(false);
      if (typeof onNewSummary === "function") onNewSummary();
      if (typeof onClose === "function") onClose();
    } catch (err) {
      console.error("Delete error:", err);
      alert(`Could not delete: ${err.message}`);
    } finally { setDeleteLoading(false); }
  };

  /* ── Auto-link helpers (all unchanged) ────────────────── */
  const fetchTitleCandidates = async (text, limit=200) => { if (!text?.trim()) return []; try { const { data, error } = await supabase.from("book_summaries").select("id, title, slug, keywords").ilike("title", `%${text.trim()}%`).limit(limit); return error?[]:(data||[]); } catch { return []; } };
  const fetchKeywordRows = async (limit=1000) => { try { const { data, error } = await supabase.from("book_summaries").select("id, title, slug, keywords").not("keywords","is",null).limit(limit); return error?[]:(data||[]); } catch { return []; } };
  const searchBestMatch = async (text, opts={limitCandidates:50,minScore:0.6}) => {
    const q=String(text||"").trim(); if (!q) return null;
    const tokens=uniqueWords(q); const isSingle=tokens.length===1; const token=tokens[0]??"";
    try { const { data: ex } = await supabase.from("book_summaries").select("id,title,slug").eq("title",q).maybeSingle(); if (ex?.id) return ex; } catch (_) {}
    try { const { data: ph } = await supabase.from("book_summaries").select("id,title,slug").ilike("title",`%${q}%`).limit(1).maybeSingle(); if (ph?.id&&!isSingle) return ph; } catch (_) {}
    if (isSingle) {
      const variants=generateVariants(token);
      try { for (const v of variants) { const { data: eq } = await supabase.from("book_summaries").select("id,title,slug").ilike("title",v).limit(1).maybeSingle(); if (eq?.id) return eq; } } catch (_) {}
      const orF=variants.map(t=>`title.ilike.%${t}%`).join(",");
      try { const { data: cands=[] } = await supabase.from("book_summaries").select("id,title,slug").or(orF).limit(opts.limitCandidates); if (!cands?.length) return null; const tv=generateVariants(normalize(token)); const filtered=cands.filter(c=>tv.some(v=>uniqueWords(c.title||"").includes(v))); let best=null,bs=0; filtered.forEach(c=>{const s=combinedScore(c.title||"",q);if(s>bs){bs=s;best=c;}}); return (best&&bs>=(opts.minScore??0.7))?best:null; } catch { return null; }
    }
    try { const orF=tokens.slice(0,6).map(t=>`title.ilike.%${t}%`).join(","); const { data: cands=[] } = await supabase.from("book_summaries").select("id,title,slug").or(orF).limit(opts.limitCandidates); if (!cands?.length) return null; let best=null,bs=0; cands.forEach(c=>{const s=combinedScore(c.title||"",q);if(s>bs){bs=s;best=c;}}); return (best&&bs>=(opts.minScore??0.5))?best:(best&&bs>0.25?best:null); } catch { return null; }
  };
  const wrapNodeInAnchor = (node, row) => {
    const href=toLibraryHref(row);
    try { if (node.closest?.("a")) return false; const a=document.createElement("a"); a.setAttribute("data-summary-id",row.id); a.setAttribute("href",href); a.className="internal-summary-link"; node.parentNode&&node.parentNode.replaceChild(a,node); a.appendChild(node); return true; } catch (_) {}
    try { const safe=(node.textContent||"").replace(/</g,"&lt;").replace(/>/g,"&gt;"); const p=node.parentNode; if (p) { p.replaceChild(document.createTextNode(""),node); p.innerHTML+=`<a data-summary-id="${row.id}" class="internal-summary-link" href="${href}">${safe}</a>`; return true; } } catch (_) {}
    return false;
  };
  const collectBoldNodes = (root) => {
    const nl=Array.from(root.querySelectorAll("strong,b,.ql-bold,*[style*='font-weight']")); const cands=[]; nl.forEach(n=>{if(n.closest?.("a"))return;let b=["strong","b"].includes(n.tagName?.toLowerCase());if(!b){try{const fw=window.getComputedStyle(n).fontWeight;const num=parseInt(fw,10);if(!isNaN(num)&&num>=600)b=true;if(fw==="bold"||fw==="bolder")b=true;}catch(_){}}if(!b)return;const t=(n.textContent||"").trim();if(!t||t.length<3)return;cands.push({text:t,node:n});});
    const map=new Map(); cands.forEach(({text,node})=>{const k=normalize(text);if(!map.has(k))map.set(k,{text:text.trim(),nodes:[node]});else map.get(k).nodes.push(node);}); return map;
  };
  const autoLinkBoldTextBySlug = () => { const editor=quillRef.current?.getEditor(); if(!editor){alert("Editor not available.");return;}const range=editor.getSelection();if(!range||range.length===0){alert("Please select the text.");return;}let sel="";try{sel=editor.getText(range.index,range.length).trim();}catch(_){}if(!sel){alert("Selected text is empty.");return;}const gs=slugify(sel,{lower:true,strict:true,replacement:"-"});if(!gs){alert("Could not generate slug.");return;}try{editor.focus();editor.deleteText(range.index,range.length);editor.insertText(range.index,sel,{link:`/library/${gs}`},"user");}catch(_){}setTimeout(()=>{try{const[leaf]=editor.getLeaf(range.index);const a=leaf?.domNode?.parentElement?.tagName==="A"?leaf.domNode.parentElement:null;if(a){a.classList.add("slug-summary-link");a.setAttribute("href",`/library/${gs}`);a.setAttribute("data-slug",gs);}}catch(_){}},60);try{editor.setSelection(range.index+sel.length,0);}catch(_){}try{setSummaryText(editor.root.innerHTML);}catch(_){}alert(`Linked to /library/${gs}`); };
  const autoLinkBoldTextExact = async () => { const editor=quillRef.current?.getEditor(); if(!editor)return; const map=collectBoldNodes(editor.root); if(!map.size){alert("No bold text found.");return;}let cnt=0; for(const[,{text,nodes}]of map.entries()){try{let m=null;const v=generateVariants(text);for(const c of await fetchTitleCandidates(text,50)){if(!c?.title)continue;const nt=normalize(c.title);if(nt===normalize(text)||v.includes(nt)){m=c;break;}}if(!m)for(const c of await fetchKeywordRows(500)){if(!c?.title)continue;const nt=normalize(c.title);if(nt===normalize(text)||v.includes(nt)){m=c;break;}}if(!m?.id)continue;nodes.forEach(n=>{if(wrapNodeInAnchor(n,m))cnt++;});}catch(_){}}try{if(editor.update)editor.update("user");}catch(_){}try{setSummaryText(editor.root.innerHTML);}catch(_){}alert(`Exact auto-link — ${cnt} linked.`); };
  const autoLinkBoldTextKeywords = async () => { const editor=quillRef.current?.getEditor(); if(!editor)return; const map=collectBoldNodes(editor.root); if(!map.size){alert("No bold text found.");return;}let kws=[];try{kws=await fetchKeywordRows(800);}catch(_){}let cnt=0; for(const[,{text,nodes}]of map.entries()){try{const nt=uniqueWords(text).map(t=>normalize(t));const tc=await fetchTitleCandidates(text,200);const kc=kws.filter(r=>{try{if(!r?.keywords)return false;const ks=r.keywords.map(k=>normalize(String(k||"")));return nt.some(t=>ks.includes(t)||ks.some(k=>k.includes(t)));}catch(_){return false;}});const byId=new Map();tc.forEach(c=>{if(c?.id)byId.set(c.id,c);});kc.forEach(c=>{if(c?.id&&!byId.has(c.id))byId.set(c.id,c);});const merged=Array.from(byId.values());if(!merged.length)continue;let best=null,bs=0;for(const c of merged){try{let s=combinedScore(c.title||"",text);if(normalize(c.title)===normalize(text))s=Math.max(s,0.95);if(Array.isArray(c.keywords)){const ks=c.keywords.map(k=>normalize(String(k||"")));if(ks.includes(normalize(text)))s=Math.max(s,s+0.6);else{const m=nt.filter(t=>ks.some(k=>k===t||k.includes(t))).length;if(m>0)s+=Math.min(0.35,0.12*m);}}if(s>1)s=1;if(s>bs){bs=s;best=c;}}catch(_){}}if(!best?.id||bs<0.65)continue;nodes.forEach(n=>{if(wrapNodeInAnchor(n,best))cnt++;});}catch(_){}}try{if(editor.update)editor.update("user");}catch(_){}try{setSummaryText(editor.root.innerHTML);}catch(_){}alert(`Keyword auto-link — ${cnt} linked.`); };
  const autoLinkBoldText = async () => { const editor=quillRef.current?.getEditor(); if(!editor)return; const map=collectBoldNodes(editor.root); if(!map.size){alert("No bold text found.");return;}let cnt=0; for(const[,{text,nodes}]of map.entries()){try{const single=uniqueWords(text).length===1;let best=null;if(single){best=await searchBestMatch(text,{limitCandidates:50,minScore:0.75});if(!best)best=await searchBestMatch(text,{limitCandidates:50,minScore:0.6});}else{best=await searchBestMatch(text,{limitCandidates:50,minScore:0.5});if(!best)best=await searchBestMatch(text,{limitCandidates:50,minScore:0.4});}if(!best?.id)continue;nodes.forEach(n=>{if(wrapNodeInAnchor(n,best))cnt++;});}catch(_){}}try{if(editor.update)editor.update("user");}catch(_){}try{setSummaryText(editor.root.innerHTML);}catch(_){}alert(`Auto-link — ${cnt} linked.`); };
  const removeInternalLinksAndBold = () => { const editor=quillRef.current?.getEditor(); if(!editor)return; const as=Array.from(editor.root.querySelectorAll('a[data-summary-id].internal-summary-link,a[data-summary-id]')); if(!as.length){alert("No internal links found.");return;}let r=0; as.forEach(a=>{try{const s=document.createElement("strong");s.textContent=(a.textContent||"").trim();a.parentNode?.replaceChild(s,a);r++;}catch(_){}}); try{if(editor.update)editor.update("user");}catch(_){} try{setSummaryText(editor.root.innerHTML);}catch(_){} alert(`Removed ${r} link(s).`); };
  const insertInternalLink = (item) => {
    const editor=quillRef.current?.getEditor(); if(!editor)return;
    const range=selectedRange||editor.getSelection(); if(!range){alert("Selection lost.");setShowLinkModal(false);return;}
    try{editor.focus();editor.setSelection(range.index,range.length);}catch(_){}
    let sel="";try{if(range.length)sel=editor.getText(range.index,range.length).trim();}catch(_){}if(!sel)sel=item.title||"link";
    const href=toLibraryHref(item);
    try{editor.deleteText(range.index,range.length);editor.insertText(range.index,sel,{link:href},"user");}catch(_){}
    const tryA=(att=0)=>{try{const[leaf]=editor.getLeaf(range.index);const a=leaf?.domNode?.parentElement?.tagName==="A"?leaf.domNode.parentElement:null;if(a){a.setAttribute("data-summary-id",item.id);a.classList.add("internal-summary-link");a.setAttribute("href",href);return true;}}catch(_){}if(att<4){setTimeout(()=>tryA(att+1),30*(att+1));return false;}try{const safe=sel.replace(/</g,"&lt;").replace(/>/g,"&gt;");editor.deleteText(range.index,sel.length);editor.clipboard.dangerouslyPasteHTML(range.index,`<a data-summary-id="${item.id}" class="internal-summary-link" href="${href}">${safe}</a>`);}catch(_){}};
    tryA(0);try{editor.setSelection(range.index+sel.length,0);}catch(_){}try{setSummaryText(editor.root.innerHTML);}catch(_){}setShowLinkModal(false);setLinkSearch("");setLinkResults([]);setSelectedRange(null);
  };

  const isDraftMode = category === DRAFT_SENTINEL;
  const canPublish  = !isDraftMode;
  const autoSaveLabel = { idle:"", saving:"💾 Saving draft…", saved:"✅ Draft saved", error:"⚠️ Auto-save failed" }[autoSaveStatus];

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <button className="close-button" onClick={onClose}>&times;</button>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <h2 style={{ margin:0 }}>
            {editingSummary ? "Edit Summary" : "Create New Summary"}
          </h2>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {autoSaveLabel && (
              <span style={{ fontSize:13, color: autoSaveStatus==="error"?"#ef4444":"#6b7280" }}>
                {autoSaveLabel}
              </span>
            )}
            {isDraftMode && (
              <span style={{ background:"#fef3c7", color:"#92400e", border:"1px solid #fbbf24", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:600 }}>
                DRAFT
              </span>
            )}
          </div>
        </div>

        {errorMsg && <div className="form-error">{errorMsg}</div>}
        {titleDupeWarning && (
          <div className="form-error" style={{ background:"#fef3c7", borderColor:"#fbbf24", color:"#92400e" }}>
            {titleDupeWarning}
          </div>
        )}

        <form onSubmit={handleSubmit} className="summary-form">
          <label>Title</label>
          <input type="text" value={title} onChange={e=>{setTitle(e.target.value);setTitleDupeWarning("");}} required />
          {slug && <small className="slug-preview">Generated slug: <code>/library/{slug}</code></small>}

          <label>Author</label>
          <input type="text" value={author} onChange={e=>setAuthor(e.target.value)} required />

          {/* Category / status selector */}
          <label>
            Category
            <span style={{ color:"#6b7280", fontWeight:400, fontSize:12, marginLeft:6 }}>
              — select a category to enable publishing
            </span>
          </label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value={DRAFT_SENTINEL}>📝 Keep as Draft (auto-save)</option>
            {REAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label>Difficulty level (optional)</label>
          <select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
            {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          <label>Description (short preview for feeds)</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Short description (150-250 chars)" maxLength={300} rows={3} />

          <label>Book Cover Image URL</label>
          <input type="url" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://example.com/cover.jpg" />

          <label>Affiliate Link</label>
          <div className="affiliate-row" style={{ display:"flex", gap:8, alignItems:"center", width:"100%", marginBottom:6 }}>
            <input type="url" value={affiliateLink} onChange={e=>setAffiliateLink(e.target.value)} placeholder="Affiliate link (https://...)" style={{ flex:1, minWidth:0, padding:"8px 10px" }} />
            <select value={affiliateType} onChange={e=>setAffiliateType(e.target.value)} style={{ width:"12%", minWidth:100, padding:"6px 8px" }}>
              <option value="book">Get Book</option>
              <option value="pdf">Get PDF</option>
              <option value="app">Open App</option>
            </select>
          </div>

          <label>YouTube URL</label>
          <input type="url" value={youtubeUrl} onChange={e=>setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />

          <label>Tags (comma separated)</label>
          <input type="text" value={tags} onChange={e=>setTags(e.target.value)} placeholder="business, leadership, strategy" />

          <label>Keywords (optional, comma separated)</label>
          <input type="text" value={keywordsInput} onChange={e=>setKeywordsInput(e.target.value)} placeholder="e.g. business strategy, growth, productivity" />
          <div style={{ fontSize:12, color:"#6b7280", marginBottom:8 }}>
            {parsedKeywordsPreview.length} / 8 keywords — normalized, deduped.
          </div>

          <label>Summary</label>
          <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextBySlug}>🔗 Slug-link bold</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldText}>🔗 Auto-link bold</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextExact}>🎯 Exact auto-link</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextKeywords}>🧠 Keyword auto-link</button>
            <button type="button" className="hf-btn" onClick={removeInternalLinksAndBold}>✂️ Remove links</button>
            <button type="button" className="hf-btn" onClick={()=>setShowLinkModal(true)}>🔎 Manual link</button>
          </div>
          <div className="quill-container">
            <ReactQuill ref={quillRef} value={summaryText} onChange={setSummaryText} modules={quillModules} formats={quillFormats} theme="snow" />
          </div>

          {/* Action bar */}
          <div style={{ display:"flex", gap:10, marginTop:16, alignItems:"center", flexWrap:"wrap" }}>
            <button type="button" onClick={saveDraft} disabled={loading} style={{ background:"#f3f4f6", color:"#374151", border:"1px solid #d1d5db", borderRadius:6, padding:"8px 18px", cursor:"pointer", fontWeight:500 }}>
              💾 Save Draft
            </button>
            <button
              type="submit"
              disabled={loading || !canPublish}
              title={!canPublish ? "Select a category above to publish" : ""}
              style={{ background: canPublish ? "#2563eb" : "#9ca3af", color:"#fff", border:"none", borderRadius:6, padding:"8px 22px", cursor: canPublish?"pointer":"not-allowed", fontWeight:600 }}
            >
              {loading ? "Publishing…" : "🚀 Publish"}
            </button>
            {!canPublish && <span style={{ fontSize:12, color:"#9ca3af" }}>Select a category to publish</span>}

            {/* Delete — only for existing articles */}
            {draftId && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{ marginLeft:"auto", background:"#fff", color:"#dc2626", border:"1.5px solid #fca5a5", borderRadius:6, padding:"8px 16px", cursor:"pointer", fontWeight:500 }}
              >
                🗑 Delete Article
              </button>
            )}
          </div>
        </form>

        {/* Internal Link Modal */}
        {showLinkModal && (
          <div className="internal-link-modal" onClick={()=>{setShowLinkModal(false);setLinkSearch("");setLinkResults([]);}}>
            <div className="internal-link-box" onClick={e=>e.stopPropagation()}>
              <h4>Link to summary</h4>
              <input value={linkSearch} onChange={e=>setLinkSearch(e.target.value)} placeholder="Search summaries by title…" autoFocus />
              <div style={{ maxHeight:260, overflowY:"auto", marginTop:8 }}>
                {linkResults.length===0 && <div style={{ padding:8, color:"#666" }}>No results</div>}
                <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                  {linkResults.map(r=>(
                    <li key={r.id} style={{ marginBottom:6 }}>
                      <button type="button" className="hf-btn" onClick={()=>insertInternalLink(r)} style={{ width:"100%", textAlign:"left" }}>{r.title}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="hf-btn" style={{ marginTop:10 }} onClick={()=>{setShowLinkModal(false);setLinkSearch("");setLinkResults([]);}}>Cancel</button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="internal-link-modal" onClick={()=>!deleteLoading&&setShowDeleteConfirm(false)} style={{ zIndex:9999 }}>
            <div className="internal-link-box" onClick={e=>e.stopPropagation()} style={{ maxWidth:420, textAlign:"center" }}>
              <div style={{ fontSize:44, marginBottom:8 }}>⚠️</div>
              <h3 style={{ margin:"0 0 8px", color:"#dc2626" }}>Delete this article?</h3>
              <p style={{ color:"#6b7280", marginBottom:20, fontSize:14 }}>
                This will <strong>permanently delete</strong> <em>"{title || "this article"}"</em> and cannot be undone.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                <button type="button" onClick={()=>setShowDeleteConfirm(false)} disabled={deleteLoading} style={{ padding:"9px 22px", borderRadius:6, border:"1px solid #d1d5db", background:"#f9fafb", cursor:"pointer", fontWeight:500 }}>
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} disabled={deleteLoading} style={{ padding:"9px 22px", borderRadius:6, border:"none", background:"#dc2626", color:"#fff", cursor:"pointer", fontWeight:600 }}>
                  {deleteLoading ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateSummaryForm;