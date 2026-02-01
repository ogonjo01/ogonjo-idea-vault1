// src/components/CreateSummaryForm/CreateSummaryForm.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../supabase/supabaseClient";
import ReactQuill from "react-quill";
import Quill from "quill";
import slugify from "slugify";
import "quill/dist/quill.snow.css";
import "./CreateSummaryForm.css";

// ----------------- Custom clipboard for table pasting -----------------
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

// ----------------- Register internal link icon (visual) -----------------
try {
  const icons = Quill.import("ui/icons");
  icons.internalLink = '<svg viewBox="0 0 18 18"><path d="M7 7h4v1H7z"/></svg>';
} catch (e) {
  // ignore — Quill may not be ready during SSR/build steps
}

// ----------------- Categories & difficulties -----------------
const categories = [
  "Apps",
  "Business Legends",
  "Business Giants",
  "Business Concepts",
  "Business Strategy & Systems",
  "Courses & Learning Paths",
  "Best Books",
  "People",
  "Quotes",
  "Business Ideas",
  "Book Summaries",
  "Entrepreneurship",
  "Self-Improvement",
  "Marketing & Sales",
  "Money & Productivity",
  "Mindset & Motivation",
  "Career Development",
  "Video Insights",
  "Digital Skills & Technology",
  "Leadership & Management",
  "Concepts",
  "Strategic Communication",
];

const difficulties = [
  { value: "", label: "Not specified (optional)" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
];

// ----------------- Utility: scoring helpers -----------------
const normalize = (s = "") => String(s || "").trim().toLowerCase();
const uniqueWords = (s = "") =>
  Array.from(new Set(normalize(s).split(/\s+/).filter(Boolean)));

function wordMatchScore(a = "", b = "") {
  const aw = uniqueWords(a);
  const bw = uniqueWords(b);
  if (aw.length === 0 || bw.length === 0) return 0;
  const common = aw.filter((w) => bw.includes(w)).length;
  return common / Math.max(aw.length, bw.length);
}

function longestCommonSubstringRatio(a = "", b = "") {
  const A = String(a || ""),
    B = String(b || "");
  const n = A.length,
    m = B.length;
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

function combinedScore(candidateTitle = "", query = "") {
  const wscore = wordMatchScore(candidateTitle, query);
  const lcsr = longestCommonSubstringRatio(candidateTitle, query);
  const starts = normalize(candidateTitle).startsWith(normalize(query)) ? 1 : 0;
  return Math.min(1, 0.55 * wscore + 0.35 * lcsr + 0.1 * starts);
}

// ----------------- Plural variants helper -----------------
function generateVariants(word) {
  const w = normalize(word);
  const variants = new Set([w]);

  // simple english heuristics: s, es, y->ies
  variants.add(`${w}s`);
  variants.add(`${w}es`);
  if (w.endsWith("y") && w.length > 1) {
    variants.add(`${w.slice(0, -1)}ies`);
  }
  // some common irregulars (small set)
  if (w.endsWith("is")) variants.add(`${w.slice(0, -2)}es`); // analysis -> analyses (not perfect)
  // return array
  return Array.from(variants);
}

// ----------------- Keywords helper (new) -----------------
// Parse comma-separated keywords string -> normalized array (trim, lowercase, dedupe, limit)
function parseKeywords(input, max = 8) {
  if (!input) return [];
  const parts = input
    .split(",")
    .map((k) => (k || "").trim().toLowerCase())
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

// ----------------- Component -----------------
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
  const [keywordsInput, setKeywordsInput] = useState(""); // <-- NEW
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Quill ref + internal-link modal state
  const quillRef = useRef(null);
  const [showInternalLinkModal, setShowInternalLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState([]);
  const [selectedRangeForLink, setSelectedRangeForLink] = useState(null);

  // auto-generate slug from title (create flow)
  useEffect(() => {
    if (!title || !title.trim()) {
      setSlug("");
      return;
    }
    const generated = slugify(title, { lower: true, strict: true, replacement: "-" });
    setSlug(generated);
  }, [title]);

  // show parsed keywords count (live) - memoized
  const parsedKeywordsPreview = useMemo(() => parseKeywords(keywordsInput, 8), [keywordsInput]);

  // Quill modules (memoized) with custom handler for internalLink
  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["internalLink"], // custom internal link button
          ["clean"],
        ],
        handlers: {
          internalLink: () => {
            const editor = quillRef.current?.getEditor();
            if (!editor) return;
            const range = editor.getSelection();
            if (!range || range.length === 0) {
              alert("Select text to link, then click 'Link to summary'.");
              return;
            }
            setSelectedRangeForLink(range);
            setShowInternalLinkModal(true);
          },
        },
      },
      clipboard: { matchVisual: false },
    }),
    []
  );

  const quillFormats = useMemo(
    () => [
      "header",
      "bold",
      "italic",
      "underline",
      "strike",
      "list",
      "bullet",
      "blockquote",
      "code-block",
      "link",
      "image",
      "table",
    ],
    []
  );

  // search summaries for internal link modal
  useEffect(() => {
    let cancelled = false;
    if (!linkSearch || linkSearch.trim().length < 1) {
      setLinkResults([]);
      return;
    }
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from("book_summaries")
          .select("id, title")
          .ilike("title", `%${linkSearch}%`)
          .limit(10);

        if (cancelled) return;
        if (error) {
          console.error("Search error:", error);
          setLinkResults([]);
        } else {
          setLinkResults(data || []);
        }
      } catch (err) {
        console.error("Search exception:", err);
        if (!cancelled) setLinkResults([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [linkSearch]);

  // Insert internal link (manual link)
  const insertInternalLink = (summaryItem) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.error("Quill editor not available");
      return;
    }

    const range = selectedRangeForLink || editor.getSelection();
    if (!range) {
      alert("Selection lost. Please re-select text and try again.");
      setShowInternalLinkModal(false);
      return;
    }

    try {
      editor.focus();
      editor.setSelection(range.index, range.length);
    } catch (e) {}

    let selectedText = "";
    try {
      if (range.length && editor.getText(range.index, range.length)) {
        selectedText = editor.getText(range.index, range.length).trim();
      }
    } catch (e) {}
    if (!selectedText) selectedText = summaryItem.title || "link";

    try {
      editor.deleteText(range.index, range.length);
      editor.insertText(range.index, selectedText, { link: `#summary-${summaryItem.id}` }, "user");
    } catch (e) {
      console.error("Insert text failed:", e);
    }

    const tryAttachDataAttr = (attempt = 0) => {
      try {
        const [leaf] = editor.getLeaf(range.index);
        const domNode = leaf?.domNode;
        const anchor =
          domNode?.parentElement && domNode.parentElement.tagName === "A"
            ? domNode.parentElement
            : null;

        if (anchor) {
          anchor.setAttribute("data-summary-id", summaryItem.id);
          anchor.classList.add("internal-summary-link");
          anchor.setAttribute("href", `#summary-${summaryItem.id}`);
          return true;
        }
      } catch (err) {
        // swallow and retry
      }

      if (attempt < 4) {
        setTimeout(() => tryAttachDataAttr(attempt + 1), 30 * (attempt + 1));
        return false;
      }

      try {
        const safeText = selectedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        editor.deleteText(range.index, selectedText.length);
        editor.clipboard.dangerouslyPasteHTML(
          range.index,
          `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="#summary-${summaryItem.id}">${safeText}</a>`
        );
        return true;
      } catch (err) {
        console.warn("Fallback paste failed:", err);
        return false;
      }
    };

    tryAttachDataAttr(0);

    try {
      editor.setSelection(range.index + selectedText.length, 0);
    } catch (e) {}

    // Keep React state in sync
    try {
      setSummaryText(editor.root.innerHTML);
    } catch (e) {}

    setShowInternalLinkModal(false);
    setLinkSearch("");
    setLinkResults([]);
    setSelectedRangeForLink(null);
  };

  // ----------------- helper: fetch rows with title candidates for a string -----------------
  // returns array of {id,title,keywords} (keywords may be undefined)
  const fetchTitleCandidates = async (text, limit = 200) => {
    const q = String(text || "").trim();
    if (!q) return [];
    try {
      const { data, error } = await supabase
        .from("book_summaries")
        .select("id, title, keywords")
        .ilike("title", `%${q}%`)
        .limit(limit);
      if (error) {
        console.warn("fetchTitleCandidates error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn("fetchTitleCandidates exception:", e);
      return [];
    }
  };

  // ----------------- helper: fetch some rows that have keywords (small sample) -----------------
  // We'll fetch a limited set to avoid huge loads, then filter client-side.
  const fetchKeywordRows = async (limit = 1000) => {
    try {
      const { data, error } = await supabase
        .from("book_summaries")
        .select("id, title, keywords")
        .not("keywords", "is", null)
        .limit(limit);
      if (error) {
        console.warn("fetchKeywordRows error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn("fetchKeywordRows exception:", e);
      return [];
    }
  };

  // ----------------- Exact auto-link (NEW) -----------------
  // Links only when normalized bold text exactly equals a title (or its simple plural variants)
  const autoLinkBoldTextExact = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      alert("Editor not available.");
      return;
    }
    const root = editor.root;
    if (!root) {
      alert("Editor root not available.");
      return;
    }

    const nodeList = Array.from(root.querySelectorAll("strong, b, .ql-bold, *[style*='font-weight']"));
    const candidates = [];

    nodeList.forEach((node) => {
      if (node.closest && node.closest("a")) return; // already linked
      let isBold = false;
      if (node.tagName && (node.tagName.toLowerCase() === "strong" || node.tagName.toLowerCase() === "b")) {
        isBold = true;
      } else {
        try {
          const cs = window.getComputedStyle(node);
          const fw = cs && cs.fontWeight ? cs.fontWeight : "";
          const num = parseInt(fw, 10);
          if (!isNaN(num) && num >= 600) isBold = true;
          if (fw === "bold" || fw === "bolder") isBold = true;
        } catch (e) {}
      }
      if (!isBold) return;
      const text = (node.textContent || "").trim();
      if (!text) return;
      if (text.length < 3) return;
      candidates.push({ text, node });
    });

    if (candidates.length === 0) {
      alert("No bold text found to auto-link (exact).");
      return;
    }

    // dedupe by normalized text
    const mapByText = new Map();
    candidates.forEach(({ text, node }) => {
      const key = normalize(text);
      if (!mapByText.has(key)) mapByText.set(key, { text: text.trim(), nodes: [node] });
      else mapByText.get(key).nodes.push(node);
    });

    let linkedCount = 0;

    for (const [key, { text, nodes }] of mapByText.entries()) {
      try {
        // fetch candidates with title containing the text (narrow)
        const titleCandidates = await fetchTitleCandidates(text, 50);

        // Filter for exact normalized equality or simple variant equality
        const variants = generateVariants(text);
        let matched = null;
        for (const c of titleCandidates) {
          try {
            if (!c || !c.title) continue;
            const nt = normalize(c.title || "");
            if (nt === normalize(text) || variants.includes(nt)) {
              matched = c;
              break;
            }
          } catch (e) {}
        }

        // If not found, as a fallback, try a more exhaustive pass: fetch small keyword sample and check normalized title equality
        if (!matched) {
          const sample = await fetchKeywordRows(500); // smaller sample
          for (const c of sample) {
            try {
              if (!c || !c.title) continue;
              const nt = normalize(c.title || "");
              if (nt === normalize(text) || variants.includes(nt)) {
                matched = c;
                break;
              }
            } catch (e) {}
          }
        }

        if (!matched || !matched.id) continue;

        // link all nodes (same as existing logic)
        nodes.forEach((node) => {
          try {
            if (node.closest && node.closest("a")) return;
            const anchor = document.createElement("a");
            anchor.setAttribute("data-summary-id", matched.id);
            anchor.setAttribute("href", `#summary-${matched.id}`);
            anchor.className = "internal-summary-link";
            node.parentNode && node.parentNode.replaceChild(anchor, node);
            anchor.appendChild(node);
            linkedCount += 1;
          } catch (err) {
            try {
              const safeText = (node.textContent || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              const parent = node.parentNode;
              if (parent) {
                parent.replaceChild(document.createTextNode(""), node);
                parent.innerHTML = parent.innerHTML.replace(
                  /$/,
                  `<a data-summary-id="${matched.id}" class="internal-summary-link" href="#summary-${matched.id}">${safeText}</a>`
                );
                linkedCount += 1;
              }
            } catch (e) {
              console.warn("Exact auto-link fallback failed for node:", e);
            }
          }
        });
      } catch (err) {
        console.error("Exact auto-link error for text:", text, err);
      }
    }

    try {
      if (editor.update) editor.update("user");
    } catch (e) {}

    try {
      setSummaryText(editor.root.innerHTML);
    } catch (e) {}

    alert(`Exact auto-link complete — ${linkedCount} item(s) linked.`);
  };

  // ----------------- Keyword+Title auto-link (NEW) -----------------
  // Uses both title matches and keywords array. Scores candidates and picks best.
  const autoLinkBoldTextKeywords = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      alert("Editor not available.");
      return;
    }
    const root = editor.root;
    if (!root) {
      alert("Editor root not available.");
      return;
    }

    const nodeList = Array.from(root.querySelectorAll("strong, b, .ql-bold, *[style*='font-weight']"));
    const candidates = [];

    nodeList.forEach((node) => {
      if (node.closest && node.closest("a")) return; // already linked
      let isBold = false;
      if (node.tagName && (node.tagName.toLowerCase() === "strong" || node.tagName.toLowerCase() === "b")) {
        isBold = true;
      } else {
        try {
          const cs = window.getComputedStyle(node);
          const fw = cs && cs.fontWeight ? cs.fontWeight : "";
          const num = parseInt(fw, 10);
          if (!isNaN(num) && num >= 600) isBold = true;
          if (fw === "bold" || fw === "bolder") isBold = true;
        } catch (e) {}
      }
      if (!isBold) return;
      const text = (node.textContent || "").trim();
      if (!text) return;
      if (text.length < 3) return;
      candidates.push({ text, node });
    });

    if (candidates.length === 0) {
      alert("No bold text found to auto-link (keywords).");
      return;
    }

    // dedupe by normalized text
    const mapByText = new Map();
    candidates.forEach(({ text, node }) => {
      const key = normalize(text);
      if (!mapByText.has(key)) mapByText.set(key, { text: text.trim(), nodes: [node] });
      else mapByText.get(key).nodes.push(node);
    });

    // We'll fetch a sample of keyworded rows to evaluate keyword matches
    let keywordRowsSample = [];
    try {
      keywordRowsSample = await fetchKeywordRows(800); // adjust if needed
    } catch (e) {
      keywordRowsSample = [];
    }

    let linkedCount = 0;

    for (const [key, { text, nodes }] of mapByText.entries()) {
      try {
        // 1) Title candidates (narrow)
        const titleCandidates = await fetchTitleCandidates(text, 200);

        // 2) Also include keywordRowsSample candidates that mention the token(s)
        const tokens = uniqueWords(text);
        const normalizedTokens = tokens.map((t) => normalize(t));

        const keywordCandidates = keywordRowsSample.filter((r) => {
          try {
            if (!r || !r.keywords) return false;
            const kw = (r.keywords || []).map((k) => normalize(String(k || "")));
            // if any token fully appears inside any keyword OR full text matches a keyword
            return normalizedTokens.some((t) => kw.includes(t) || kw.some((k) => k.includes(t)));
          } catch (e) {
            return false;
          }
        });

        // Merge candidates deduped by id
        const byId = new Map();
        titleCandidates.forEach((c) => {
          if (c && c.id) byId.set(c.id, c);
        });
        keywordCandidates.forEach((c) => {
          if (c && c.id && !byId.has(c.id)) byId.set(c.id, c);
        });
        const mergedCandidates = Array.from(byId.values());

        if (mergedCandidates.length === 0) {
          // no candidates - skip
          continue;
        }

        // Score each candidate:
        // baseScore = combinedScore(title, text)  (0..1)
        // if exact normalized title eq text => +1.0 (make it dominant)
        // if candidate.keywords contains normalized full text => +0.6
        // if candidate.keywords contains any token => +0.35 per matching token (capped)
        // final score capped at 1
        let best = null;
        let bestScore = 0;
        for (const c of mergedCandidates) {
          try {
            const title = c.title || "";
            let score = combinedScore(title, text); // 0..1

            const nt = normalize(title);
            if (nt === normalize(text)) {
              score = Math.max(score, 0.95); // near-certain priority
            }

            if (c.keywords && Array.isArray(c.keywords)) {
              const kws = c.keywords.map((k) => normalize(String(k || "")));
              if (kws.includes(normalize(text))) {
                score = Math.max(score, score + 0.6);
              } else {
                // add partial score for token matches
                const tokenMatches = normalizedTokens.filter((t) => kws.some((k) => k === t || k.includes(t))).length;
                if (tokenMatches > 0) {
                  score = score + Math.min(0.35, 0.12 * tokenMatches); // small boost
                }
              }
            }

            // clamp
            if (score > 1) score = 1;
            if (score > bestScore) {
              bestScore = score;
              best = c;
            }
          } catch (e) {
            // ignore candidate
          }
        }

        // Decide threshold: require reasonable confidence
        // If exact normalized title -> allow (already boosted).
        // If score >= 0.65 -> accept; else skip.
        if (!best || !best.id) continue;
        if (bestScore < 0.65) {
          // skip low-confidence matches to keep it safer than the fuzzy auto-link
          continue;
        }

        // link all nodes
        nodes.forEach((node) => {
          try {
            if (node.closest && node.closest("a")) return;
            const anchor = document.createElement("a");
            anchor.setAttribute("data-summary-id", best.id);
            anchor.setAttribute("href", `#summary-${best.id}`);
            anchor.className = "internal-summary-link";
            node.parentNode && node.parentNode.replaceChild(anchor, node);
            anchor.appendChild(node);
            linkedCount += 1;
          } catch (err) {
            try {
              const safeText = (node.textContent || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              const parent = node.parentNode;
              if (parent) {
                parent.replaceChild(document.createTextNode(""), node);
                parent.innerHTML = parent.innerHTML.replace(
                  /$/,
                  `<a data-summary-id="${best.id}" class="internal-summary-link" href="#summary-${best.id}">${safeText}</a>`
                );
                linkedCount += 1;
              }
            } catch (e) {
              console.warn("Keyword auto-link fallback failed for node:", e);
            }
          }
        });
      } catch (err) {
        console.error("Keyword auto-link error for text:", text, err);
      }
    }

    try {
      if (editor.update) editor.update("user");
    } catch (e) {}

    try {
      setSummaryText(editor.root.innerHTML);
    } catch (e) {}

    alert(`Keyword auto-link complete — ${linkedCount} item(s) linked.`);
  };

  // ----------------- Auto-link Bold Text (narrower single-word behavior) -----------------
  // (existing similarity-based engine — left intact)
  const autoLinkBoldText = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      alert("Editor not available.");
      return;
    }
    const root = editor.root;
    if (!root) {
      alert("Editor root not available.");
      return;
    }

    // Collect nodes which are bold (strong, b, or element styled bold)
    const nodeList = Array.from(root.querySelectorAll("strong, b, *[style*='font-weight']"));
    const candidates = [];

    nodeList.forEach((node) => {
      if (node.closest && node.closest("a")) return; // already linked
      // determine boldness for style-based nodes
      let isBold = false;
      if (node.tagName && (node.tagName.toLowerCase() === "strong" || node.tagName.toLowerCase() === "b")) {
        isBold = true;
      } else {
        try {
          const cs = window.getComputedStyle(node);
          const fw = cs && cs.fontWeight ? cs.fontWeight : "";
          const num = parseInt(fw, 10);
          if (!isNaN(num) && num >= 600) isBold = true;
          if (fw === "bold" || fw === "bolder") isBold = true;
        } catch (e) {}
      }
      if (!isBold) return;

      const text = (node.textContent || "").trim();
      if (!text) return;
      // ignore very short tokens (1-2 chars)
      if (text.length < 3) return;

      candidates.push({ text, node });
    });

    if (candidates.length === 0) {
      alert("No bold text found to auto-link.");
      return;
    }

    // dedupe by lowercased text
    const mapByText = new Map();
    candidates.forEach(({ text, node }) => {
      const key = normalize(text);
      if (!mapByText.has(key)) mapByText.set(key, { text: text.trim(), nodes: [node] });
      else mapByText.get(key).nodes.push(node);
    });

    let linkedCount = 0;

    // sequentially process each unique text (to reduce DB pressure)
    for (const [key, { text, nodes }] of mapByText.entries()) {
      try {
        const tokens = uniqueWords(text);
        const isSingleToken = tokens.length === 1;

        let best = null;

        if (isSingleToken) {
          // For single words: require higher accuracy and whole-word matching
          best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.75 });

          // If not found, try singular/plural flip (already inside searchBestMatch but attempt one more relaxed pass)
          if (!best) {
            // second fallback: relax threshold to 0.6 but still require whole-word check
            best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.6 });
          }
        } else {
          // For multi-word: allow looser matching
          best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.5 });
          if (!best) {
            // try again with slightly lower threshold
            best = await searchBestMatch(text, { limitCandidates: 50, minScore: 0.4 });
          }
        }

        if (!best || !best.id) continue;

        // wrap each node in anchor (skip if inside anchor)
        nodes.forEach((node) => {
          try {
            if (node.closest && node.closest("a")) return;
            const anchor = document.createElement("a");
            anchor.setAttribute("data-summary-id", best.id);
            anchor.setAttribute("href", `#summary-${best.id}`);
            anchor.className = "internal-summary-link";
            // Move node inside anchor
            node.parentNode && node.parentNode.replaceChild(anchor, node);
            anchor.appendChild(node);
            linkedCount += 1;
          } catch (err) {
            // fallback: replace node with anchor HTML using parent.innerHTML
            try {
              const safeText = (node.textContent || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              const parent = node.parentNode;
              if (parent) {
                parent.replaceChild(document.createTextNode(""), node);
                parent.innerHTML = parent.innerHTML.replace(
                  /$/,
                  `<a data-summary-id="${best.id}" class="internal-summary-link" href="#summary-${best.id}">${safeText}</a>`
                );
                linkedCount += 1;
              }
            } catch (e) {
              console.warn("Auto-link fallback failed for node:", e);
            }
          }
        });
      } catch (err) {
        console.error("Auto-link search error for text:", text, err);
      }
    }

    // Ask Quill to re-evaluate the DOM state (best-effort)
    try {
      if (editor.update) editor.update("user");
    } catch (e) {}

    // sync React state with current editor HTML
    try {
      setSummaryText(editor.root.innerHTML);
    } catch (e) {}

    alert(`Auto-linking complete — ${linkedCount} item(s) linked.`);
  };

  // ----------------- Advanced search for best match with single-word narrowing -----------------
  // Returns best candidate object { id, title } or null
  const searchBestMatch = async (text, opts = { limitCandidates: 50, minScore: 0.6 }) => {
    const q = String(text || "").trim();
    if (!q) return null;

    const tokens = uniqueWords(q);
    const isSingleToken = tokens.length === 1;
    const token = tokens[0] ?? "";

    // 1) exact title equality check (case-sensitive first, then case-insensitive)
    try {
      const { data: exact, error: errExact } = await supabase
        .from("book_summaries")
        .select("id, title")
        .eq("title", q)
        .maybeSingle();

      if (!errExact && exact && exact.id) return exact;
    } catch (e) {
      console.warn("Exact match error:", e);
    }

    // 2) case-insensitive phrase match (quick)
    try {
      const { data: phrase, error: errPhrase } = await supabase
        .from("book_summaries")
        .select("id, title")
        .ilike("title", `%${q}%`)
        .limit(1)
        .maybeSingle();

      if (!errPhrase && phrase && phrase.id) {
        // If single token, only accept if phrase contains token as whole word (checked later)
        if (!isSingleToken) return phrase;
        // else we'll still return to deeper check later — but give it priority
      }
    } catch (e) {
      console.warn("Phrase match error:", e);
    }

    // For single word queries: be conservative and prefer whole-word matches or exact variants
    if (isSingleToken) {
      const variants = generateVariants(token); // token, tokens with s/es/ies
      // Try strict equality with variants (case-insensitive)
      try {
        for (const v of variants) {
          const { data: eq, error: eqErr } = await supabase
            .from("book_summaries")
            .select("id, title")
            .ilike("title", v)
            .limit(1)
            .maybeSingle();

          if (!eqErr && eq && eq.id) return eq;
        }
      } catch (e) {
        // ignore
      }

      // fetch candidates containing token (broad)
      const orFilters = variants.map((t) => `title.ilike.%${t}%`).join(",");
      try {
        const { data: candidates = [], error } = await supabase
          .from("book_summaries")
          .select("id, title")
          .or(orFilters)
          .limit(opts.limitCandidates);

        if (error) {
          console.warn("Candidates fetch error:", error);
          return null;
        }

        if (!candidates || candidates.length === 0) return null;

        // Filter candidates: require candidate title to contain token (or its simple plural) as a whole word
        const normalizedToken = normalize(token);
        const tokenVariants = generateVariants(normalizedToken);

        const candidateMatches = candidates.filter((c) => {
          const candWords = uniqueWords(c.title || "");
          // whole-word check
          return tokenVariants.some((v) => candWords.includes(v));
        });

        // Score remaining candidates, pick best
        let best = null;
        let bestScore = 0;
        candidateMatches.forEach((c) => {
          const score = combinedScore(c.title || "", q);
          if (score > bestScore) {
            bestScore = score;
            best = c;
          }
        });

        // Require stricter threshold for single words to avoid loose matches
        const threshold = opts.minScore != null ? opts.minScore : 0.7;
        if (best && bestScore >= threshold) return best;

        // if nothing meets threshold, return null (do not return loose matches)
        return null;
      } catch (e) {
        console.error("Candidate search exception (single token):", e);
        return null;
      }
    }

    // For multi-word queries: previous token-based approach (less strict)
    try {
      const tokensForSearch = tokens.slice(0, 6);
      if (tokensForSearch.length === 0) return null;
      const orFilters = tokensForSearch.map((t) => `title.ilike.%${t}%`).join(",");

      const { data: candidates = [], error } = await supabase
        .from("book_summaries")
        .select("id, title")
        .or(orFilters)
        .limit(opts.limitCandidates);

      if (error) {
        console.warn("Candidates fetch error:", error);
        return null;
      }
      if (!candidates || candidates.length === 0) return null;

      let best = null;
      let bestScore = 0;
      candidates.forEach((c) => {
        const score = combinedScore(c.title || "", q);
        if (score > bestScore) {
          bestScore = score;
          best = c;
        }
      });

      const threshold = opts.minScore != null ? opts.minScore : 0.5;
      if (best && bestScore >= threshold) return best;

      return best && bestScore > 0.25 ? best : null;
    } catch (e) {
      console.error("Candidate search exception (multi-token):", e);
      return null;
    }
  };

  // ----------------- Remove internal links and bold text replacement -----------------
  // Finds anchors with data-summary-id and replaces them with <strong>text</strong>
  const removeInternalLinksAndBold = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      alert("Editor not available.");
      return;
    }
    const root = editor.root;
    if (!root) {
      alert("Editor root not available.");
      return;
    }

    const anchors = Array.from(root.querySelectorAll('a[data-summary-id].internal-summary-link, a[data-summary-id]'));
    if (anchors.length === 0) {
      alert("No internal links found.");
      return;
    }

    let removed = 0;
    anchors.forEach((a) => {
      try {
        const text = (a.textContent || "").trim();
        const strong = document.createElement("strong");
        strong.textContent = text;
        a.parentNode && a.parentNode.replaceChild(strong, a);
        removed += 1;
      } catch (e) {
        console.warn("Failed to remove anchor", e);
      }
    });

    try {
      if (editor.update) editor.update("user");
    } catch (e) {}

    // sync React state with editor HTML
    try {
      setSummaryText(editor.root.innerHTML);
    } catch (e) {}

    alert(`Removed ${removed} internal link(s) and made them bold.`);
  };

  // ----------------- Submit handler (create) -----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    if (!author.trim()) {
      setErrorMsg("Author is required.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("You must be logged in to create a summary.");
        setLoading(false);
        return;
      }

      let finalSlug = slug || slugify(title || "", { lower: true, strict: true, replacement: "-" });

      // Check slug collision
      try {
        const { data: existing } = await supabase
          .from("book_summaries")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();

        if (existing) {
          let counter = 2;
          while (true) {
            const newSlug = `${slug || finalSlug}-${counter}`;
            const { data: exists } = await supabase
              .from("book_summaries")
              .select("id")
              .eq("slug", newSlug)
              .maybeSingle();
            if (!exists) {
              finalSlug = newSlug;
              break;
            }
            counter++;
            if (counter > 1000) {
              finalSlug = `${slug || finalSlug}-${Date.now()}`;
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Slug collision check error:", err);
      }

      const parsedTags = (tags || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      // Parse keywords (new): optional. If empty => null
      const parsedKeywords = parseKeywords(keywordsInput, 8);
      const keywordsToSave = parsedKeywords.length ? parsedKeywords : null;

      const affiliateValue = affiliateLink && affiliateLink.trim() ? `${affiliateType}|${affiliateLink.trim()}` : null;

      const allowedDifficulties = ["Beginner", "Intermediate", "Advanced"];
      const difficultyToSave = allowedDifficulties.includes(difficulty) ? difficulty : null;

      const finalDescription = description && description.trim()
        ? description.trim()
        : String(summaryText || "").replace(/<[^>]*>/g, "").slice(0, 200);

      const { error } = await supabase.from("book_summaries").insert([{
        title: title.trim(),
        author: author.trim(),
        description: finalDescription,
        summary: summaryText || null,
        category,
        user_id: user.id,
        image_url: imageUrl || null,
        affiliate_link: affiliateValue,
        youtube_url: youtubeUrl || null,
        tags: parsedTags,
        keywords: keywordsToSave, // <-- NEW: save keywords if provided
        slug: finalSlug || null,
        difficulty_level: difficultyToSave,
      }]);

      setLoading(false);

      if (error) {
        console.error("Insert error:", error);
        setErrorMsg(error.message || "Error creating summary.");
      } else {
        if (typeof onNewSummary === "function") onNewSummary();
        if (typeof onClose === "function") onClose();
      }
    } catch (err) {
      console.error("Unexpected submit error:", err);
      setErrorMsg("Unexpected error. See console.");
      setLoading(false);
    }
  };

  // ----------------- Render modal -----------------
  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Create a New Summary</h2>

        {errorMsg && <div className="form-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="summary-form">
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
          {slug && <small className="slug-preview">Generated slug: <code>/summary/{slug}</code></small>}

          <label>Author</label>
          <input type="text" value={author} onChange={e => setAuthor(e.target.value)} required />

          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} required>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label>Difficulty level (optional)</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            {difficulties.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          <label>Description (short preview for feeds)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description (150-250 chars)" maxLength={300} rows={3} />

          <label>Book Cover Image URL</label>
          <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/cover.jpg" />

          <label>Affiliate Link</label>
          <div className="affiliate-row" style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", marginBottom: 6 }}>
            <input type="url" value={affiliateLink} onChange={e => setAffiliateLink(e.target.value)} placeholder="Affiliate link (https://...)" style={{ flex: 1, minWidth: 0, padding: "8px 10px" }} />
            <select value={affiliateType} onChange={e => setAffiliateType(e.target.value)} style={{ width: "12%", minWidth: 100, padding: "6px 8px" }}>
              <option value="book">Get Book</option>
              <option value="pdf">Get PDF</option>
              <option value="app">Open App</option>
            </select>
          </div>

          <label>YouTube URL</label>
          <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />

          <label>Tags (comma separated)</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="business, leadership, strategy" />

          <label>Keywords (optional, comma separated)</label>
          <input
            type="text"
            value={keywordsInput}
            onChange={(e) => setKeywordsInput(e.target.value)}
            placeholder="e.g. business strategy, growth, productivity"
          />
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
            <span>{parsedKeywordsPreview.length} / 8 keywords</span>
            <span style={{ marginLeft: 8 }}>Paste comma-separated keywords — they will be normalized, deduped, and limited to 8.</span>
          </div>

          <label>Summary</label>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: 'wrap' }}>
            <button type="button" className="hf-btn" onClick={autoLinkBoldText}>🔗 Auto-link bold text</button>

            {/* NEW buttons */}
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextExact}>🎯 Exact auto-link</button>
            <button type="button" className="hf-btn" onClick={autoLinkBoldTextKeywords}>🧠 Keyword auto-link</button>

            <button type="button" className="hf-btn" onClick={removeInternalLinksAndBold}>✂️ Remove links & bold</button>
            <button type="button" className="hf-btn" onClick={() => { setShowInternalLinkModal(true); }}>
              🔎 Manual link
            </button>
            <div style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>
              Only bold text is auto-linked. Use 🎯 for strict exact-title linking, 🧠 to prioritize keywords+title, and 🔗 for fuzzy matches.
            </div>
          </div>

          <div className="quill-container">
            <ReactQuill
              ref={quillRef}
              value={summaryText}
              onChange={setSummaryText}
              modules={quillModules}
              formats={quillFormats}
              theme="snow"
            />
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: 12 }}>{loading ? "Submitting..." : "Submit Summary"}</button>
        </form>

        {/* Internal Link Modal */}
        {showInternalLinkModal && (
          <div className="internal-link-modal" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(""); setLinkResults([]); }}>
            <div className="internal-link-box" onClick={(e) => e.stopPropagation()}>
              <h4>Link to summary</h4>
              <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Search summaries by title..." autoFocus />
              <div className="link-results" style={{ maxHeight: 260, overflowY: "auto", marginTop: 8 }}>
                {linkResults.length === 0 && <div style={{ padding: 8, color: "#666" }}>No results</div>}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {linkResults.map(r => (
                    <li key={r.id} style={{ marginBottom: 6 }}>
                      <button type="button" className="hf-btn" onClick={() => insertInternalLink(r)} style={{ width: "100%", textAlign: "left" }}>
                        {r.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
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
