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
    // generate a reasonably-clean slug
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

  // Insert internal link (preserve selection, handle fallback)
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

    // Ensure editor focused
    editor.focus();
    editor.setSelection(range.index, range.length);

    // Determine text to link
    let selectedText = "";
    if (range.length && editor.getText(range.index, range.length)) {
      selectedText = editor.getText(range.index, range.length).trim();
    }
    if (!selectedText) selectedText = summaryItem.title || "link";

    // Delete current selection and insert text with a placeholder href
    editor.deleteText(range.index, range.length);
    editor.insertText(range.index, selectedText, { link: `#summary-${summaryItem.id}` }, "user");

    // Try to set data-summary-id attribute on the inserted anchor
    try {
      const [leaf] = editor.getLeaf(range.index);
      const domNode = leaf?.domNode;
      const anchor = domNode?.parentElement && domNode.parentElement.tagName === "A" ? domNode.parentElement : null;
      if (anchor) {
        anchor.setAttribute("data-summary-id", summaryItem.id);
        anchor.classList.add("internal-summary-link");
        anchor.setAttribute("href", `#summary-${summaryItem.id}`); // placeholder; viewer will resolve to final slug
      } else {
        // Fallback: replace the inserted text with anchor HTML
        const safeText = selectedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        editor.deleteText(range.index, selectedText.length);
        editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="#summary-${summaryItem.id}">${safeText}</a>`);
      }
    } catch (err) {
      console.warn("Could not set anchor attributes via DOM; using HTML paste fallback", err);
      const safeText = selectedText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      editor.deleteText(range.index, selectedText.length);
      editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="#summary-${summaryItem.id}">${safeText}</a>`);
    }

    // move cursor after inserted content
    editor.setSelection(range.index + selectedText.length, 0);

    // cleanup modal state
    setShowInternalLinkModal(false);
    setLinkSearch("");
    setLinkResults([]);
    setSelectedRangeForLink(null);
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
      const { data: { user } = {} } = await supabase.auth.getUser();
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
            // safety: prevent an infinite loop in unlikely DB failure scenarios
            if (counter > 1000) {
              finalSlug = `${slug || finalSlug}-${Date.now()}`;
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Slug collision check error:", err);
        // continue — database/triggers can handle final uniqueness
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
        // success
        if (typeof onNewSummary === "function") onNewSummary();
        if (typeof onClose === "function") onClose();
      }
    } catch (err) {
      console.error("Unexpected submit error:", err);
      setErrorMsg("Unexpected error. See console.");
      setLoading(false);
    }
  };

  // Render modal (use portal in your app if you prefer; kept simple here)
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

          <button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit Summary"}</button>
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
