// src/components/CreateSummaryForm/BulkImporter.jsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "../../supabase/supabaseClient";
import ReactQuill from "react-quill";
import "quill/dist/quill.snow.css";
import slugify from "slugify";

/* ── Constants ────────────────────────────────────────────────────────────── */
const DEFAULT_AUTHOR    = "ONJO Literary House";
const DEFAULT_IMAGE_URL = "https://i.imgur.com/SmAVCCM.png";

const REAL_CATEGORIES = [
  "Ogonjo Briefs","Frameworks & Models","Apps","Best Books","Book Summaries","Business Concepts","Business Giants",
  "Business Ideas","Business Legends","Business Strategy & Systems","Career Development","Case Studies",
  "Companies & Organizations","Concepts","Concepts Abbreviations","Courses & Learning Paths",
  "Digital Skills & Technology","Entrepreneurship","How To","Leadership & Management","Library","Workbooks",
  "Marketing & Sales","Markets & Geography","Mindset & Motivation","Money & Productivity","People","Quotes",
  "Self-Improvement","Strategic Communication","Tools & Software","Finance & Funding","Operations & Systems",
  "Global & Emerging Markets","Video Insights",
];

const DIFFICULTIES    = ["", "Beginner", "Intermediate", "Advanced"];
const DRAFT_SENTINEL  = "__DRAFT__";

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const parseKeywords = (input, max = 8) => {
  if (!input) return [];
  const src = Array.isArray(input) ? input.join(",") : String(input || "");
  const seen = new Set(), uniq = [];
  for (const k of src.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)) {
    if (!seen.has(k)) { seen.add(k); uniq.push(k); if (uniq.length >= max) break; }
  }
  return uniq;
};

const stripBold = (s = "") => s.replace(/\*\*/g, "").trim();

/**
 * AUTO-CATEGORY RESOLUTION
 * Matches the CATEGORY field from the SEO block against REAL_CATEGORIES.
 * Exact match first (case-insensitive), then loose contains-match.
 * Falls back to DRAFT_SENTINEL if nothing matches.
 */
const resolveCategory = (raw = "") => {
  if (!raw) return DRAFT_SENTINEL;
  const cleaned = stripBold(raw).trim();
  const exact = REAL_CATEGORIES.find(c => c.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;
  const loose = REAL_CATEGORIES.find(
    c => c.toLowerCase().includes(cleaned.toLowerCase()) ||
         cleaned.toLowerCase().includes(c.toLowerCase())
  );
  return loose || DRAFT_SENTINEL;
};

/* ── Markdown → HTML ─────────────────────────────────────────────────────── */
const inlineMarkdown = (s) =>
  s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`(.+?)`/g,       "<code>$1</code>");

const markdownToHtml = (md) => {
  if (!md) return "";
  const lines = md.split("\n");
  const out = [];
  let inUl = false;
  for (const raw of lines) {
    if (/^### (.+)/.test(raw)) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<h3>${inlineMarkdown(raw.replace(/^### /, ""))}</h3>`);
    } else if (/^## (.+)/.test(raw)) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<h2>${inlineMarkdown(raw.replace(/^## /, ""))}</h2>`);
    } else if (/^# (.+)/.test(raw)) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<h1>${inlineMarkdown(raw.replace(/^# /, ""))}</h1>`);
    } else if (/^[-*] (.+)/.test(raw)) {
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${inlineMarkdown(raw.replace(/^[-*] /, ""))}</li>`);
    } else if (/^\d+\. (.+)/.test(raw)) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<li>${inlineMarkdown(raw.replace(/^\d+\. /, ""))}</li>`);
    } else if (/^---+$/.test(raw.trim())) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push("<hr/>");
    } else if (!raw.trim()) {
      if (inUl) { out.push("</ul>"); inUl = false; }
    } else {
      if (inUl) { out.push("</ul>"); inUl = false; }
      out.push(`<p>${inlineMarkdown(raw)}</p>`);
    }
  }
  if (inUl) out.push("</ul>");
  return out.join("");
};

/* ── Article parser ───────────────────────────────────────────────────────── */
const parseArticles = (raw) => {
  const chunks = raw
    .split(/(?=^#\s*Article\s+\d+)/im)
    .map(c => c.trim())
    .filter(Boolean);

  const segments = chunks.length > 1
    ? chunks
    : raw.split(/\n---+\n/).map(c => c.trim()).filter(Boolean);

  return segments.map((chunk, idx) => {
    const getField = (label) => {
      const re = new RegExp(`^\\*{0,2}${label}\\*{0,2}[:\\s]+(.+)$`, "im");
      const m = chunk.match(re);
      return m ? stripBold(m[1]).trim() : "";
    };

    const seoTitle      = getField("SEO TITLE");
    const metaDesc      = getField("META DESCRIPTION");
    const keywords      = getField("Keywords");
    const tagsRaw       = getField("TAGS");
    const difficultyRaw = getField("DIFFICULTY");
    const categoryRaw   = getField("CATEGORY");

    const lines = chunk.split("\n");
    const seoBlockEnd = (() => {
      const categoryLine = lines.findIndex(l => /^[\*]{0,2}CATEGORY[\*]{0,2}/i.test(l));
      const diffLine     = lines.findIndex(l => /^[\*]{0,2}DIFFICULTY[\*]{0,2}/i.test(l));
      const lastSeoLine  = Math.max(categoryLine, diffLine);
      return lastSeoLine >= 0 ? lastSeoLine + 1 : 0;
    })();

    const bodyMd   = lines.slice(seoBlockEnd).join("\n").trim();
    const bodyHtml = markdownToHtml(bodyMd);

    const difficulty = DIFFICULTIES.find(
      d => d.toLowerCase() === difficultyRaw.toLowerCase()
    ) || "";

    const tagsClean = tagsRaw
      .replace(/\.$/, "")
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)
      .join(", ");

    const title            = seoTitle || `Article ${idx + 1}`;
    const resolvedCategory = resolveCategory(categoryRaw);

    const warnings = [];
    if (!seoTitle)                            warnings.push("Missing SEO Title");
    if (!metaDesc)                            warnings.push("Missing Meta Description");
    if (!bodyHtml)                            warnings.push("Body appears empty");
    if (resolvedCategory === DRAFT_SENTINEL)  warnings.push("Category not recognised — please select manually");

    return {
      _id:           `bulk-${Date.now()}-${idx}`,
      title,
      author:        DEFAULT_AUTHOR,
      description:   metaDesc,
      summaryText:   bodyHtml,
      category:      resolvedCategory,
      imageUrl:      DEFAULT_IMAGE_URL,
      youtubeUrl:    "",
      difficulty,
      tags:          tagsClean,
      keywordsInput: parseKeywords(keywords, 8).join(", "),
      affiliateLink: "",
      affiliateType: "book",
      warnings,
      status:        "idle",
      statusMsg:     "",
      expanded:      false,
      draftId:       null,
      // duplicate-check state — populated after DB lookup
      duplicateCheck: "pending",   // "pending" | "checking" | "exists" | "clear"
      duplicateInfo:  null,        // { id, status } of the existing article if found
    };
  });
};

/* ── Slug helpers ─────────────────────────────────────────────────────────── */
const makeSlug = (title) =>
  slugify(title || `draft-${Date.now()}`, { lower: true, strict: true, replacement: "-" });

const resolveSlugCollision = async (base) => {
  let slug = base;
  try {
    const { data: ex } = await supabase.from("book_summaries").select("id").eq("slug", slug).maybeSingle();
    if (!ex) return slug;
    let c = 2;
    while (true) {
      const ns = `${base}-${c}`;
      const { data: ex2 } = await supabase.from("book_summaries").select("id").eq("slug", ns).maybeSingle();
      if (!ex2) return ns;
      if (++c > 1000) return `${base}-${Date.now()}`;
    }
  } catch { return slug; }
};

const buildPayload = (art, userId) => ({
  title:            art.title.trim() || "Untitled Draft",
  author:           art.author.trim() || DEFAULT_AUTHOR,
  description:      art.description?.trim() || null,
  summary:          art.summaryText || null,
  category:         art.category === DRAFT_SENTINEL ? null : art.category,
  user_id:          userId,
  image_url:        art.imageUrl || DEFAULT_IMAGE_URL,
  affiliate_link:   art.affiliateLink?.trim()
    ? `${art.affiliateType}|${art.affiliateLink.trim()}` : null,
  youtube_url:      art.youtubeUrl || null,
  tags:             (art.tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
  keywords:         parseKeywords(art.keywordsInput, 8).length
    ? parseKeywords(art.keywordsInput, 8) : null,
  difficulty_level: ["Beginner","Intermediate","Advanced"].includes(art.difficulty)
    ? art.difficulty : null,
  status:           "draft",
  auto_saved_at:    new Date().toISOString(),
});

/* ── Quill toolbar ────────────────────────────────────────────────────────── */
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
};
const QUILL_FORMATS = [
  "header","bold","italic","underline","strike",
  "list","bullet","blockquote","code-block","link",
];

/* ── Shared styles ────────────────────────────────────────────────────────── */
const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#374151", marginBottom: 3,
};
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  padding: "7px 10px", fontSize: 13,
  border: "1px solid #d1d5db", borderRadius: 6,
  background: "#fff", color: "#111827",
};
const btnBase = {
  borderRadius: 6, padding: "7px 16px",
  fontWeight: 600, fontSize: 13, cursor: "pointer",
};
const smallBtn = {
  background: "#f3f4f6", border: "1px solid #e5e7eb",
  borderRadius: 6, padding: "4px 12px", fontSize: 12,
  cursor: "pointer", color: "#374151",
};

/* ── Toast ────────────────────────────────────────────────────────────────── */
const Toast = ({ message, type = "success", onDone }) => {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#b45309";
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "#fff", borderRadius: 10, padding: "12px 24px",
      fontWeight: 600, fontSize: 14, zIndex: 999999,
      boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      animation: "csf-toast-in 0.22s ease",
    }}>
      {message}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   DUPLICATE BANNER — shown at the top of an expanded card when a duplicate
   is detected. Blocks saving and lets the user delete from here.
══════════════════════════════════════════════════════════════════════════ */
const DuplicateBanner = ({ info, onDelete }) => (
  <div style={{
    background: "#fef2f2", border: "1.5px solid #fca5a5",
    borderRadius: 8, padding: "10px 14px",
    marginTop: 12, marginBottom: 4,
    display: "flex", alignItems: "flex-start", gap: 10,
  }}>
    <span style={{ fontSize: 18, lineHeight: 1 }}>🚫</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#dc2626", marginBottom: 3 }}>
        Duplicate title — this article already exists
        {info?.existingStatus && (
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 600,
            background: info.existingStatus === "published" ? "#fecaca" : "#fde68a",
            color: info.existingStatus === "published" ? "#991b1b" : "#92400e",
            borderRadius: 10, padding: "1px 7px",
          }}>
            {info.existingStatus === "published" ? "Published" : "Draft"}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#b91c1c" }}>
        An article with this exact title is already in your library.
        Delete this copy to continue, or rename the title above.
      </div>
    </div>
    <button
      type="button"
      onClick={onDelete}
      style={{
        background: "#dc2626", color: "#fff", border: "none",
        borderRadius: 6, padding: "5px 12px",
        fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,
      }}
    >
      🗑 Delete this copy
    </button>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   SINGLE ARTICLE CARD
══════════════════════════════════════════════════════════════════════════ */
const ArticleCard = ({ art, idx, onChange, onSave, onPublish, onDelete, onRecheckTitle }) => {
  const { status, statusMsg, expanded, warnings, duplicateCheck, duplicateInfo } = art;

  const isDuplicate = duplicateCheck === "exists";
  const isChecking  = duplicateCheck === "checking";
  const saved       = status === "saved";
  const saving      = status === "saving";
  const errored     = status === "error";
  const deleted     = status === "deleted";

  // Border colour priority: duplicate > error > saved > warning > default
  const borderColor = isDuplicate ? "#dc2626"
    : saved    ? "#16a34a"
    : errored  ? "#dc2626"
    : deleted  ? "#9ca3af"
    : warnings.length ? "#f59e0b"
    : "#e5e7eb";

  const set = (field) => (e) =>
    onChange(art._id, field, e && e.target ? e.target.value : e);

  const setBody = (html) => onChange(art._id, "summaryText", html);

  // When the title field is edited, re-run the duplicate check after a short delay
  const titleChangeTimer = useRef(null);
  const handleTitleChange = (e) => {
    const val = e.target.value;
    onChange(art._id, "title", val);
    // Mark as pending so the user sees "checking…" feedback
    onChange(art._id, "duplicateCheck", "pending");
    clearTimeout(titleChangeTimer.current);
    titleChangeTimer.current = setTimeout(() => {
      if (val.trim()) onRecheckTitle(art._id, val.trim());
    }, 700);
  };

  if (deleted) {
    return (
      <div style={{
        border: `1.5px solid ${borderColor}`, borderRadius: 10,
        padding: "10px 16px", background: "#f9fafb",
        color: "#9ca3af", fontSize: 13,
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 14,
      }}>
        🗑 <span style={{ textDecoration: "line-through" }}>{art.title}</span>
        <span style={{ marginLeft: 4, fontSize: 12 }}>— deleted</span>
      </div>
    );
  }

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`, borderRadius: 12,
      background: isDuplicate ? "#fff5f5" : saved ? "#f0fdf4" : "#fff",
      marginBottom: 14,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      transition: "border-color 0.2s",
    }}>

      {/* ── Card header ── */}
      <div
        onClick={() => !saving && onChange(art._id, "expanded", !expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
          cursor: saving ? "not-allowed" : "pointer",
          userSelect: "none",
        }}
      >
        {/* Index / status circle */}
        <span style={{
          background: isDuplicate ? "#dc2626" : saved ? "#16a34a" : "#2563eb",
          color: "#fff",
          borderRadius: "50%", width: 26, height: 26, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700,
        }}>
          {isDuplicate ? "!" : saved ? "✓" : idx + 1}
        </span>

        {/* Title */}
        <span style={{
          flex: 1, fontWeight: 600, fontSize: 14,
          color: isDuplicate ? "#dc2626" : saved ? "#15803d" : "#111827",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {art.title || <em style={{ fontWeight: 400, color: "#9ca3af" }}>Untitled</em>}
        </span>

        {/* Duplicate badge */}
        {isDuplicate && (
          <span style={{
            fontSize: 11, background: "#fef2f2", color: "#dc2626",
            borderRadius: 20, padding: "2px 9px", fontWeight: 700,
            border: "1px solid #fca5a5", whiteSpace: "nowrap",
          }}>
            🚫 Already exists
          </span>
        )}

        {/* Checking badge */}
        {isChecking && (
          <span style={{
            fontSize: 11, background: "#f3f4f6", color: "#6b7280",
            borderRadius: 20, padding: "2px 9px", fontWeight: 600,
            whiteSpace: "nowrap",
          }}>
            ⏳ Checking…
          </span>
        )}

        {/* Category badge */}
        {!isDuplicate && art.category !== DRAFT_SENTINEL && (
          <span style={{
            fontSize: 11, background: "#eff6ff", color: "#1d4ed8",
            borderRadius: 20, padding: "2px 9px", fontWeight: 600,
            whiteSpace: "nowrap", maxWidth: 160,
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {art.category}
          </span>
        )}

        {/* Status message badge */}
        {statusMsg && !isDuplicate && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: errored ? "#dc2626" : saved ? "#16a34a" : "#6b7280",
            background: errored ? "#fef2f2" : saved ? "#f0fdf4" : "#f3f4f6",
            borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap",
          }}>
            {statusMsg}
          </span>
        )}

        {/* Warnings badge */}
        {warnings.length > 0 && status === "idle" && !isDuplicate && (
          <span style={{
            fontSize: 11, background: "#fef3c7", color: "#92400e",
            borderRadius: 20, padding: "2px 9px", fontWeight: 600,
          }}>
            ⚠ {warnings.length} warning{warnings.length > 1 ? "s" : ""}
          </span>
        )}

        <span style={{
          fontSize: 16, color: "#9ca3af",
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }}>▾</span>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #f3f4f6" }}>

          {/* DUPLICATE BANNER — shown above everything else when duplicate detected */}
          {isDuplicate && (
            <DuplicateBanner
              info={duplicateInfo}
              onDelete={() => onDelete(art._id)}
            />
          )}

          {/* Regular warnings (non-duplicate) */}
          {warnings.length > 0 && !isDuplicate && (
            <div style={{
              background: "#fef3c7", border: "1px solid #fbbf24",
              borderRadius: 8, padding: "8px 12px",
              marginTop: 12, marginBottom: 12,
            }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 4 }}>
                ⚠ Review before saving:
              </div>
              {warnings.map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: "#92400e" }}>• {w}</div>
              ))}
            </div>
          )}

          {/* ── Fields grid ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "10px 16px", marginTop: 12,
          }}>

            {/* Title — full width, with re-check on change */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>
                SEO Title *
                {isChecking && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
                    checking for duplicates…
                  </span>
                )}
                {duplicateCheck === "clear" && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#16a34a", fontWeight: 400 }}>
                    ✓ Title is available
                  </span>
                )}
              </label>
              <input
                value={art.title}
                onChange={handleTitleChange}
                style={{
                  ...inputStyle,
                  borderColor: isDuplicate ? "#fca5a5" : "#d1d5db",
                  background: isDuplicate ? "#fff5f5" : "#fff",
                }}
              />
            </div>

            {/* Author */}
            <div>
              <label style={labelStyle}>Author</label>
              <input value={art.author} onChange={set("author")} style={inputStyle} />
            </div>

            {/* Category */}
            <div>
              <label style={labelStyle}>
                Category
                {art.category !== DRAFT_SENTINEL && (
                  <span style={{
                    marginLeft: 6, fontSize: 10, fontWeight: 400,
                    color: "#16a34a", background: "#dcfce7",
                    padding: "1px 6px", borderRadius: 10,
                  }}>
                    auto-assigned
                  </span>
                )}
              </label>
              <select value={art.category} onChange={set("category")} style={inputStyle}>
                <option value={DRAFT_SENTINEL}>📝 Keep as Draft</option>
                {REAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label style={labelStyle}>Difficulty</label>
              <select value={art.difficulty} onChange={set("difficulty")} style={inputStyle}>
                <option value="">Not specified</option>
                {["Beginner","Intermediate","Advanced"].map(d =>
                  <option key={d} value={d}>{d}</option>
                )}
              </select>
            </div>

            {/* Image URL */}
            <div>
              <label style={labelStyle}>Image URL</label>
              <input value={art.imageUrl} onChange={set("imageUrl")}
                style={inputStyle} placeholder="https://..." />
            </div>

            {/* Meta Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Meta Description</label>
              <textarea value={art.description} onChange={set("description")}
                rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            {/* Tags */}
            <div>
              <label style={labelStyle}>Tags</label>
              <input value={art.tags} onChange={set("tags")}
                style={inputStyle} placeholder="business, leadership" />
            </div>

            {/* Keywords */}
            <div>
              <label style={labelStyle}>Keywords (max 8, comma-separated)</label>
              <input value={art.keywordsInput} onChange={set("keywordsInput")} style={inputStyle} />
            </div>

            {/* YouTube */}
            <div>
              <label style={labelStyle}>YouTube URL (optional)</label>
              <input value={art.youtubeUrl} onChange={set("youtubeUrl")}
                style={inputStyle} placeholder="https://youtube.com/..." />
            </div>

            {/* Affiliate */}
            <div>
              <label style={labelStyle}>Affiliate Link (optional)</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={art.affiliateLink} onChange={set("affiliateLink")}
                  style={{ ...inputStyle, flex: 1 }} placeholder="https://..." />
                <select value={art.affiliateType} onChange={set("affiliateType")}
                  style={{ ...inputStyle, width: 110 }}>
                  <option value="book">Get Book</option>
                  <option value="pdf">Get PDF</option>
                  <option value="app">Open App</option>
                </select>
              </div>
            </div>

            {/* Article body */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ ...labelStyle, marginBottom: 6 }}>
                Article Body
                <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 8, fontSize: 11 }}>
                  — fully editable, renders headings, bold, links
                </span>
              </label>
              <div style={{
                border: "1.5px solid #d1d5db", borderRadius: 8,
                overflow: "hidden", background: "#fff",
              }}>
                <ReactQuill
                  value={art.summaryText}
                  onChange={setBody}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                  theme="snow"
                  style={{ minHeight: 420 }}
                />
              </div>
              <style>{`
                .ql-container { font-size: 14px; }
                .ql-editor { min-height: 380px; line-height: 1.7; }
                .ql-editor h1 { font-size: 1.6em; font-weight: 700; margin: 1em 0 0.4em; }
                .ql-editor h2 { font-size: 1.3em; font-weight: 700; margin: 1em 0 0.4em; }
                .ql-editor h3 { font-size: 1.1em; font-weight: 700; margin: 0.8em 0 0.3em; }
                .ql-editor p  { margin: 0 0 0.75em; }
              `}</style>
            </div>
          </div>

          {/* Error message */}
          {errored && !isDuplicate && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: 8, padding: "8px 12px", marginTop: 10,
              fontSize: 13, color: "#dc2626",
            }}>
              {statusMsg}
            </div>
          )}

          {/* ── Card action buttons ── */}
          <div style={{
            display: "flex", gap: 8, marginTop: 14,
            alignItems: "center", flexWrap: "wrap",
          }}>
            {/*
              Save Draft — BLOCKED if duplicate detected.
              The button is disabled and a tooltip explains why.
            */}
            <button
              type="button"
              onClick={() => onSave(art._id)}
              disabled={saving || saved || isDuplicate || isChecking}
              title={isDuplicate ? "Duplicate title — rename or delete this article first" : ""}
              style={{
                ...btnBase,
                background: isDuplicate ? "#f3f4f6"
                  : saved   ? "#d1fae5"
                  : saving  ? "#e5e7eb"
                  : "#f3f4f6",
                color: isDuplicate ? "#9ca3af"
                  : saved  ? "#15803d"
                  : saving ? "#9ca3af"
                  : "#374151",
                border: isDuplicate
                  ? "1px solid #fca5a5"
                  : "1px solid #d1d5db",
                cursor: (saving || saved || isDuplicate || isChecking) ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "💾 Saving…" : saved ? "✅ Saved" : isDuplicate ? "🚫 Duplicate" : "💾 Save Draft"}
            </button>

            <button
              type="button"
              onClick={() => onPublish(art._id)}
              disabled={saving || art.category === DRAFT_SENTINEL || isDuplicate || isChecking}
              title={
                isDuplicate ? "Duplicate title — cannot publish" :
                art.category === DRAFT_SENTINEL ? "Select a category to publish" : ""
              }
              style={{
                ...btnBase,
                background: (isDuplicate || art.category === DRAFT_SENTINEL) ? "#9ca3af" : "#2563eb",
                color: "#fff", border: "none",
                cursor: (saving || art.category === DRAFT_SENTINEL || isDuplicate || isChecking) ? "not-allowed" : "pointer",
              }}
            >
              🚀 Publish
            </button>

            {isDuplicate && (
              <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
                Rename the title or delete this copy
              </span>
            )}
            {!isDuplicate && art.category === DRAFT_SENTINEL && (
              <span style={{ fontSize: 11, color: "#9ca3af" }}>
                Select category to publish
              </span>
            )}

            <button
              type="button"
              onClick={() => onDelete(art._id)}
              disabled={saving}
              style={{
                ...btnBase, marginLeft: "auto",
                background: "#fff", color: "#dc2626",
                border: "1.5px solid #fca5a5",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN BULK IMPORTER
══════════════════════════════════════════════════════════════════════════ */
const BulkImporter = ({ onClose, onNewSummary }) => {
  const [step, setStep]         = useState("paste");
  const [rawText, setRawText]   = useState("");
  const [articles, setArticles] = useState([]);
  const [toast, setToast]       = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const listRef                 = useRef(null);

  /* ════════════════════════════════════════════════════════
     DUPLICATE TITLE CHECK
     After parsing, we batch-check every title against the DB
     in one go. Each article's duplicateCheck field moves:
       "pending" → "checking" → "exists" | "clear"
  ════════════════════════════════════════════════════════ */
  const checkDuplicates = useCallback(async (arts) => {
    if (!arts.length) return;

    // Mark all as checking
    setArticles(prev => prev.map(a => ({ ...a, duplicateCheck: "checking" })));

    // Fetch all existing titles in one DB call (up to 1000)
    let existingMap = new Map(); // lowercase title → { id, status }
    try {
      const titles = arts.map(a => a.title.trim().toLowerCase()).filter(Boolean);
      // Use ilike with OR isn't directly possible in supabase-js for arrays,
      // so we pull a broader set and match client-side — efficient for batches up to ~200
      const { data } = await supabase
        .from("book_summaries")
        .select("id, title, status")
        .limit(10000);
      if (data) {
        data.forEach(row => {
          existingMap.set(row.title.trim().toLowerCase(), {
            existingId: row.id,
            existingStatus: row.status,
          });
        });
      }
    } catch (err) {
      console.error("Duplicate check error:", err);
      // If the check fails, clear the pending state rather than leaving articles blocked
      setArticles(prev => prev.map(a => ({ ...a, duplicateCheck: "clear" })));
      return;
    }

    // Update each article based on the lookup
    setArticles(prev => prev.map(a => {
      const key = a.title.trim().toLowerCase();
      const hit = existingMap.get(key);
      return {
        ...a,
        duplicateCheck: hit ? "exists" : "clear",
        duplicateInfo:  hit || null,
      };
    }));
  }, []);

  /* Re-check a single article's title (called when user edits the title field) */
  const recheckTitle = useCallback(async (id, newTitle) => {
    setArticles(prev => prev.map(a =>
      a._id === id ? { ...a, duplicateCheck: "checking", duplicateInfo: null } : a
    ));
    try {
      const { data } = await supabase
        .from("book_summaries")
        .select("id, status")
        .ilike("title", newTitle.trim())
        .limit(1)
        .maybeSingle();

      setArticles(prev => prev.map(a =>
        a._id === id
          ? {
              ...a,
              duplicateCheck: data ? "exists" : "clear",
              duplicateInfo:  data ? { existingId: data.id, existingStatus: data.status } : null,
            }
          : a
      ));
    } catch {
      setArticles(prev => prev.map(a =>
        a._id === id ? { ...a, duplicateCheck: "clear", duplicateInfo: null } : a
      ));
    }
  }, []);

  /* ── Parse → then immediately kick off duplicate check ── */
  const handleParse = useCallback(() => {
    if (!rawText.trim()) return;
    const parsed = parseArticles(rawText);
    if (!parsed.length) {
      setToast({ message: "⚠ No articles detected. Check formatting.", type: "error" });
      return;
    }
    setArticles(parsed);
    setStep("review");
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    // Kick off the real-time duplicate check straight away
    checkDuplicates(parsed);
  }, [rawText, checkDuplicates]);

  /* ── Field change ── */
  const handleChange = useCallback((id, field, value) => {
    setArticles(prev => prev.map(a => a._id === id ? { ...a, [field]: value } : a));
  }, []);

  /* ── Save single ── */
  const saveSingle = useCallback(async (id, publishCategory = null) => {
    const art = articles.find(a => a._id === id);
    // Hard block: never save a duplicate
    if (!art || art.status === "saving" || art.duplicateCheck === "exists") return;

    setArticles(prev => prev.map(a =>
      a._id === id ? { ...a, status: "saving", statusMsg: "Saving…" } : a
    ));

    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const slug = await resolveSlugCollision(makeSlug(art.title));
      const payload = {
        ...buildPayload(art, user.id),
        slug,
        ...(publishCategory
          ? { category: publishCategory, status: "published", auto_saved_at: null }
          : {}),
      };

      if (art.draftId) {
        const { error } = await supabase.from("book_summaries")
          .update(payload).eq("id", art.draftId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase.from("book_summaries")
          .insert([payload]).select("id").single();
        if (error) throw error;
        setArticles(prev => prev.map(a =>
          a._id === id ? { ...a, draftId: ins.id } : a
        ));
      }

      setArticles(prev => prev.map(a =>
        a._id === id ? {
          ...a,
          status:    "saved",
          statusMsg: publishCategory ? "✅ Published" : "✅ Saved",
          // Card stays open — user can see the result and scroll to next
        } : a
      ));
      if (typeof onNewSummary === "function") onNewSummary();

    } catch (err) {
      console.error("BulkImporter save error:", err);
      setArticles(prev => prev.map(a =>
        a._id === id ? { ...a, status: "error", statusMsg: `❌ ${err.message}` } : a
      ));
    }
  }, [articles, onNewSummary]);

  /* ── Publish single ── */
  const publishSingle = useCallback(async (id) => {
    const art = articles.find(a => a._id === id);
    if (!art || art.category === DRAFT_SENTINEL || art.duplicateCheck === "exists") return;
    await saveSingle(id, art.category);
  }, [articles, saveSingle]);

  /* ── Delete single ── */
  const deleteSingle = useCallback(async (id) => {
    const art = articles.find(a => a._id === id);
    if (!art) return;
    if (!window.confirm(`Delete "${art.title}"? This cannot be undone.`)) return;

    if (art.draftId) {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("book_summaries")
            .delete().eq("id", art.draftId).eq("user_id", user.id);
        }
      } catch (err) { console.error("Delete error:", err); }
      if (typeof onNewSummary === "function") onNewSummary();
    }

    setArticles(prev => prev.map(a =>
      a._id === id ? { ...a, status: "deleted", statusMsg: "Deleted", expanded: false } : a
    ));
  }, [articles, onNewSummary]);

  /* ── Bulk: Save All Drafts ──
     Silently skips any duplicate-flagged articles.
     Reports how many were skipped in the toast.
  ── */
  const saveAllDrafts = useCallback(async () => {
    const pending    = articles.filter(a =>
      (a.status === "idle" || a.status === "error") && a.duplicateCheck !== "exists"
    );
    const duplicates = articles.filter(a => a.duplicateCheck === "exists");

    if (!pending.length) {
      if (duplicates.length) {
        setToast({ message: `⚠ All pending articles are duplicates. Rename or delete them first.`, type: "warning" });
      } else {
        setToast({ message: "Nothing left to save.", type: "warning" });
      }
      return;
    }

    const confirmMsg = duplicates.length
      ? `Save ${pending.length} article(s) as drafts? (${duplicates.length} duplicate(s) will be skipped)`
      : `Save ${pending.length} article(s) as drafts?`;
    if (!window.confirm(confirmMsg)) return;

    setBulkBusy(true);
    for (const art of pending) await saveSingle(art._id);
    setBulkBusy(false);

    const msg = duplicates.length
      ? `✅ ${pending.length} saved — ${duplicates.length} duplicate(s) skipped`
      : `✅ ${pending.length} draft(s) saved`;
    setToast({ message: msg, type: "success" });
  }, [articles, saveSingle]);

  /* ── Bulk: Publish All ──
     Skips duplicates AND articles without a category.
  ── */
  const publishAll = useCallback(async () => {
    const publishable   = articles.filter(a =>
      a.status !== "deleted" &&
      a.category !== DRAFT_SENTINEL &&
      a.duplicateCheck !== "exists"
    );
    const dupCount      = articles.filter(a => a.status !== "deleted" && a.duplicateCheck === "exists").length;
    const noCatCount    = articles.filter(a => a.status !== "deleted" && a.category === DRAFT_SENTINEL && a.duplicateCheck !== "exists").length;

    if (!publishable.length) {
      setToast({
        message: "No publishable articles — duplicates or missing categories are blocking all of them.",
        type: "warning",
      });
      return;
    }

    const notes = [];
    if (dupCount)   notes.push(`${dupCount} duplicate(s) skipped`);
    if (noCatCount) notes.push(`${noCatCount} without category skipped`);
    const confirmMsg = notes.length
      ? `Publish ${publishable.length} article(s)? (${notes.join(", ")})`
      : `Publish all ${publishable.length} article(s)?`;
    if (!window.confirm(confirmMsg)) return;

    setBulkBusy(true);
    for (const art of publishable) await saveSingle(art._id, art.category);
    setBulkBusy(false);
    setToast({ message: `🚀 ${publishable.length} article(s) published`, type: "success" });
  }, [articles, saveSingle]);

  /* ── Bulk: Delete All ── */
  const deleteAll = useCallback(async () => {
    const active = articles.filter(a => a.status !== "deleted");
    if (!active.length) return;
    if (!window.confirm(`Permanently delete all ${active.length} article(s)?`)) return;
    for (const art of active) await deleteSingle(art._id);
    setToast({ message: "🗑 All articles deleted", type: "warning" });
  }, [articles, deleteSingle]);

  /* ── Counts ── */
  const total          = articles.filter(a => a.status !== "deleted").length;
  const savedCount     = articles.filter(a => a.status === "saved").length;
  const pendingCount   = articles.filter(a => (a.status === "idle" || a.status === "error") && a.duplicateCheck !== "exists").length;
  const duplicateCount = articles.filter(a => a.status !== "deleted" && a.duplicateCheck === "exists").length;
  const checkingCount  = articles.filter(a => a.duplicateCheck === "checking").length;
  const withCategory   = articles.filter(a => a.status !== "deleted" && a.category !== DRAFT_SENTINEL && a.duplicateCheck !== "exists").length;

  /* ─────────────────────────────────────────────── RENDER ─── */
  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      <div style={{
        background: "#f8fafc",
        borderRadius: 12,
        border: "2px solid #2563eb",
        padding: "20px 22px",
        marginBottom: 20,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            background: "#2563eb", color: "#fff",
            borderRadius: 8, padding: "6px 12px",
            fontWeight: 800, fontSize: 13, letterSpacing: "0.02em",
          }}>
            BULK IMPORT
          </div>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Paste articles separated by{" "}
            <code style={{ background: "#e5e7eb", padding: "1px 5px", borderRadius: 4 }}>
              # Article N
            </code>{" "}
            headers
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              cursor: "pointer", fontSize: 22, color: "#9ca3af", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* ── STEP: Paste ── */}
        {step === "paste" && (
          <div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`Paste your articles here. Each should start with:\n\n# Article 1\n\nSEO TITLE: ...\nMETA DESCRIPTION: ...\nKeywords: ...\nTAGS: ...\nDIFFICULTY: ...\nCATEGORY: ...\n\n# Article Title (H1)\n\n[body content...]\n\n# Article 2\n...`}
              rows={14}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "12px 14px", fontSize: 13,
                border: "1.5px solid #d1d5db", borderRadius: 8,
                fontFamily: "monospace", resize: "vertical",
                background: "#fff", color: "#111827",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
              <button
                type="button"
                onClick={handleParse}
                disabled={!rawText.trim()}
                style={{
                  background: rawText.trim() ? "#2563eb" : "#9ca3af",
                  color: "#fff", border: "none", borderRadius: 7,
                  padding: "9px 22px", fontWeight: 700, fontSize: 14,
                  cursor: rawText.trim() ? "pointer" : "not-allowed",
                }}
              >
                ⚡ Parse Articles
              </button>
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                Supports 1–50 articles per batch
              </span>
            </div>
          </div>
        )}

        {/* ── STEP: Review ── */}
        {step === "review" && (
          <div>
            {/* Summary bar */}
            <div style={{
              display: "flex", gap: 12, alignItems: "center",
              background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 9, padding: "10px 16px", marginBottom: 16,
              flexWrap: "wrap",
            }}>
              <span style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>
                {total} article{total !== 1 ? "s" : ""} parsed
              </span>

              {checkingCount > 0 && (
                <span style={{ fontSize: 12, background: "#f3f4f6", color: "#6b7280", borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>
                  ⏳ Checking {checkingCount} for duplicates…
                </span>
              )}

              {duplicateCount > 0 && (
                <span style={{ fontSize: 12, background: "#fef2f2", color: "#dc2626", borderRadius: 20, padding: "2px 9px", fontWeight: 700, border: "1px solid #fca5a5" }}>
                  🚫 {duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""} — blocked
                </span>
              )}

              {withCategory > 0 && (
                <span style={{ fontSize: 12, background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>
                  🏷 {withCategory} auto-categorised
                </span>
              )}

              {savedCount > 0 && (
                <span style={{ fontSize: 12, background: "#d1fae5", color: "#15803d", borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>
                  ✅ {savedCount} saved
                </span>
              )}

              {pendingCount > 0 && (
                <span style={{ fontSize: 12, background: "#eff6ff", color: "#2563eb", borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>
                  {pendingCount} ready
                </span>
              )}

              <button
                type="button"
                onClick={() => { setStep("paste"); setArticles([]); }}
                style={{ marginLeft: "auto", background: "none", border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: "#6b7280" }}
              >
                ← Re-paste
              </button>
            </div>

            {/* Expand / Collapse all */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button type="button" style={smallBtn}
                onClick={() => setArticles(prev => prev.map(a => ({ ...a, expanded: true })))}>
                Expand All
              </button>
              <button type="button" style={smallBtn}
                onClick={() => setArticles(prev => prev.map(a => ({ ...a, expanded: false })))}>
                Collapse All
              </button>
              {duplicateCount > 0 && (
                <button type="button" style={{ ...smallBtn, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}
                  onClick={() => setArticles(prev => prev.map(a => ({
                    ...a, expanded: a.duplicateCheck === "exists" ? true : a.expanded
                  })))}>
                  Show {duplicateCount} Duplicate{duplicateCount > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {/* Article cards */}
            <div ref={listRef}>
              {articles.map((art, idx) => (
                <ArticleCard
                  key={art._id}
                  art={art}
                  idx={idx}
                  onChange={handleChange}
                  onSave={saveSingle}
                  onPublish={publishSingle}
                  onDelete={deleteSingle}
                  onRecheckTitle={recheckTitle}
                />
              ))}
            </div>

            {/* ── Sticky bulk action bar ── */}
            <div style={{
              position: "sticky", bottom: 0,
              background: "#fff",
              border: "1.5px solid #2563eb",
              borderRadius: 10, padding: "12px 18px",
              display: "flex", gap: 10, flexWrap: "wrap",
              alignItems: "center",
              boxShadow: "0 -4px 20px rgba(37,99,235,0.10)",
              marginTop: 16,
            }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#1d4ed8" }}>
                Bulk Actions:
              </span>

              {duplicateCount > 0 && (
                <span style={{
                  fontSize: 12, color: "#dc2626", fontWeight: 600,
                  background: "#fef2f2", border: "1px solid #fca5a5",
                  borderRadius: 20, padding: "3px 10px",
                }}>
                  🚫 {duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""} will be skipped
                </span>
              )}

              <button type="button" onClick={saveAllDrafts} disabled={bulkBusy}
                style={{
                  ...btnBase, background: "#f3f4f6", color: "#374151",
                  border: "1px solid #d1d5db",
                  cursor: bulkBusy ? "not-allowed" : "pointer",
                }}>
                {bulkBusy ? "⏳ Working…" : `💾 Save All Drafts (${pendingCount})`}
              </button>

              <button type="button" onClick={publishAll} disabled={bulkBusy}
                style={{
                  ...btnBase, background: "#2563eb", color: "#fff",
                  border: "none", cursor: bulkBusy ? "not-allowed" : "pointer",
                }}>
                🚀 Publish All{withCategory > 0 ? ` (${withCategory})` : ""}
              </button>

              <button type="button" onClick={deleteAll} disabled={bulkBusy}
                style={{
                  ...btnBase, marginLeft: "auto",
                  background: "#fff", color: "#dc2626",
                  border: "1.5px solid #fca5a5",
                  cursor: bulkBusy ? "not-allowed" : "pointer",
                }}>
                🗑 Delete All
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes csf-toast-in {
          from { opacity:0; transform: translateX(-50%) translateY(12px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
};

export default BulkImporter;