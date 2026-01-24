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

  // Quill modules (memoized) with custom handler for internalLink
  const quillModules = useMemo(() => ({
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
  }), []);

  const quillFormats = [
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
  ];

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
    return () => { cancelled = true; };
  }, [linkSearch]);

  // Robust insertInternalLink: retry setting attributes, fallback to paste HTML
  const insertInternalLink = (summaryItem) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.error("Quill editor not available");
      return;
    }

    // Restore selection (modal steals focus)
    const range = selectedRangeForLink || editor.getSelection();
    if (!range) {
      alert("Selection lost. Please re-select text and try again.");
      setShowInternalLinkModal(false);
      return;
    }

    // Ensure editor focused and selection set
    try { editor.focus(); editor.setSelection(range.index, range.length); } catch (e) { /* ignore */ }

    // Determine text to link
    let selectedText = "";
    try {
      if (range.length && editor.getText(range.index, range.length)) {
        selectedText = editor.getText(range.index, range.length).trim();
      }
    } catch (e) {
      // ignore
    }
    if (!selectedText) selectedText = summaryItem.title || "link";

    // Delete current selection and insert text with a placeholder href
    try {
      editor.deleteText(range.index, range.length);
      editor.insertText(range.index, selectedText, { link: `#summary-${summaryItem.id}` }, "user");
    } catch (e) {
      console.error("Insert text failed:", e);
    }

    // Helper: try to find the inserted anchor and set attributes; retry if needed
    const tryAttachDataAttr = (attempt = 0) => {
      try {
        const [leaf] = editor.getLeaf(range.index);
        const domNode = leaf?.domNode;
        const anchor = domNode?.parentElement && domNode.parentElement.tagName === "A"
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

      // retry a few times because Quill may attach the anchor slightly later
      if (attempt < 4) {
        setTimeout(() => tryAttachDataAttr(attempt + 1), 30 * (attempt + 1)); // 30ms, 60ms, 90ms...
        return false;
      }

      // final fallback: replace the inserted text with a raw anchor HTML
      try {
        const safeText = selectedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // remove the inserted plain text
        editor.deleteText(range.index, selectedText.length);
        // paste the anchor HTML with data-summary-id explicitly
        editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="#summary-${summaryItem.id}">${safeText}</a>`);
        return true;
      } catch (err) {
        console.warn("Fallback paste failed:", err);
        return false;
      }
    };

    tryAttachDataAttr(0);

    // move cursor after inserted content (best-effort)
    try { editor.setSelection(range.index + selectedText.length, 0); } catch (e) { /* ignore */ }

    // cleanup modal state
    setShowInternalLinkModal(false);
    setLinkSearch("");
    setLinkResults([]);
    setSelectedRangeForLink(null);
  };

  // ----------------- Auto-link Bold Text -----------------
  // Scans editor for bold nodes and auto-links matches from DB
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

    // gather candidate nodes: <strong>, <b>, and elements with inline font-weight >= 600
    const nodeList = Array.from(root.querySelectorAll("strong, b, *[style*='font-weight']"));
    const candidates = [];

    nodeList.forEach((node) => {
      // skip if already inside an anchor
      if (node.closest && node.closest("a")) return;

      // determine effective weight for style-based nodes
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
        } catch (e) {
          // ignore getComputedStyle errors
        }
      }

      if (!isBold) return;

      const text = (node.textContent || "").trim();
      if (!text) return;
      // skip very short tokens
      if (text.length < 3) return;

      // push candidate with node reference (we'll map later)
      candidates.push({ text, node });
    });

    if (candidates.length === 0) {
      alert("No bold text found to auto-link.");
      return;
    }

    // dedupe candidate texts (case-insensitive)
    const mapByText = new Map();
    candidates.forEach(({ text, node }) => {
      const key = text.trim().toLowerCase();
      if (!mapByText.has(key)) mapByText.set(key, { text: text.trim(), nodes: [node] });
      else mapByText.get(key).nodes.push(node);
    });

    // for each unique text, query DB (sequential to avoid spamming)
    let linkedCount = 0;
    for (const [key, { text, nodes }] of mapByText.entries()) {
      try {
        // simple substring match - case-insensitive
        const { data, error } = await supabase
          .from("book_summaries")
          .select("id, title")
          .ilike("title", `%${text}%`)
          .limit(1)
          .maybeSingle();

        if (error || !data || !data.id) {
          // no match -> skip
          continue;
        }

        // wrap each matching node with anchor (only if not already inside anchor)
        nodes.forEach((node) => {
          try {
            if (node.closest && node.closest("a")) return;
            const anchor = document.createElement("a");
            anchor.setAttribute("data-summary-id", data.id);
            anchor.setAttribute("href", `#summary-${data.id}`); // placeholder; viewer will resolve to final slug
            anchor.className = "internal-summary-link";
            // move node inside anchor
            node.parentNode && node.parentNode.replaceChild(anchor, node);
            anchor.appendChild(node);
            linkedCount += 1;
          } catch (err) {
            // If DOM operation fails for any node, try fallback via HTML paste
            try {
              const safeText = (node.textContent || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
              // find the textual index and replace using Quill clipboard (best-effort)
              // fallback: paste anchor HTML at node position
              const parent = node.parentNode;
              if (parent) {
                parent.replaceChild(document.createTextNode(""), node);
                parent.innerHTML = parent.innerHTML.replace(/$/, `<a data-summary-id="${data.id}" class="internal-summary-link" href="#summary-${data.id}">${safeText}</a>`);
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

    // Let Quill re-evaluate the editor DOM (best-effort)
    try {
      editor.update("user");
    } catch (e) {
      // ignore if update isn't available
    }

    alert(`Auto-linking complete — ${linkedCount} item(s) linked.`);
  };

  // Submit handler (create)
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
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) {
        setErrorMsg("You must be logged in to create a summary.");
        setLoading(false);
        return;
      }

      // prepare slug - client-side attempt, DB triggers will still guard uniqueness if present
      let finalSlug = slug || slugify(title || "", { lower: true, strict: true, replacement: "-" });

      // Check slug collision and append counter if needed (simple client check)
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

      // parse tags
      const parsedTags = (tags || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      // affiliate
      const affiliateValue = affiliateLink && affiliateLink.trim() ? `${affiliateType}|${affiliateLink.trim()}` : null;

      // difficulty
      const allowedDifficulties = ["Beginner", "Intermediate", "Advanced"];
      const difficultyToSave = allowedDifficulties.includes(difficulty) ? difficulty : null;

      // fallback description
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

  // Render modal (keeps same structure as your original)
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

          <label>Summary</label>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <button type="button" className="hf-btn" onClick={autoLinkBoldText}>🔗 Auto-link bold text</button>
            <button type="button" className="hf-btn" onClick={() => { setShowInternalLinkModal(true); }}>
              🔎 Manual link
            </button>
            <div style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>Select text then click Manual link to pick a summary.</div>
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
