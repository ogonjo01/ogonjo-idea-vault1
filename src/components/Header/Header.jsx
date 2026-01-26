// src/components/Header/Header.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import UserProfileModal from "../UserProfile/UserProfile";
import "./Header.css";

/**
 * Header component - compact header + expandable search dropdown with dynamic categories
 *
 * UX:
 * - Search input + small icon displayed inline in header (compact).
 * - On focus/click open an anchored dropdown panel that shows:
 *    • category selector (list) — dynamic: loads distinct categories from DB
 *    • optional quick instructions / recent searches (can extend)
 * - Submit navigates to /explore?q=...&category=... (category only included if not 'all')
 * - Clearing resets q & category and emits "clear-search"
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

  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

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
        // use distinct select to only get unique category values
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
    // refresh categories every X seconds/minutes if you want auto-refresh (optional)
    return () => { mounted = false; };
  }, []);

  /* --------------------------
     Click outside / Escape closes dropdown
     -------------------------- */
  useEffect(() => {
    const onDocDown = (ev) => {
      if (!dropdownRef.current) return;
      if (ev.key === "Escape") {
        setDropdownOpen(false);
        return;
      }
      // close on click outside
      if (ev.type === "mousedown") {
        if (!dropdownRef.current.contains(ev.target) && !inputRef.current.contains(ev.target)) {
          setDropdownOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onDocDown);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onDocDown);
    };
  }, []);

  /* --------------------------
     Clear-search listener for other components
     -------------------------- */
  useEffect(() => {
    const handler = () => {
      setQ("");
      setCategory("all");
      setDropdownOpen(false);
      try { navigate("/explore", { replace: true }); } catch (e) {}
    };
    window.addEventListener("clear-search", handler);
    return () => window.removeEventListener("clear-search", handler);
  }, [navigate]);

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

    // close panel after submit
    setDropdownOpen(false);
  }, [q, category, navigate, location.pathname, location.search]);

  /* --------------------------
     Clear button (input)
     -------------------------- */
  const clearSearch = useCallback((e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setQ("");
    setCategory("all");
    setDropdownOpen(false);
    navigate("/explore", { replace: true });
    try { window.dispatchEvent(new Event("clear-search")); } catch (err) {}
    const el = document.querySelector(".og-search input");
    if (el) el.focus();
  }, [navigate]);

  const avatarLetter =
    (profile?.username || session?.user?.email || "U")[0]?.toUpperCase() || "U";

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }, []);

  const headerClassName = `og-header ${isHomePage ? "" : "og-header--scrollable"} ${isHidden ? "og-header--hidden" : ""}`;

  /* --------------------------
     Helper: choose category and close
     -------------------------- */
  const pickCategory = (cat) => {
    setCategory(cat || "all");
    // keep input focus for quick typing
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 10);
    // do not auto-submit — user may want to type query; but if you prefer auto-submit, call submitSearch()
  };

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

        {/* ---------- SEARCH (compact) ---------- */}
        <form onSubmit={submitSearch} className="og-search" role="search" aria-label="Search business knowledge">
          {/* compact input — clicking/focusing opens dropdown */}
          <div className="search-input-wrap">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search business ideas, summaries, tools…"
              aria-label="Search content"
              autoComplete="off"
              className="search-input"
              onFocus={() => setDropdownOpen(true)}
              onClick={() => setDropdownOpen(true)}
            />
            <button
              type="button"
              className="search-icon-btn"
              aria-label="Open search options"
              onClick={() => setDropdownOpen(v => !v)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 15.5A5.5 5.5 0 1110 4.5a5.5 5.5 0 010 11z"/>
              </svg>
            </button>
          </div>

          {/* clear & submit */}
          {q && (
            <button type="button" className="search-clear" onClick={clearSearch} aria-label="Clear search">×</button>
          )}
          <button type="submit" className="search-btn" aria-label="Submit search">Search</button>

          {/* ---------- DROPDOWN PANEL (anchored) ---------- */}
          {dropdownOpen && (
            <div ref={dropdownRef} className="search-dropdown" role="dialog" aria-label="Search options">
              <div className="search-dropdown-inner">
                <div className="search-dropdown-section">
                  <div className="search-dropdown-title">Category</div>
                  <div className="search-category-list" role="listbox" aria-label="Categories">
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
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="search-dropdown-section">
                  <div className="search-dropdown-title">Tips</div>
                  <div className="search-dropdown-tips">
                    <div>• Select a category to narrow results.</div>
                    <div>• Leave category as All to search everything.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
