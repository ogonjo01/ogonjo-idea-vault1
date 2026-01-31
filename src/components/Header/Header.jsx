// src/components/Header/Header.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import UserProfileModal from "../UserProfile/UserProfile";
import "./Header.css";

/**
 * Header component - compact header + expandable search dropdown with dynamic categories
 *
 * Notes:
 * - clearSearch no longer navigates (only clears input + closes dropdown + focuses input).
 * - clear-search global event listener clears UI only (no navigation).
 * - Dropdown is rendered into document.body (portal) with wide desktop width and near-full on mobile.
 * - Top matches area is scrollable.
 * - Auto-close on scroll-to-bottom has been REMOVED (per your request).
 * - Dropdown closes via: X (top-right), clicking outside, Escape, or when selecting a suggestion.
 */

const Header = ({ session, onAddClick, isHomePage, isHidden }) => {
  const [profile, setProfile] = useState(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState(["all"]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const inputRef = useRef(null); // input anchor
  const portalDropdownRef = useRef(null); // portal dropdown node
  const suggestionsScrollRef = useRef(null); // scrollable suggestions node

  // suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestionsTimerRef = useRef(null);
  const lastQueryRef = useRef("");

  // responsive / mobile
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.matchMedia("(max-width:640px)").matches : false);
  const [showCategoriesMobile, setShowCategoriesMobile] = useState(false);

  // dropdown position (for portal)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 320, maxWidth: 640 });

  /* --------------------------
     Sync q & category from URL
  -------------------------- */
  useEffect(() => {
    const urlq = searchParams.get("q") || "";
    const urlCategory = searchParams.get("category") || "all";
    setQ(String(urlq || ""));
    setCategory(urlCategory || "all");
  }, [searchParams]);

  /* --------------------------
     Load profile
  -------------------------- */
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!session) return setProfile(null);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("username, can_add_summary")
          .eq("id", session.user.id)
          .maybeSingle();
        if (mounted) setProfile(data || { username: null, can_add_summary: false });
      } catch (err) {
        console.warn("fetchProfile error", err);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [session]);

  /* --------------------------
     Load distinct categories (dynamic)
  -------------------------- */
  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("book_summaries")
          .select("category", { distinct: true })
          .not("category", "is", null)
          .order("category", { ascending: true });

        if (error) throw error;
        const unique = Array.from(new Set((data || []).map(d => (d.category || "").toString().trim()).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

        if (mounted) {
          setCategories(["all", ...unique]);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
        if (mounted) setCategories(["all"]);
      }
    };

    fetchCategories();
    return () => { mounted = false; };
  }, []);

  /* --------------------------
     Dropdown position calculations (portal)
  -------------------------- */
  const updateDropdownPosition = useCallback(() => {
    try {
      const inputEl = inputRef.current;
      if (!inputEl) return;
      const rect = inputEl.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollX = window.scrollX || window.pageXOffset || 0;

      const viewportPad = 16; // margin from viewport edges

      // If small screen, make dropdown nearly full-width and centered with padding
      if (window.innerWidth <= 640) {
        const vwWidth = Math.floor(window.innerWidth - viewportPad * 2);
        const left = Math.round(scrollX + viewportPad);
        setDropdownPos({
          top: Math.round(rect.bottom + scrollY),
          left,
          width: vwWidth,
          maxWidth: vwWidth
        });
        return;
      }

      // Desktop: prefer input width but allow expansion to a sensible minimum and clamp to max
      const minWidth = 640; // comfortable minimum width on desktop
      const maxAllowed = Math.min(1100, window.innerWidth - viewportPad * 2);
      const desiredWidth = Math.min(Math.max(rect.width, minWidth), maxAllowed);

      // compute left so dropdown stays within viewport
      let left = rect.left + scrollX;
      if (left + desiredWidth > scrollX + window.innerWidth - viewportPad) {
        left = Math.max(scrollX + viewportPad, (rect.right + scrollX) - desiredWidth);
      }
      left = Math.max(left, scrollX + viewportPad);

      setDropdownPos({
        top: Math.round(rect.bottom + scrollY),
        left: Math.round(left),
        width: Math.round(desiredWidth),
        maxWidth: maxAllowed
      });
    } catch (e) {
      // ignore
    }
  }, []);

  // update position when dropdown opens and on resize/scroll
  useEffect(() => {
    if (!dropdownOpen) return;
    updateDropdownPosition();

    let rafId = null;
    const onChange = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateDropdownPosition();
        rafId = null;
      });
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    window.addEventListener("scroll", onChange, { passive: true });

    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      window.removeEventListener("scroll", onChange, { passive: true });
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [dropdownOpen, updateDropdownPosition]);

  /* --------------------------
     Click outside / Escape closes dropdown (works with portal)
  -------------------------- */
  useEffect(() => {
    const handler = (ev) => {
      if (ev.type === "keydown" && ev.key === "Escape") {
        setDropdownOpen(false);
        setShowCategoriesMobile(false);
        return;
      }

      if (ev.type === "mousedown" || ev.type === "click") {
        const tgt = ev.target;
        const dropdownNode = portalDropdownRef.current;
        const inputNode = inputRef.current;
        if (dropdownOpen) {
          if (dropdownNode && dropdownNode.contains && dropdownNode.contains(tgt)) return;
          if (inputNode && inputNode.contains && inputNode.contains(tgt)) return;
          setDropdownOpen(false);
          setShowCategoriesMobile(false);
        }
      }
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("click", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [dropdownOpen]);

  /* --------------------------
     Clear-search listener for other components
     (NO navigation here — only clears UI)
  -------------------------- */
  useEffect(() => {
    const handler = () => {
      setQ("");
      setCategory("all");
      setDropdownOpen(false);
      setShowCategoriesMobile(false);
      // intentionally DO NOT navigate; just clear UI state
    };
    window.addEventListener("clear-search", handler);
    return () => window.removeEventListener("clear-search", handler);
  }, []);

  /* --------------------------
     Responsive detection (isMobile)
  -------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mm = window.matchMedia("(max-width:640px)");
    const handler = (ev) => {
      setIsMobile(ev.matches);
      if (!ev.matches) setShowCategoriesMobile(false);
    };
    setIsMobile(mm.matches);
    try {
      mm.addEventListener ? mm.addEventListener("change", handler) : mm.addListener(handler);
    } catch (e) {
      mm.addListener(handler);
    }
    return () => {
      try {
        mm.removeEventListener ? mm.removeEventListener("change", handler) : mm.removeListener(handler);
      } catch (e) {
        try { mm.removeListener(handler); } catch (err) {}
      }
    };
  }, []);

  /* --------------------------
     Submit search: build target URL and navigate
  -------------------------- */
  const submitSearch = useCallback((e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const trimmed = String(q || "").trim();
    let target = "/explore";

    if (trimmed && category && category !== "all") {
      target = `/explore?q=${encodeURIComponent(trimmed)}&category=${encodeURIComponent(category)}`;
    } else if (trimmed) {
      target = `/explore?q=${encodeURIComponent(trimmed)}`;
    } else if (category && category !== "all") {
      target = `/explore?category=${encodeURIComponent(category)}`;
    }

    const current = `${location.pathname}${location.search}`;
    if (current === target) navigate(target, { replace: true });
    else navigate(target);

    setDropdownOpen(false);
    setShowCategoriesMobile(false);
  }, [q, category, navigate, location.pathname, location.search]);

  /* --------------------------
     Clear button (input) — now DOES NOT navigate
  -------------------------- */
  const clearSearch = useCallback((e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    setQ("");
    setCategory("all");
    setDropdownOpen(false);
    setShowCategoriesMobile(false);

    // keep the user where they are — DO NOT navigate
    try { window.dispatchEvent(new Event("clear-search")); } catch (err) {}
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const avatarLetter =
    (profile?.username || session?.user?.email || "U")[0]?.toUpperCase() || "U";

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }, []);

  const headerClassName = `og-header ${isHomePage ? "" : "og-header--scrollable"} ${isHidden ? "og-header--hidden" : ""}`;

  /* --------------------------
     Helper: choose category and close (mobile-friendly)
  -------------------------- */
  const pickCategory = (cat) => {
    setCategory(cat || "all");
    if (isMobile) setShowCategoriesMobile(false);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 10);
  };

  /* --------------------------
     Helpers for suggestion fetching (unchanged)
  -------------------------- */
  const tokenize = (s = "") => {
    return (String(s || "").trim().toLowerCase().split(/\s+/).map(t => t.replace(/[^\w-]/g, '')).filter(Boolean));
  };

  const fetchTitleMatches = async (query, limit = 6) => {
    if (!query || !query.trim()) return [];
    try {
      let qb = supabase
        .from("book_summaries")
        .select("id, title, slug, category")
        .ilike("title", `%${query}%`)
        .limit(limit);

      if (category && category !== "all") qb = qb.eq("category", category);

      const { data, error } = await qb;
      if (error) {
        console.warn("fetchTitleMatches error", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn("fetchTitleMatches exception", e);
      return [];
    }
  };

  const fetchKeywordMatches = async (query, limit = 12) => {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];
    try {
      let qb = supabase
        .from("book_summaries")
        .select("id, title, slug, keywords, category")
        .overlaps("keywords", tokens)
        .limit(limit);

      if (category && category !== "all") qb = qb.eq("category", category);

      const { data, error } = await qb;
      if (error) {
        console.warn("fetchKeywordMatches overlaps error, falling back:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn("fetchKeywordMatches exception", e);
      return [];
    }
  };

  const mergeSuggestions = (titleResults = [], keywordResults = []) => {
    const byId = new Map();
    const out = [];
    for (const it of titleResults) {
      if (!it || !it.id) continue;
      byId.set(it.id, true);
      out.push(it);
    }
    for (const it of (keywordResults || [])) {
      if (!it || !it.id) continue;
      if (!byId.has(it.id)) {
        byId.set(it.id, true);
        out.push(it);
      }
    }
    return out;
  };

  /* --------------------------
     Debounced live suggestions effect
  -------------------------- */
  useEffect(() => {
    if (suggestionsTimerRef.current) {
      clearTimeout(suggestionsTimerRef.current);
      suggestionsTimerRef.current = null;
    }

    if (!dropdownOpen) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const trimmed = String(q || "").trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const titleLimit = isMobile ? 5 : 7;
    const keywordLimit = isMobile ? 8 : 12;
    const displayCap = isMobile ? 5 : 7;

    suggestionsTimerRef.current = setTimeout(async () => {
      lastQueryRef.current = trimmed;
      setSuggestionsLoading(true);
      try {
        const [titleRes, keywordRes] = await Promise.allSettled([
          fetchTitleMatches(trimmed, titleLimit),
          fetchKeywordMatches(trimmed, keywordLimit),
        ]);

        const titles = titleRes.status === "fulfilled" ? (titleRes.value || []) : [];
        const keywords = keywordRes.status === "fulfilled" ? (keywordRes.value || []) : [];

        const merged = mergeSuggestions(titles, keywords);

        if (lastQueryRef.current === trimmed) {
          setSuggestions(merged.slice(0, displayCap));
          // reset scroll when new suggestions load
          if (suggestionsScrollRef.current) {
            suggestionsScrollRef.current.scrollTop = 0;
          }
        }
      } catch (err) {
        console.error("Suggestion fetch failed", err);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      if (suggestionsTimerRef.current) {
        clearTimeout(suggestionsTimerRef.current);
        suggestionsTimerRef.current = null;
      }
    };
  }, [q, category, dropdownOpen, isMobile]);

  const goToSummary = (item) => {
    if (!item) return;
    const slug = item.slug || "";
    if (slug) navigate(`/summary/${slug}`);
    else if (item.id) navigate(`/summary/${item.id}`);
    setDropdownOpen(false);
    setShowCategoriesMobile(false);
  };

  /* --------------------------
     (Auto-close-on-scroll-to-bottom REMOVED)
     We no longer auto-close when user scrolls to the end.
     Users can close via X, outside click, Escape, or by selecting an item.
  -------------------------- */

  /* --------------------------
     Portal dropdown content
  -------------------------- */
  const dropdownContent = (
    <div
      ref={portalDropdownRef}
      className="search-dropdown portal-dropdown"
      role="dialog"
      aria-label="Search options"
      style={{
        position: "absolute",
        top: dropdownPos.top + "px",
        left: dropdownPos.left + "px",
        width: dropdownPos.width + "px",
        zIndex: 2147483647,
        background: "#ffffff",
        borderRadius: 8,
        boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
        border: "1px solid rgba(0,0,0,0.06)",
        overflow: "hidden",
        maxWidth: dropdownPos.maxWidth + "px",
      }}
    >
      <div className={`search-dropdown-inner ${isMobile ? "mobile-layout" : ""}`} style={{ padding: 8, position: 'relative' }}>
        {/* Close button (top-right) */}
        <button
          type="button"
          className="search-dropdown-close"
          aria-label="Close search"
          onClick={() => { setDropdownOpen(false); setShowCategoriesMobile(false); }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            fontSize: 16,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '4px 6px'
          }}
        >
          ✕
        </button>

        {/* Category */}
        <div className="search-dropdown-section category-section" style={{ padding: "6px 8px" }}>
          <div className="search-dropdown-title">Category</div>

          <button
            type="button"
            className="category-toggle"
            onClick={() => setShowCategoriesMobile(v => !v)}
            aria-expanded={showCategoriesMobile}
            aria-controls="search-category-list"
            style={{ marginTop: 6, display: "flex", justifyContent: "space-between", width: "100%", padding: "6px 8px", fontSize: 13, background: "transparent", border: "none", cursor: "pointer" }}
          >
            <span>Category: {category === "all" ? "All" : category}</span>
            <span className="chev">{showCategoriesMobile ? "▲" : "▼"}</span>
          </button>

          <div
            id="search-category-list"
            className={`search-category-list ${showCategoriesMobile ? "show" : ""}`}
            role="listbox"
            aria-label="Categories"
            style={{ marginTop: 8, display: showCategoriesMobile || !isMobile ? "flex" : "none", gap: 8, flexWrap: "wrap" }}
          >
            {categories.map((c) => {
              const key = c || "all";
              const label = key === "all" ? "All" : key;
              const active = String(category || "all") === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`search-category-item ${active ? "active" : ""}`}
                  onClick={() => { pickCategory(key); }}
                  aria-pressed={active}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 20,
                    border: active ? "1px solid #0070f3" : "1px solid #e6e6e6",
                    background: active ? "#0070f3" : "#fafafa",
                    color: active ? "#fff" : "#222",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Top matches (SCROLLABLE) */}
        <div className="search-dropdown-section top-matches-section" style={{ borderTop: "1px solid #eee", paddingTop: 8 }}>
          <div className="search-dropdown-title">Top matches</div>
          <div style={{ minHeight: 32, paddingTop: 6 }}>
            {suggestionsLoading && <div style={{ padding: 8, color: "#666" }}>Loading suggestions…</div>}
            {!suggestionsLoading && suggestions.length === 0 && (q.trim().length >= 2) && (
              <div style={{ padding: 8, color: "#666" }}>No matches found.</div>
            )}
            {!suggestionsLoading && suggestions.length === 0 && (q.trim().length < 2) && (
              <div style={{ padding: 8, color: "#666" }}>Type at least 2 characters to see suggestions.</div>
            )}

            {!suggestionsLoading && suggestions.length > 0 && (
              <div
                ref={suggestionsScrollRef}
                className="top-matches-scroll"
                style={{ maxHeight: isMobile ? 180 : 320, overflowY: "auto", paddingRight: 6 }}
              >
                <ul className="top-matches-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {suggestions.map((s) => (
                    <li key={s.id} className="top-match-item" style={{ marginBottom: 6 }}>
                      <button
                        type="button"
                        className="hf-btn"
                        onClick={() => goToSummary(s)}
                        style={{ width: "100%", textAlign: "left", padding: "8px", background: "transparent", border: "none", cursor: "pointer" }}
                      >
                        <div style={{ fontWeight: 600, overflowWrap: "break-word" }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{s.category || "Uncategorized"}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="search-dropdown-section tips-section" style={{ paddingTop: 8, borderTop: "1px solid #eee" }}>
          <div className="search-dropdown-title">Tips</div>
          <div className="search-dropdown-tips" style={{ fontSize: 12, color: "#666", paddingTop: 6 }}>
            <div>• Select a category to narrow results.</div>
            <div>• Leave category as All to search everything.</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className={headerClassName}>
        <div className="og-header-left">
          <button
            className="icon-btn mobile-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <Link to="/" className="og-logo" aria-label="Home">
            <div className="og-logo-mark">O</div>
            <div className="og-logo-text">OGONJO</div>
          </Link>
        </div>

        {/* SEARCH */}
        <form onSubmit={submitSearch} className="og-search" role="search" aria-label="Search business knowledge" style={{ position: "relative" }}>
          <div className="search-input-wrap" style={{ position: "relative" }}>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search business ideas, summaries, tools…"
              aria-label="Search content"
              autoComplete="off"
              className="search-input"
              onFocus={() => { setDropdownOpen(true); updateDropdownPosition(); }}
              onClick={() => { setDropdownOpen(true); updateDropdownPosition(); }}
              style={{ width: "100%" }}
            />
            <button
              type="button"
              className="search-icon-btn"
              aria-label="Open search options"
              onClick={() => { setDropdownOpen(v => !v); if (!dropdownOpen) setShowCategoriesMobile(false); updateDropdownPosition(); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 15.5A5.5 5.5 0 1110 4.5a5.5 5.5 0 010 11z"/>
              </svg>
            </button>
          </div>

          {q && (
            <button type="button" className="search-clear" onClick={clearSearch} aria-label="Clear search">×</button>
          )}
          <button type="submit" className="search-btn" aria-label="Submit search">Search</button>

          {/* Dropdown is rendered into a portal (document.body) */}
          {dropdownOpen && typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
        </form>

        <div className="og-header-right">
          <div className="og-actions-desktop">
            {session ? (
              <>
                <button className="profile-button" onClick={() => setShowProfileModal(true)}>
                  <span className="letter-avatar">{avatarLetter}</span>
                  <span className="profile-name">{profile?.username || "Profile"}</span>
                </button>

                <button className="logout-button" onClick={handleSignOut}>Sign Out</button>

                {profile?.can_add_summary && <button className="create-button" onClick={onAddClick}>+ Add Summary</button>}
              </>
            ) : (
              <Link to="/auth" className="sign-in-link">Sign In</Link>
            )}
            <a href="https://onjo.gumroad.com" target="_blank" rel="noopener noreferrer" className="subscribe-button">Subscribe</a>
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      {menuOpen && (
        <>
          <div className="mobile-menu-left">
            <button className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>

            {session ? (
              <>
                <button onClick={() => { setShowProfileModal(true); setMenuOpen(false); }}>Profile</button>
                <button onClick={() => { handleSignOut(); setMenuOpen(false); }}>Sign Out</button>
                {profile?.can_add_summary && <button onClick={() => { onAddClick(); setMenuOpen(false); }}>+ Add Summary</button>}
              </>
            ) : (
              <Link to="/auth" onClick={() => setMenuOpen(false)}>Sign In</Link>
            )}

            <a href="https://onjo.gumroad.com" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Subscribe</a>
          </div>
          <div className="overlay" onClick={() => setMenuOpen(false)} />
        </>
      )}

      {/* PROFILE MODAL */}
      {showProfileModal && session && (
        <UserProfileModal
          onClose={() => setShowProfileModal(false)}
          onUpdated={(updatedProfile) => setProfile((p) => ({ ...(p || {}), ...updatedProfile }))}
        />
      )}
    </>
  );
};

export default Header;
