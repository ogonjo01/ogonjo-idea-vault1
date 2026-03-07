// src/pages/ExplorePage.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import BookSummaryCard from "../BookSummaryCard/BookSummaryCard";
import "./ExplorePage.css";

/* ─────────────────────────────────────────────────────────────
   CONFIG & HELPERS
───────────────────────────────────────────────────────────── */
const SELECT = `
  id, created_at, title, author, description, category,
  image_url, affiliate_link, tags, slug, avg_rating,
  likes_count:likes(count),
  views_count:views(count),
  comments_count:comments(count)
`;

const ITEMS_PER_PAGE = 16;

const normalizeRow = (r) => {
  const text = r.description || "";
  return {
    ...r,
    title:         r.title || "Untitled",
    author:        r.author || "",
    description:   text,
    excerpt:       text.length > 240 ? text.slice(0, 237).trim() + "…" : text,
    tags:          Array.isArray(r.tags) ? r.tags.map((t) => String(t).toLowerCase()) : [],
    avg_rating:    Number(r.avg_rating || 0),
    likes_count:   r.likes_count?.[0]?.count    || 0,
    views_count:   r.views_count?.[0]?.count    || 0,
    comments_count:r.comments_count?.[0]?.count || 0,
  };
};

const useQuery = () => new URLSearchParams(useLocation().search);

const normalizeText = (s = "") => String(s || "").trim().toLowerCase();

const tokenize = (s = "") =>
  Array.from(new Set(
    String(s || "")
      .toLowerCase()
      .split(/[\s,._\-+]+/)
      .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, "").trim())
      .filter(Boolean)
  ));

// ─────────────────────────────────────────────────────────────
// RELEVANCE SCORER
// Shorter, more exact title matches always rank higher.
//
// Tiers (title match):
//   10000 — title IS the query
//    8000 — title starts with query  (minus title length)
//    6000 — query is a whole word in title  (minus title length)
//    4000 — title contains query anywhere  (minus title length)
//    2000 — all query words in title  (minus title length)
//    0–999 — partial word overlap
//
// Bonuses (never exceed tier gap):
//   +300 author exact | +100 author contains
//   +50  tag exact    | +20  tag contains
//   +20  desc contains
// ─────────────────────────────────────────────────────────────
const relevanceScore = (item, rawQuery) => {
  const query = normalizeText(rawQuery);
  if (!query) return 0;

  const title  = normalizeText(item.title  || "");
  const author = normalizeText(item.author || "");
  const desc   = normalizeText(item.description || "");
  const tags   = Array.isArray(item.tags) ? item.tags.map(normalizeText) : [];

  // ── Title tier ───────────────────────────────────────────
  let titleScore = 0;

  if (title === query) {
    titleScore = 10000;
  } else if (title.startsWith(query)) {
    titleScore = 8000 - Math.min(title.length, 999);
  } else {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordRe  = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
    if (wordRe.test(title)) {
      titleScore = 6000 - Math.min(title.length, 999);
    } else if (title.includes(query)) {
      titleScore = 4000 - Math.min(title.length, 999);
    } else {
      const qWords  = query.split(/\s+/).filter(Boolean);
      const matched = qWords.filter((w) => title.includes(w)).length;
      if (qWords.length > 1 && matched === qWords.length) {
        titleScore = 2000 - Math.min(title.length, 999);
      } else if (matched > 0) {
        titleScore = Math.round((matched / qWords.length) * 800) - Math.min(title.length, 500);
      }
    }
  }

  // Items with zero title relevance are excluded from search results
  if (titleScore <= 0) return 0;

  // ── Bonus ────────────────────────────────────────────────
  let bonus = 0;
  if (author === query)            bonus += 300;
  else if (author.includes(query)) bonus += 100;
  if (tags.some((t) => t === query))           bonus += 50;
  else if (tags.some((t) => t.includes(query))) bonus += 20;
  if (desc.includes(query)) bonus += 20;

  return titleScore + bonus;
};

/* ─────────────────────────────────────────────────────────────
   EXPLORE PAGE
───────────────────────────────────────────────────────── */
const ExplorePage = () => {
  const location = useLocation();
  const query    = useQuery();

  const searchTerm = (query.get("q") || "").trim();
  const category   = query.get("category");
  const sort       = (query.get("sort") || "newest").toLowerCase();

  const rawTagsParam = query.get("tags");
  const rawTagSingle = query.get("tag");

  const tagList = useMemo(() => {
    const source = rawTagsParam?.length
      ? decodeURIComponent(rawTagsParam)
      : (rawTagSingle || "");
    if (!source) return [];
    return source.split(",").map((t) => String(t || "").trim().toLowerCase()).filter(Boolean);
  }, [rawTagsParam, rawTagSingle]);

  const [items,   setItems]   = useState([]);
  const [related, setRelated] = useState([]);
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const sentinelRef  = useRef(null);
  const fetchingRef  = useRef(false);
  // Keep all scored candidates so pagination can slice without re-fetching
  const allScoredRef = useRef([]);

  /* ─────────────────────────────────────────────────────────
     APPLY FILTERS helper
  ───────────────────────────────────────────────────────── */
  const applyFilters = useCallback((qb) => {
    if (category) qb = qb.eq("category", category);
    if (tagList.length === 1)      qb = qb.contains("tags", [tagList[0]]);
    else if (tagList.length > 1)   qb = qb.overlaps("tags", tagList);
    return qb;
  }, [category, tagList]);

  /* ─────────────────────────────────────────────────────────
     MAIN FETCH
  ───────────────────────────────────────────────────────── */
  const fetchItems = useCallback(async (start = 0, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      // ── SEARCH MODE ──────────────────────────────────────
      if (searchTerm) {
        // On first page load, fetch the full pool and score/sort it
        if (start === 0 || allScoredRef.current.length === 0) {
          const pattern = `%${searchTerm}%`;
          const tokens  = tokenize(searchTerm);

          // Fetch title/author/description matches + keyword matches in parallel
          const [titleRes, kwRes] = await Promise.allSettled([
            applyFilters(
              supabase
                .from("book_summaries")
                .select(SELECT)
                .or(`title.ilike.${pattern},author.ilike.${pattern},description.ilike.${pattern}`)
                .order("created_at", { ascending: false })
                .limit(500) // large pool so scoring works properly
            ),
            tokens.length > 0
              ? applyFilters(
                  supabase
                    .from("book_summaries")
                    .select(SELECT + ", keywords")
                    .overlaps("keywords", tokens)
                    .order("created_at", { ascending: false })
                    .limit(200)
                )
              : Promise.resolve({ value: { data: [] } }),
          ]);

          const titleRows  = titleRes.status  === "fulfilled" ? (titleRes.value?.data   || []) : [];
          const kwRows     = kwRes.status     === "fulfilled" ? (kwRes.value?.data      || []) : [];

          // Merge, dedupe by id
          const seen   = new Map();
          const merged = [];
          [...titleRows, ...kwRows].forEach((r) => {
            if (r?.id && !seen.has(r.id)) { seen.set(r.id, true); merged.push(r); }
          });

          // Score every candidate with the relevance scorer
          const scored = merged
            .map((r) => ({ row: r, score: relevanceScore(r, searchTerm) }))
            .filter((x) => x.score > 0)                    // drop zero-relevance rows
            .sort((a, b) => b.score - a.score)              // highest score first
            .map((x) => normalizeRow(x.row));

          allScoredRef.current = scored;
        }

        // Slice the pre-sorted array for pagination
        const all      = allScoredRef.current;
        const page     = all.slice(start, start + ITEMS_PER_PAGE);
        setItems((prev) => (append ? [...prev, ...page] : page));
        setOffset(start + page.length);
        setHasMore(all.length > start + page.length);

      // ── BROWSE MODE (no search term) ────────────────────
      } else {
        allScoredRef.current = []; // clear cached search results
        let qb = applyFilters(supabase.from("book_summaries").select(SELECT));

        if      (sort === "views")  qb = qb.order("views_count",  { ascending: false });
        else if (sort === "likes")  qb = qb.order("likes_count",  { ascending: false });
        else if (sort === "rating") qb = qb.order("avg_rating",   { ascending: false });
        else                        qb = qb.order("created_at",   { ascending: false });

        qb = qb.range(start, start + ITEMS_PER_PAGE - 1);

        const res = await qb;
        if (res.error) throw res.error;
        const normalized = (res.data || []).map(normalizeRow);
        setItems((prev) => (append ? [...prev, ...normalized] : normalized));
        setOffset(start + normalized.length);
        setHasMore((res.data || []).length === ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error("Explore fetch error:", err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [searchTerm, sort, applyFilters]);

  /* ─────────────────────────────────────────────────────────
     RELATED CONTENT
  ───────────────────────────────────────────────────────── */
  const fetchRelated = useCallback(async () => {
    if (!searchTerm) { setRelated([]); return; }

    try {
      const tokens  = tokenize(searchTerm);
      const pattern = `%${searchTerm}%`;

      const [titleRes, kwRes] = await Promise.allSettled([
        applyFilters(
          supabase
            .from("book_summaries")
            .select(SELECT + ", keywords")
            .ilike("title", pattern)
            .order("created_at", { ascending: false })
            .limit(20)
        ),
        tokens.length > 0
          ? applyFilters(
              supabase
                .from("book_summaries")
                .select(SELECT + ", keywords")
                .overlaps("keywords", tokens)
                .order("created_at", { ascending: false })
                .limit(60)
            )
          : Promise.resolve({ value: { data: [] } }),
      ]);

      const titleMatches   = titleRes.status === "fulfilled" ? (titleRes.value?.data || []) : [];
      const keywordMatches = kwRes.status    === "fulfilled" ? (kwRes.value?.data    || []) : [];

      // Get IDs already shown in main results so related doesn't repeat them
      const shownIds = new Set((allScoredRef.current || []).slice(0, ITEMS_PER_PAGE).map((r) => r.id));

      const seen     = new Map();
      const combined = [];

      [...titleMatches, ...keywordMatches].forEach((r) => {
        if (!r?.id || seen.has(r.id) || shownIds.has(r.id)) return;
        seen.set(r.id, true);
        combined.push({ row: r, score: relevanceScore(r, searchTerm) });
      });

      combined.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime();
      });

      setRelated(combined.slice(0, 8).map((x) => normalizeRow(x.row)));
    } catch (err) {
      console.error("fetchRelated error", err);
      setRelated([]);
    }
  }, [searchTerm, applyFilters]);

  /* ─────────────────────────────────────────────────────────
     EFFECTS
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    allScoredRef.current = [];
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchItems(0, false);
    fetchRelated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([e]) => e.isIntersecting && fetchItems(offset, true),
      { rootMargin: "600px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loading, fetchItems]);

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  const showEmptySearch = searchTerm && !loading && items.length === 0;

  return (
    <div className="explore-page">
      <h2>
        {searchTerm
          ? `Results for "${searchTerm}"`
          : tagList.length > 0
          ? `Tag: ${tagList.join(", ")}`
          : category || "Explore"}
      </h2>

      {items.length > 0 && (
        <div className="explore-grid">
          {items.map((item) => (
            <BookSummaryCard key={item.id} summary={item} />
          ))}
        </div>
      )}

      {showEmptySearch && (
        <div className="explore-empty">
          <h3>No results found for "{searchTerm}"</h3>
          <p>We couldn't find any content matching your search. Try a different keyword or explore related content below.</p>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}
      {loading  && <div className="explore-loading">Loading…</div>}

      {searchTerm && related.length > 0 && (
        <>
          <h3 className="explore-related-title">Related content</h3>
          <div className="explore-grid explore-related">
            {related.map((item) => (
              <BookSummaryCard key={`rel-${item.id}`} summary={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExplorePage;