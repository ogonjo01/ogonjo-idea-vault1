// src/components/DraftPanel/DraftPanel.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import "./DraftPanel.css";

/* ── constants ──────────────────────────────────────────── */
const REAL_CATEGORIES = [
  "Ogonjo Briefs","Frameworks & Models","Apps","Best Books","Book Summaries","Business Concepts","Business Giants",
  "Business Ideas","Business Legends","Business Strategy & Systems","Career Development","Case Studies",
  "Companies & Organizations","Concepts","Concepts Abbreviations","Courses & Learning Paths",
  "Digital Skills & Technology","Entrepreneurship","How To","Leadership & Management","Library","Workbooks","Marketing & Sales",
  "Markets & Geography","Mindset & Motivation","Money & Productivity","People","Quotes",
  "Self-Improvement","Strategic Communication","Tools & Software","Finance & Funding","Operations & Systems",
  "Global & Emerging Markets","Video Insights","Quizzes",
];

/* ── pure helpers ───────────────────────────────────────── */
const normalize = (s = "") => String(s || "").trim().toLowerCase();

const toLibraryHref = (row) => row?.slug ? `/library/${row.slug}` : `/library/${row?.id}`;

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const fmtSeconds = (s) => {
  if (!isFinite(s) || s <= 0) return null;
  if (s < 60) return `~${Math.ceil(s)}s left`;
  return `~${Math.ceil(s / 60)}m left`;
};

/* ── fetch ALL titles in ONE query ──────────────────────── */
const fetchAllTitles = async () => {
  let allRows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("book_summaries")
      .select("id, title, slug, keywords")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
};

/* ── match a phrase against the in-memory title list (exact) ── */
const matchPhrase = (phrase, allTitles) => {
  const np = normalize(phrase);
  return allTitles.find(c => normalize(c.title) === np) || null;
};

/* ════════════════════════════════════════════════════════════
   FEATURE 1 — Bold phrase extractor
   Scans <strong>/<b> nodes, returns candidates
════════════════════════════════════════════════════════════ */
const extractBoldCandidates = (html, allTitles) => {
  const container = document.createElement("div");
  container.innerHTML = html || "";

  // Track phrases already inside <a> tags
  const alreadyLinkedSet = new Set(
    Array.from(container.querySelectorAll(
      "a[href^='/library/'] strong, a[href^='/library/'] b, a[data-summary-id] strong, a[data-summary-id] b"
    )).map(n => normalize((n.textContent || "").trim()))
  );

  const seen = new Set();
  const candidates = [];

  Array.from(container.querySelectorAll("strong, b")).forEach(node => {
    const phrase = (node.textContent || "").trim();
    if (!phrase || phrase.length < 2 || phrase.length > 200) return;
    const key = normalize(phrase);
    if (seen.has(key)) return;
    seen.add(key);

    const matched = matchPhrase(phrase, allTitles);
    const alreadyLinked = alreadyLinkedSet.has(key);

    candidates.push({
      phrase,
      matched,
      approved: !!matched && !alreadyLinked,
      alreadyLinked,
      source: "bold",
    });
  });

  return { candidates, alreadyLinkedSet };
};

/* ════════════════════════════════════════════════════════════
   FEATURE 2 — Smart unbolded phrase extractor
   Scans plain text in <p>, <h1>-<h4>, <li>
   Only 2–4 word titles. Skips already-linked phrases.
════════════════════════════════════════════════════════════ */
const extractSmartCandidates = (html, smartTitles, alreadyLinkedSet, boldLinkedSet) => {
  if (!smartTitles.length) return [];

  const container = document.createElement("div");
  container.innerHTML = html || "";

  // Build a fast lookup map: normalizedTitle -> row
  const titleMap = new Map();
  smartTitles.forEach(t => titleMap.set(normalize(t.title), t));

  // Sort titles longest-first so longer matches win (e.g. "customer acquisition cost" before "customer acquisition")
  const sortedTitles = [...smartTitles].sort(
    (a, b) => b.title.split(" ").length - a.title.split(" ").length
  );

  const SCAN_SELECTORS = "p, h1, h2, h3, h4, li";
  const found = new Map(); // normalizedPhrase -> candidate

  Array.from(container.querySelectorAll(SCAN_SELECTORS)).forEach(el => {
    // Skip if this element is inside an <a> already
    if (el.closest("a")) return;

    // Get the raw text, but skip any text that's already bolded or linked
    // We do this by walking text nodes only (not inside <strong>, <b>, or <a>)
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          // Skip text inside bold or anchor
          if (parent.closest("strong, b, a")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textChunks = [];
    let node;
    while ((node = walker.nextNode())) {
      textChunks.push(node.textContent || "");
    }
    const fullText = textChunks.join(" ");
    if (!fullText.trim()) return;

    // Sliding window over words — try longest titles first
    const words = fullText.split(/\s+/).filter(Boolean);

    for (const titleRow of sortedTitles) {
      const wordCount = titleRow.title.split(" ").length;
      if (wordCount < 2 || wordCount > 4) continue;

      const normalizedTitle = normalize(titleRow.title);

      // Skip if already handled by Feature 1 or already linked in HTML
      if (alreadyLinkedSet.has(normalizedTitle)) continue;
      if (boldLinkedSet.has(normalizedTitle)) continue;
      if (found.has(normalizedTitle)) continue;

      // Sliding window match
      for (let i = 0; i <= words.length - wordCount; i++) {
        const window = words.slice(i, i + wordCount).join(" ");
        if (normalize(window) === normalizedTitle) {
          found.set(normalizedTitle, {
            phrase: titleRow.title, // use the canonical title casing
            matched: titleRow,
            approved: true,
            alreadyLinked: false,
            source: "smart",
          });
          break;
        }
      }
    }
  });

  return Array.from(found.values());
};

/* ════════════════════════════════════════════════════════════
   APPLY BOLD LINKS — injects <a> around existing <strong>/<b>
════════════════════════════════════════════════════════════ */
const applyBoldLinks = (html, approved) => {
  if (!approved.length) return html;
  const container = document.createElement("div");
  container.innerHTML = html || "";
  const boldNodes = Array.from(container.querySelectorAll("strong, b"));

  for (const { phrase, matched } of approved) {
    if (!matched?.id) continue;
    const href = toLibraryHref(matched);
    boldNodes.forEach(node => {
      if (normalize((node.textContent || "").trim()) !== normalize(phrase)) return;
      if (node.closest?.("a")) return;
      try {
        const a = document.createElement("a");
        a.setAttribute("data-summary-id", matched.id);
        a.setAttribute("href", href);
        a.className = "internal-summary-link";
        a.innerHTML = node.innerHTML;
        node.parentNode.replaceChild(a, node);
      } catch (_) {}
    });
  }
  return container.innerHTML;
};

/* ════════════════════════════════════════════════════════════
   APPLY SMART LINKS — injects <a> into raw text nodes
════════════════════════════════════════════════════════════ */
const applySmartLinks = (html, approved) => {
  if (!approved.length) return html;

  // Build a map for quick lookup
  const approvedMap = new Map();
  approved.forEach(({ phrase, matched }) => {
    if (matched?.id) approvedMap.set(normalize(phrase), { phrase, matched });
  });
  if (!approvedMap.size) return html;

  const container = document.createElement("div");
  container.innerHTML = html || "";

  const SCAN_SELECTORS = "p, h1, h2, h3, h4, li";

  // Sort by word count descending so longer phrases are replaced first
  const sortedApproved = [...approvedMap.values()].sort(
    (a, b) => b.phrase.split(" ").length - a.phrase.split(" ").length
  );

  Array.from(container.querySelectorAll(SCAN_SELECTORS)).forEach(el => {
    if (el.closest("a")) return;

    for (const { phrase, matched } of sortedApproved) {
      const href = toLibraryHref(matched);
      // Replace plain text occurrences — case-insensitive, word boundary aware
      // We rebuild innerHTML safely using a regex on the text content
      replaceTextInNode(el, phrase, matched.id, href);
    }
  });

  return container.innerHTML;
};

/**
 * Walk text nodes inside `el`, replace occurrences of `phrase` in plain text
 * (not inside <a>, <strong>, <b>) with an anchor tag.
 */
const replaceTextInNode = (el, phrase, matchedId, href) => {
  const walker = document.createTreeWalker(
    el,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (node.parentElement.closest("a, strong, b")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) textNodes.push(node);

  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedPhrase})`, "gi");

  textNodes.forEach(textNode => {
    if (!regex.test(textNode.textContent)) return;
    regex.lastIndex = 0;

    const parts = textNode.textContent.split(regex);
    if (parts.length <= 1) return;

    const frag = document.createDocumentFragment();
    parts.forEach(part => {
      if (normalize(part) === normalize(phrase)) {
        const a = document.createElement("a");
        a.setAttribute("data-summary-id", matchedId);
        a.setAttribute("href", href);
        a.className = "internal-summary-link internal-summary-link--smart";
        a.textContent = part;
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });

    textNode.parentNode.replaceChild(frag, textNode);
  });
};

/* ══════════════════════════════════════════════════════════
   AUTO-LINK MODAL
══════════════════════════════════════════════════════════ */
const AutoLinkModal = ({ drafts: targets, onClose, onSaved }) => {
  const isBulk = targets.length > 1;

  const [step, setStep]         = useState("scanning");
  const [errorMsg, setErrorMsg] = useState("");
  const [saveCount, setSaveCount] = useState(0);
  const [activeTab, setActiveTab] = useState("preview");

  // draftData[]: { draft, html, boldCandidates, smartCandidates }
  const [draftData, setDraftData] = useState([]);

  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal,   setProgressTotal]   = useState(0);
  const [progressPhrase,  setProgressPhrase]  = useState("");
  const [progressEta,     setProgressEta]     = useState(null);
  const [progressStage,   setProgressStage]   = useState("bold"); // "bold" | "smart"
  const scanStartRef = useRef(null);

  /* ── SCAN ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ids = targets.map(d => d.id);

        const { data: rows, error: rowsErr } = await supabase
          .from("book_summaries")
          .select("id, summary")
          .in("id", ids);
        if (rowsErr) throw rowsErr;

        // Single query for all titles
        const allTitles = await fetchAllTitles();

        // Smart titles: 2–4 words only
        const smartTitles = allTitles.filter(t => {
          const wc = (t.title || "").trim().split(/\s+/).length;
          return wc >= 2 && wc <= 4;
        });

        // ── STAGE 1: Bold candidates ──
        setProgressStage("bold");
        const allDraftData = [];
        let scanned = 0;

        for (const draft of targets) {
          if (cancelled) return;
          const row  = (rows || []).find(r => r.id === draft.id);
          const html = row?.summary || "";

          setProgressPhrase(draft.title || "Untitled");
          const { candidates: boldCandidates, alreadyLinkedSet } =
            extractBoldCandidates(html, allTitles);

          allDraftData.push({ draft, html, boldCandidates, alreadyLinkedSet, smartCandidates: [] });
          scanned++;
          setProgressCurrent(scanned);
          setProgressTotal(targets.length * 2); // bold + smart passes
        }

        // ── STAGE 2: Smart candidates ──
        setProgressStage("smart");

        for (let i = 0; i < allDraftData.length; i++) {
          if (cancelled) return;
          const entry = allDraftData[i];
          setProgressPhrase(entry.draft.title || "Untitled");

          // Build set of phrases Feature 1 will link (approved bold)
          const boldLinkedSet = new Set(
            entry.boldCandidates
              .filter(c => c.approved && c.matched)
              .map(c => normalize(c.phrase))
          );

          const smartCandidates = extractSmartCandidates(
            entry.html,
            smartTitles,
            entry.alreadyLinkedSet,
            boldLinkedSet
          );

          allDraftData[i] = { ...entry, smartCandidates };
          scanned++;
          setProgressCurrent(scanned);

          const elapsed = (Date.now() - (scanStartRef.current || Date.now())) / 1000;
          const rate = scanned / elapsed;
          setProgressEta(rate > 0 ? (targets.length * 2 - scanned) / rate : null);
        }

        if (!cancelled) {
          setDraftData(allDraftData);
          setStep("preview");
        }
      } catch (err) {
        if (!cancelled) { setErrorMsg(err.message || "Scan failed"); setStep("error"); }
      }
    })();
    scanStartRef.current = Date.now();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  /* ── toggle helpers ── */
  const toggleBold = (draftId, phrase) =>
    setDraftData(prev => prev.map(d =>
      d.draft.id !== draftId ? d : {
        ...d,
        boldCandidates: d.boldCandidates.map(c =>
          c.phrase === phrase ? { ...c, approved: !c.approved } : c
        ),
      }
    ));

  const toggleSmart = (draftId, phrase) =>
    setDraftData(prev => prev.map(d =>
      d.draft.id !== draftId ? d : {
        ...d,
        smartCandidates: d.smartCandidates.map(c =>
          c.phrase === phrase ? { ...c, approved: !c.approved } : c
        ),
      }
    ));

  const approveAll = () => setDraftData(prev => prev.map(d => ({
    ...d,
    boldCandidates:  d.boldCandidates.map(c  => ({ ...c,  approved: !!c.matched  && !c.alreadyLinked })),
    smartCandidates: d.smartCandidates.map(c => ({ ...c,  approved: !!c.matched })),
  })));

  const rejectAll = () => setDraftData(prev => prev.map(d => ({
    ...d,
    boldCandidates:  d.boldCandidates.map(c  => ({ ...c, approved: false })),
    smartCandidates: d.smartCandidates.map(c => ({ ...c, approved: false })),
  })));

  /* ── computed totals ── */
  const totalBoldApproved  = draftData.reduce((s, d) => s + d.boldCandidates.filter(c => c.approved && c.matched).length, 0);
  const totalBoldMatched   = draftData.reduce((s, d) => s + d.boldCandidates.filter(c => c.matched).length, 0);
  const totalSmartApproved = draftData.reduce((s, d) => s + d.smartCandidates.filter(c => c.approved && c.matched).length, 0);
  const totalSmartMatched  = draftData.reduce((s, d) => s + d.smartCandidates.filter(c => c.matched).length, 0);
  const totalApproved      = totalBoldApproved + totalSmartApproved;

  /* ── frequency views (memoized) ── */
  const { unmatchedPhrases } = useMemo(() => {
    const phraseMap = {};
    draftData.flatMap(d => d.boldCandidates).forEach(c => {
      if (c.matched) return;
      const k = normalize(c.phrase);
      if (!phraseMap[k]) phraseMap[k] = { phrase: c.phrase, count: 0 };
      phraseMap[k].count++;
    });
    return {
      unmatchedPhrases: Object.values(phraseMap).sort((a, b) => b.count - a.count),
    };
  }, [draftData]);

  /* ── confirm: Feature 1 first, then Feature 2 ── */
  const handleConfirm = async () => {
    if (totalApproved === 0) { onClose(); return; }
    setStep("saving");
    let saved = 0;
    try {
      await Promise.all(
        draftData.map(async ({ draft, html, boldCandidates, smartCandidates }) => {
          const approvedBold  = boldCandidates.filter(c => c.approved && c.matched);
          const approvedSmart = smartCandidates.filter(c => c.approved && c.matched);
          if (!approvedBold.length && !approvedSmart.length) return;

          // Feature 1 runs first
          let newHtml = applyBoldLinks(html, approvedBold);
          // Feature 2 runs on the result
          newHtml = applySmartLinks(newHtml, approvedSmart);

          const { error } = await supabase
            .from("book_summaries")
            .update({ summary: newHtml, auto_saved_at: new Date().toISOString() })
            .eq("id", draft.id);
          if (!error) saved += approvedBold.length + approvedSmart.length;
        })
      );
      setSaveCount(saved);
      setStep("done");
      if (typeof onSaved === "function") onSaved();
    } catch (err) {
      setErrorMsg(err.message || "Save failed");
      setStep("error");
    }
  };

  const pct = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

  const TABS = [
    { key: "preview",   label: "📋 Preview" },
    { key: "bold",      label: "🔵 Bold Links",   count: totalBoldMatched },
    { key: "smart",     label: "🧠 Smart Links",  count: totalSmartMatched },
    { key: "unmatched", label: "❓ Unmatched",     count: unmatchedPhrases.length },
  ];

  return (
    <div className="draft-panel__modal-overlay" style={{ zIndex: 1100 }} onClick={() => step !== "saving" && onClose()}>
      <div className="draft-panel__modal dp-autolink-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="dp-autolink-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🎯 Auto-link</h3>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6b7280" }}>
              {isBulk ? `${targets.length} drafts selected` : (targets[0]?.title || "Untitled")}
            </p>
          </div>
          {step !== "saving" && (
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#9ca3af", lineHeight:1 }}>✕</button>
          )}
        </div>

        {/* ── SCANNING ── */}
        {step === "scanning" && (
          <div className="dp-scan-container">
            <div style={{ fontSize: 32, marginBottom: 10 }}>
              {progressStage === "bold" ? "🔍" : "🧠"}
            </div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>
              {progressStage === "bold" ? "Pass 1 — Scanning bold phrases…" : "Pass 2 — Scanning smart phrases…"}
            </p>
            <p className="dp-scan-phrase">
              {progressPhrase ? `"${progressPhrase}"` : "Loading titles…"}
            </p>
            <div className="dp-scan-counter">
              <span className="dp-scan-counter__current">{progressCurrent}</span>
              <span style={{ color: "#9ca3af" }}> / {progressTotal || "…"} drafts</span>
              {progressEta && <span className="dp-scan-eta">{fmtSeconds(progressEta)}</span>}
            </div>
            <div className="dp-progress-track">
              <div className="dp-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{pct}%</div>
          </div>
        )}

        {/* ── PREVIEW / TABS ── */}
        {step === "preview" && (
          <>
            <div className="dp-tab-bar">
              {TABS.map(tab => (
                <button key={tab.key} type="button"
                  className={`dp-tab ${activeTab === tab.key ? "dp-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                  {tab.count != null && (
                    <span className={`dp-tab-badge ${activeTab === tab.key ? "dp-tab-badge--active" : ""}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB: PREVIEW (summary of both features) ── */}
            {activeTab === "preview" && (
              <>
                {totalBoldMatched === 0 && totalSmartMatched === 0 ? (
                  <div className="dp-empty-state">
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🤷</div>
                    <p>No phrases matched any article.</p>
                    <p style={{ fontSize: 13 }}>Try bolding some titles, or ensure article titles are 2–4 words.</p>
                  </div>
                ) : (
                  <>
                    <div className="dp-autolink-toolbar">
                      <button type="button" className="dp-btn dp-btn--secondary" onClick={approveAll}>✅ Approve all</button>
                      <button type="button" className="dp-btn dp-btn--secondary" onClick={rejectAll}>❌ Reject all</button>
                      <span style={{ fontSize:12, color:"#9ca3af", marginLeft:"auto" }}>
                        {totalApproved} links ready to apply
                      </span>
                    </div>

                    {/* Summary cards */}
                    <div style={{ display:"flex", gap:12, padding:"12px 16px", borderBottom:"1px solid #f3f4f6" }}>
                      <div className="dp-summary-card dp-summary-card--blue">
                        <div className="dp-summary-card__label">🔵 Bold Links</div>
                        <div className="dp-summary-card__count">{totalBoldApproved}</div>
                        <div className="dp-summary-card__sub">of {totalBoldMatched} matched</div>
                      </div>
                      <div className="dp-summary-card dp-summary-card--purple">
                        <div className="dp-summary-card__label">🧠 Smart Links</div>
                        <div className="dp-summary-card__count">{totalSmartApproved}</div>
                        <div className="dp-summary-card__sub">of {totalSmartMatched} matched</div>
                      </div>
                    </div>

                    {/* Per-draft preview table */}
                    <div className="dp-autolink-scroll">
                      {draftData.map(({ draft, boldCandidates, smartCandidates }) => {
                        const boldMatched  = boldCandidates.filter(c => c.matched);
                        const smartMatched = smartCandidates.filter(c => c.matched);
                        const hasAnything  = boldMatched.length > 0 || smartMatched.length > 0;
                        return (
                          <div key={draft.id} className="dp-autolink-section">
                            {isBulk && (
                              <div className="dp-autolink-section__heading">
                                <span className="draft-panel__draft-badge">DRAFT</span>
                                <strong style={{ fontSize:13 }}>{draft.title || "Untitled"}</strong>
                                {!hasAnything && (
                                  <span style={{ fontSize:12, color:"#9ca3af", marginLeft:8 }}>— no matches</span>
                                )}
                              </div>
                            )}
                            {!hasAnything ? (
                              <p style={{ fontSize:13, color:"#9ca3af", padding:"6px 12px" }}>No matches found.</p>
                            ) : (
                              <table className="dp-autolink-table">
                                <thead>
                                  <tr>
                                    <th style={{ width:32 }}>✓</th>
                                    <th>Phrase</th>
                                    <th style={{ width:80 }}>Type</th>
                                    <th>Matched article</th>
                                    <th style={{ width:72 }}>Link</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Bold candidates */}
                                  {boldCandidates.map((c, i) => (
                                    <tr key={"b-" + c.phrase + i} style={{
                                      background: c.alreadyLinked ? "#eff6ff" : c.approved && c.matched ? "#f0fdf4" : "transparent",
                                      opacity: c.matched ? 1 : 0.4,
                                    }}>
                                      <td>
                                        {c.alreadyLinked
                                          ? <span title="Already linked" style={{ color:"#3b82f6", fontSize:13 }}>🔗</span>
                                          : c.matched
                                            ? <input type="checkbox" checked={c.approved} onChange={() => toggleBold(draft.id, c.phrase)} />
                                            : <span style={{ color:"#d1d5db" }}>—</span>
                                        }
                                      </td>
                                      <td><strong>{c.phrase}</strong></td>
                                      <td><span className="dp-type-badge dp-type-badge--bold">Bold</span></td>
                                      <td style={{ color: c.matched ? "#2563eb" : "#9ca3af" }}>
                                        {c.matched ? c.matched.title : <em>No match</em>}
                                      </td>
                                      <td>
                                        {c.matched && (
                                          <a href={toLibraryHref(c.matched)} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize:11, color:"#6b7280", textDecoration:"underline" }}>
                                            preview ↗
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                  {/* Smart candidates */}
                                  {smartCandidates.map((c, i) => (
                                    <tr key={"s-" + c.phrase + i} style={{
                                      background: c.approved && c.matched ? "#faf5ff" : "transparent",
                                    }}>
                                      <td>
                                        {c.matched
                                          ? <input type="checkbox" checked={c.approved} onChange={() => toggleSmart(draft.id, c.phrase)} />
                                          : <span style={{ color:"#d1d5db" }}>—</span>
                                        }
                                      </td>
                                      <td style={{ color:"#374151" }}>{c.phrase}</td>
                                      <td><span className="dp-type-badge dp-type-badge--smart">Smart</span></td>
                                      <td style={{ color: c.matched ? "#7c3aed" : "#9ca3af" }}>
                                        {c.matched ? c.matched.title : <em>No match</em>}
                                      </td>
                                      <td>
                                        {c.matched && (
                                          <a href={toLibraryHref(c.matched)} target="_blank" rel="noopener noreferrer"
                                            style={{ fontSize:11, color:"#6b7280", textDecoration:"underline" }}>
                                            preview ↗
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                <div className="dp-autolink-footer">
                  <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>Cancel</button>
                  {totalApproved > 0 && (
                    <button type="button" className="dp-btn dp-btn--publish"
                      onClick={handleConfirm}>
                      🔗 Apply {totalApproved} link{totalApproved !== 1 ? "s" : ""} & Save
                      {isBulk && ` (${targets.length} drafts)`}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── TAB: BOLD LINKS ── */}
            {activeTab === "bold" && (
              <>
                <p className="dp-tab-desc">
                  Bold phrases matched to an article. <strong style={{ color:"#3b82f6" }}>🔗 = already linked</strong> in HTML.
                </p>
                {totalBoldMatched === 0 ? (
                  <div className="dp-empty-state">
                    <div style={{ fontSize:36, marginBottom:10 }}>🔍</div>
                    <p>No bold phrases matched any article.</p>
                  </div>
                ) : (
                  <div className="dp-autolink-scroll">
                    {draftData.map(({ draft, boldCandidates }) => {
                      const matched = boldCandidates.filter(c => c.matched);
                      if (!matched.length) return null;
                      return (
                        <div key={draft.id} className="dp-autolink-section">
                          {isBulk && (
                            <div className="dp-autolink-section__heading">
                              <span className="draft-panel__draft-badge">DRAFT</span>
                              <strong style={{ fontSize:13 }}>{draft.title || "Untitled"}</strong>
                            </div>
                          )}
                          <table className="dp-autolink-table">
                            <thead>
                              <tr>
                                <th style={{ width:32 }}>✓</th>
                                <th>Bold phrase</th>
                                <th>Matched article</th>
                                <th style={{ width:72 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {matched.map((c, i) => (
                                <tr key={c.phrase + i} style={{ background: c.alreadyLinked ? "#eff6ff" : "transparent" }}>
                                  <td>
                                    {c.alreadyLinked
                                      ? <span style={{ color:"#3b82f6", fontSize:13 }}>🔗</span>
                                      : <input type="checkbox" checked={c.approved} onChange={() => toggleBold(draft.id, c.phrase)} />
                                    }
                                  </td>
                                  <td><strong>{c.phrase}</strong></td>
                                  <td style={{ color:"#2563eb" }}>{c.matched?.title}</td>
                                  <td>
                                    {c.alreadyLinked
                                      ? <span style={{ color:"#3b82f6", fontSize:12, fontWeight:600 }}>linked</span>
                                      : <span style={{ color: c.approved ? "#16a34a" : "#9ca3af", fontSize:12 }}>
                                          {c.approved ? "✓ approved" : "skipped"}
                                        </span>
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="dp-autolink-footer">
                  <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>Close</button>
                  <button type="button" className="dp-btn dp-btn--publish" onClick={() => setActiveTab("preview")} disabled={totalApproved === 0}>
                    ← Back to preview
                  </button>
                </div>
              </>
            )}

            {/* ── TAB: SMART LINKS ── */}
            {activeTab === "smart" && (
              <>
                <p className="dp-tab-desc">
                  Unbolded 2–4 word phrases found in plain text, headers, and list items that match an article title.
                  These are <strong>not yet linked</strong> in the article.
                </p>
                {totalSmartMatched === 0 ? (
                  <div className="dp-empty-state">
                    <div style={{ fontSize:36, marginBottom:10 }}>🧠</div>
                    <p>No smart phrase matches found.</p>
                    <p style={{ fontSize:13, color:"#6b7280" }}>Smart links only match article titles that are 2–4 words long.</p>
                  </div>
                ) : (
                  <div className="dp-autolink-scroll">
                    {draftData.map(({ draft, smartCandidates }) => {
                      if (!smartCandidates.length) return null;
                      return (
                        <div key={draft.id} className="dp-autolink-section">
                          {isBulk && (
                            <div className="dp-autolink-section__heading">
                              <span className="draft-panel__draft-badge">DRAFT</span>
                              <strong style={{ fontSize:13 }}>{draft.title || "Untitled"}</strong>
                            </div>
                          )}
                          <table className="dp-autolink-table">
                            <thead>
                              <tr>
                                <th style={{ width:32 }}>✓</th>
                                <th>Phrase found in text</th>
                                <th>Matched article</th>
                                <th style={{ width:72 }}>Link</th>
                              </tr>
                            </thead>
                            <tbody>
                              {smartCandidates.map((c, i) => (
                                <tr key={c.phrase + i} style={{
                                  background: c.approved ? "#faf5ff" : "transparent",
                                }}>
                                  <td>
                                    <input type="checkbox" checked={c.approved} onChange={() => toggleSmart(draft.id, c.phrase)} />
                                  </td>
                                  <td style={{ color:"#374151" }}>{c.phrase}</td>
                                  <td style={{ color:"#7c3aed" }}>{c.matched?.title}</td>
                                  <td>
                                    <a href={toLibraryHref(c.matched)} target="_blank" rel="noopener noreferrer"
                                      style={{ fontSize:11, color:"#6b7280", textDecoration:"underline" }}>
                                      preview ↗
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="dp-autolink-footer">
                  <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>Close</button>
                  <button type="button" className="dp-btn dp-btn--publish" onClick={() => setActiveTab("preview")} disabled={totalApproved === 0}>
                    ← Back to preview
                  </button>
                </div>
              </>
            )}

            {/* ── TAB: UNMATCHED ── */}
            {activeTab === "unmatched" && (
              <>
                <p className="dp-tab-desc">
                  Bold phrases with <strong>no matching article</strong> — ranked by frequency.
                  High-count phrases are strong candidates for new articles.
                </p>
                {unmatchedPhrases.length === 0 ? (
                  <div className="dp-empty-state">
                    <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
                    <p>All bold phrases have a match!</p>
                  </div>
                ) : (
                  <div className="dp-autolink-scroll">
                    <table className="dp-autolink-table">
                      <thead>
                        <tr>
                          <th style={{ width:50 }}>Count</th>
                          <th>Phrase (no match found)</th>
                          <th style={{ width:200 }}>Suggestion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unmatchedPhrases.map((p, i) => (
                          <tr key={p.phrase + i}>
                            <td>
                              <span className={`dp-freq-badge ${p.count >= 5 ? "dp-freq-badge--hot" : p.count >= 2 ? "dp-freq-badge--warm" : "dp-freq-badge--cold"}`}>
                                {p.count}
                              </span>
                            </td>
                            <td><strong>{p.phrase}</strong></td>
                            <td style={{ fontSize:12, color:"#6b7280" }}>
                              {p.count >= 5 ? "🔥 High priority — create an article"
                                : p.count >= 2 ? "📌 Consider creating an article"
                                : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="dp-autolink-footer">
                  <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>Close</button>
                  <button type="button" className="dp-btn dp-btn--publish" onClick={() => setActiveTab("preview")} disabled={totalApproved === 0}>
                    ← Back to preview
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── SAVING ── */}
        {step === "saving" && (
          <div style={{ textAlign:"center", padding:"48px 0", color:"#6b7280" }}>
            <div className="dp-spinner" style={{ margin:"0 auto 18px" }} />
            <p>Saving{isBulk ? ` across ${targets.length} drafts` : ""}…</p>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
            <h4 style={{ margin:"0 0 8px", color:"#16a34a" }}>Done!</h4>
            <p style={{ color:"#6b7280", marginBottom:24 }}>
              {saveCount} link{saveCount !== 1 ? "s" : ""} applied{isBulk ? ` across ${targets.length} drafts` : ""}.
            </p>
            <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>Close</button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>⚠️</div>
            <h4 style={{ margin:"0 0 8px", color:"#dc2626" }}>Something went wrong</h4>
            <p style={{ color:"#6b7280", marginBottom:24 }}>{errorMsg}</p>
            <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   DRAFT PANEL
══════════════════════════════════════════════════════════ */
const DraftPanel = ({ onEdit }) => {
  const navigate = useNavigate();

  const [drafts, setDrafts]                         = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [selected, setSelected]                     = useState(new Set());
  const [perArticleCategory, setPerArticleCategory] = useState({});
  const [bulkCategory, setBulkCategory]             = useState("");
  const [bulkMode, setBulkMode]                     = useState("individual");
  const [publishing, setPublishing]                 = useState(false);
  const [publishResult, setPublishResult]           = useState(null);
  const [deleteTarget, setDeleteTarget]             = useState(null);
  const [deleteLoading, setDeleteLoading]           = useState(false);
  const [autoLinkTargets, setAutoLinkTargets]       = useState(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("book_summaries")
        .select("id, title, author, category, created_at, auto_saved_at, status, slug")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("auto_saved_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      setDrafts(data || []);
    } catch (err) { console.error("fetchDrafts error:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => selected.size === drafts.length
    ? setSelected(new Set())
    : setSelected(new Set(drafts.map(d => d.id)));

  const canBulkPublish = () => {
    if (selected.size === 0) return false;
    if (bulkMode === "all") return !!bulkCategory;
    return Array.from(selected).every(id =>
      !!(perArticleCategory[id] || drafts.find(d => d.id === id)?.category)
    );
  };

  const handleBulkPublish = async () => {
    if (!canBulkPublish()) return;
    setPublishing(true); setPublishResult(null);
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) { setPublishing(false); return; }
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const category = bulkMode === "all"
        ? bulkCategory
        : (perArticleCategory[id] || drafts.find(d => d.id === id)?.category);
      if (!category) { fail++; continue; }
      try {
        const { error } = await supabase.from("book_summaries")
          .update({ status: "published", category, auto_saved_at: null })
          .eq("id", id).eq("user_id", user.id);
        error ? fail++ : ok++;
      } catch { fail++; }
    }
    setPublishResult({ ok, fail });
    setSelected(new Set()); setPerArticleCategory({}); setBulkCategory("");
    await fetchDrafts(); setPublishing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("book_summaries")
        .delete().eq("id", deleteTarget).eq("user_id", user.id);
      if (error) throw error;
      setDeleteTarget(null);
      setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget); return n; });
      await fetchDrafts();
    } catch (err) { alert(`Could not delete: ${err.message}`); }
    finally { setDeleteLoading(false); }
  };

  if (loading) return <div className="draft-panel"><div className="draft-panel__loading">Loading drafts…</div></div>;

  return (
    <div className="draft-panel">
      {autoLinkTargets && (
        <AutoLinkModal
          drafts={autoLinkTargets}
          onClose={() => setAutoLinkTargets(null)}
          onSaved={() => { setAutoLinkTargets(null); fetchDrafts(); }}
        />
      )}

      <div className="draft-panel__header">
        <h2 className="draft-panel__title">
          📝 Drafts
          {drafts.length > 0 && <span className="draft-panel__count">{drafts.length}</span>}
        </h2>
        {drafts.length > 0 && (
          <button className="dp-btn dp-btn--secondary" onClick={fetchDrafts} type="button">↻ Refresh</button>
        )}
      </div>

      {publishResult && (
        <div className={`draft-panel__banner ${publishResult.fail > 0 ? "draft-panel__banner--warn" : "draft-panel__banner--ok"}`}>
          ✅ {publishResult.ok} published{publishResult.fail > 0 ? ` · ⚠️ ${publishResult.fail} failed` : ""}
          <button style={{ marginLeft:12, background:"none", border:"none", cursor:"pointer", color:"inherit" }}
            onClick={() => setPublishResult(null)}>✕</button>
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="draft-panel__empty">
          <div className="draft-panel__empty-icon">📄</div>
          <p>No drafts yet. Start writing and your work will auto-save here.</p>
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="draft-panel__bulk">
              <span className="draft-panel__bulk-info">{selected.size} selected</span>
              <button type="button" className="dp-btn dp-btn--autolink"
                onClick={() => setAutoLinkTargets(drafts.filter(d => selected.has(d.id)))}
                title={`Auto-link ${selected.size} draft${selected.size !== 1 ? "s" : ""}`}>
                🎯 Auto-link {selected.size > 1 ? `${selected.size} drafts` : "selected"}
              </button>
              <span className="dp-bulk-divider">|</span>
              <div className="draft-panel__bulk-mode">
                <label>
                  <input type="radio" name="bulkMode" value="individual" checked={bulkMode === "individual"} onChange={() => setBulkMode("individual")} />
                  {" "}Per article
                </label>
                <label style={{ marginLeft:14 }}>
                  <input type="radio" name="bulkMode" value="all" checked={bulkMode === "all"} onChange={() => setBulkMode("all")} />
                  {" "}Same for all
                </label>
              </div>
              {bulkMode === "all" && (
                <select className="draft-panel__bulk-cat" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
                  <option value="">— Choose category —</option>
                  {REAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button className="dp-btn dp-btn--publish" type="button"
                onClick={handleBulkPublish} disabled={publishing || !canBulkPublish()}>
                {publishing ? "Publishing…" : `🚀 Publish ${selected.size}`}
              </button>
            </div>
          )}

          <div className="draft-panel__table-wrap">
            <table className="draft-panel__table">
              <thead>
                <tr>
                  <th style={{ width:36 }}>
                    <input type="checkbox"
                      checked={selected.size === drafts.length && drafts.length > 0}
                      onChange={toggleAll} title="Select all" />
                  </th>
                  <th>Title</th>
                  <th>Author</th>
                  <th style={{ width:180 }}>Category</th>
                  <th style={{ width:120 }}>Last saved</th>
                  <th style={{ width:170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map(draft => {
                  const isSelected = selected.has(draft.id);
                  return (
                    <tr key={draft.id} className={isSelected ? "draft-panel__row--selected" : ""}>
                      <td><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(draft.id)} /></td>
                      <td className="draft-panel__title-cell">
                        <span className="draft-panel__draft-badge">DRAFT</span>
                        <button type="button" className="draft-panel__title-link"
                          onClick={() => navigate(draft.slug ? `/library/${draft.slug}` : `/library/${draft.id}`)}
                          title="Preview draft">
                          {draft.title || <em style={{ color:"#9ca3af" }}>Untitled</em>}
                        </button>
                      </td>
                      <td>{draft.author || <span style={{ color:"#9ca3af" }}>—</span>}</td>
                      <td>
                        {bulkMode === "individual" && isSelected ? (
                          <select
                            value={perArticleCategory[draft.id] || draft.category || ""}
                            onChange={e => setPerArticleCategory(prev => ({ ...prev, [draft.id]: e.target.value }))}
                            className="draft-panel__cat-select">
                            <option value="">— Choose category —</option>
                            {REAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: draft.category ? "#374151" : "#9ca3af", fontSize:13 }}>
                            {draft.category || "No category"}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize:12, color:"#6b7280" }}>
                        {fmtDate(draft.auto_saved_at || draft.created_at)}
                      </td>
                      <td>
                        <div style={{ display:"flex", gap:5 }}>
                          <button type="button" className="dp-btn dp-btn--edit"
                            onClick={() => onEdit?.(draft)} title="Edit">✏️ Edit</button>
                          <button type="button" className="dp-btn dp-btn--autolink"
                            onClick={() => setAutoLinkTargets([draft])}
                            title="Auto-link this draft">🎯 Link</button>
                          <button type="button" className="dp-btn dp-btn--danger"
                            onClick={() => setDeleteTarget(draft.id)} title="Delete">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {deleteTarget && (
        <div className="draft-panel__modal-overlay" onClick={() => !deleteLoading && setDeleteTarget(null)}>
          <div className="draft-panel__modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:44, marginBottom:8, textAlign:"center" }}>⚠️</div>
            <h3 style={{ margin:"0 0 8px", color:"#dc2626", textAlign:"center" }}>Delete this draft?</h3>
            <p style={{ color:"#6b7280", marginBottom:20, fontSize:14, textAlign:"center" }}>
              <strong>"{drafts.find(d => d.id === deleteTarget)?.title || "Untitled"}"</strong> will be permanently deleted.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}
                className="dp-btn dp-btn--secondary">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading}
                className="dp-btn dp-btn--danger" style={{ padding:"9px 22px" }}>
                {deleteLoading ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftPanel;