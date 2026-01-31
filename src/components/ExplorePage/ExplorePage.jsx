// src/pages/ExplorePage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import BookSummaryCard from "../BookSummaryCard/BookSummaryCard";
import "./ExplorePage.css";

/* ---------------------------------- */
/* Config & helpers                   */
/* ---------------------------------- */

const SELECT = `
  id,
  created_at,
  title,
  author,
  description,
  category,
  image_url,
  affiliate_link,
  tags,
  slug,
  avg_rating,
  likes_count:likes(count),
  views_count:views(count),
  comments_count:comments(count)
`;

const ITEMS_PER_PAGE = 16;

const normalizeRow = (r) => {
  const text = r.description || "";
  return {
    ...r,
    title: r.title || "Untitled",
    author: r.author || "",
    description: text,
    excerpt: text.length > 240 ? text.slice(0, 237).trim() + "…" : text,
    tags: Array.isArray(r.tags) ? r.tags.map((t) => t.toLowerCase()) : [],
    avg_rating: Number(r.avg_rating || 0),
    likes_count: r.likes_count?.[0]?.count || 0,
    views_count: r.views_count?.[0]?.count || 0,
    comments_count: r.comments_count?.[0]?.count || 0,
  };
};

const useQuery = () => new URLSearchParams(useLocation().search);

/* ---------------------------------- */
/* Utility tokenizers                  */
/* ---------------------------------- */
const normalizeText = (s = "") => String(s || "").trim().toLowerCase();
const tokenize = (s = "") =>
  Array.from(
    new Set(
      String(s || "")
        .toLowerCase()
        .split(/[\s,._\-+]+/)
        .map((t) => t.replace(/[^\p{L}\p{N}]+/gu, "").trim())
        .filter(Boolean)
    )
  );

/* ---------------------------------- */
/* Explore Page                       */
/* ---------------------------------- */

const ExplorePage = () => {
  const location = useLocation();
  const query = useQuery();

  const searchTerm = (query.get("q") || "").trim();
  const category = query.get("category");
  const tag = query.get("tag");
  const sort = (query.get("sort") || "newest").toLowerCase();

  const [items, setItems] = useState([]);
  const [related, setRelated] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  /* ---------------------------------- */
  /* Main search / feed fetch (keyword-aware, title-priority)
     Strategy:
     - For requested page (start, size) we fetch a pool from titles and keywords,
       merge with title-first priority, dedupe, then slice(page).
     - To keep pagination stable we request a pool of (start + size) from each source
       and then slice. This keeps behavior deterministic and preserves "titles first".
  /* ---------------------------------- */

  const fetchItems = useCallback(
    async (start = 0, append = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);

      try {
        const pageSize = ITEMS_PER_PAGE;
        const need = start + pageSize; // pool size to retrieve from each source
        let titleCandidates = [];
        let keywordCandidates = [];

        // build base filters function to apply category/tag
        const applyFilters = (qb) => {
          if (category) qb = qb.eq("category", category);
          if (tag) qb = qb.contains("tags", [tag]);
          return qb;
        };

        // 1) If there's a search term, fetch title/desc/author matches (phrase/partial)
        if (searchTerm) {
          const pattern = `%${searchTerm}%`;
          const titleQb = applyFilters(
            supabase
              .from("book_summaries")
              .select(SELECT)
              .or(
                `title.ilike.${pattern},author.ilike.${pattern},description.ilike.${pattern}`
              )
              .order("created_at", { ascending: false })
              .range(0, need - 1)
          );

          const titleRes = await titleQb;
          if (!titleRes.error && Array.isArray(titleRes.data)) {
            titleCandidates = titleRes.data;
          } else {
            titleCandidates = [];
            if (titleRes.error) console.warn("title fetch error", titleRes.error);
          }

          // 2) keyword-based fetch: use overlaps on keywords array
          const tokens = tokenize(searchTerm);
          if (tokens.length > 0) {
            try {
              let kwQb = supabase
                .from("book_summaries")
                .select(SELECT + ", keywords")
                .overlaps("keywords", tokens)
                .order("created_at", { ascending: false })
                .range(0, need - 1);

              if (category) kwQb = kwQb.eq("category", category);
              if (tag) kwQb = kwQb.contains("tags", [tag]);

              const kwRes = await kwQb;
              if (!kwRes.error && Array.isArray(kwRes.data)) {
                // keep keywords for scoring if needed later
                keywordCandidates = kwRes.data;
              } else {
                keywordCandidates = [];
                if (kwRes.error) console.warn("keyword fetch error", kwRes.error);
              }
            } catch (e) {
              console.warn("keyword fetch exception", e);
              keywordCandidates = [];
            }
          } else {
            keywordCandidates = [];
          }

          // Merge with title priority and dedupe by id
          const mergedById = new Map();
          const merged = [];

          (titleCandidates || []).forEach((r) => {
            if (!r || !r.id) return;
            if (!mergedById.has(r.id)) {
              mergedById.set(r.id, true);
              merged.push(r);
            }
          });
          (keywordCandidates || []).forEach((r) => {
            if (!r || !r.id) return;
            if (!mergedById.has(r.id)) {
              mergedById.set(r.id, true);
              merged.push(r);
            }
          });

          // slice for requested page
          const pageSlice = merged.slice(start, start + pageSize).map(normalizeRow);
          setItems((prev) => (append ? [...prev, ...pageSlice] : pageSlice));
          setOffset(start + pageSlice.length);
          setHasMore(merged.length > start + pageSlice.length);
        } else {
          // No search term: regular feed (category/tag filtered)
          let qb = supabase.from("book_summaries").select(SELECT);
          if (category) qb = qb.eq("category", category);
          if (tag) qb = qb.contains("tags", [tag]);

          if (sort === "views") qb = qb.order("views_count", { ascending: false });
          else if (sort === "likes") qb = qb.order("likes_count", { ascending: false });
          else if (sort === "rating") qb = qb.order("avg_rating", { ascending: false });
          else qb = qb.order("created_at", { ascending: false });

          qb = qb.range(start, start + pageSize - 1);

          const res = await qb;
          if (res.error) throw res.error;
          const normalized = (res.data || []).map(normalizeRow);
          setItems((prev) => (append ? [...prev, ...normalized] : normalized));
          setOffset(start + normalized.length);
          setHasMore((res.data || []).length === pageSize);
        }
      } catch (err) {
        console.error("Explore fetch error:", err);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [searchTerm, category, tag, sort]
  );

  /* ---------------------------------- */
  /* Related content (keyword-aware)    */
  /* - If there's a searchTerm, find related by:
  /*   1) title phrase matches (strong)
  /*   2) keyword overlaps (use keywords array)
  /*   3) sort by title-match boost + shared-keyword-count
  /* ---------------------------------- */

  const fetchRelated = useCallback(async () => {
    if (!searchTerm) {
      setRelated([]);
      return;
    }

    try {
      const tokens = tokenize(searchTerm);
      const pattern = `%${searchTerm}%`;

      // 1) title-based strong matches
      const titleQb = supabase
        .from("book_summaries")
        .select(SELECT + ", keywords")
        .ilike("title", pattern)
        .order("created_at", { ascending: false })
        .limit(8);

      if (category) titleQb.eq("category", category);

      const titleRes = await titleQb;
      const titleMatches = titleRes.error ? [] : titleRes.data || [];

      // 2) keyword-based matches (fetch a larger pool to score)
      let keywordMatches = [];
      if (tokens.length > 0) {
        let kwQb = supabase
          .from("book_summaries")
          .select(SELECT + ", keywords")
          .overlaps("keywords", tokens)
          .order("created_at", { ascending: false })
          .limit(40);

        if (category) kwQb = kwQb.eq("category", category);

        const kwRes = await kwQb;
        keywordMatches = kwRes.error ? [] : kwRes.data || [];
      }

      // Combine and score: title match gets boost, shared keyword count increases score
      const combined = [];
      const seen = new Set();

      const scoreCandidate = (r) => {
        let score = 0;
        const titleNorm = normalizeText(r.title || "");
        if (titleNorm.includes(normalizeText(searchTerm))) score += 3; // strong boost
        if (Array.isArray(r.keywords) && r.keywords.length > 0 && tokens.length > 0) {
          const kws = r.keywords.map((k) => normalizeText(k));
          const shared = tokens.filter((t) => kws.includes(t)).length;
          score += shared; // each shared keyword adds 1
        }
        return score;
      };

      // Add title matches first to combined
      (titleMatches || []).forEach((r) => {
        if (!r || !r.id) return;
        if (seen.has(r.id)) return;
        seen.add(r.id);
        combined.push({ row: r, score: scoreCandidate(r) + 1 }); // ensure title matches keep edge
      });

      // Add keyword matches (if not already added)
      (keywordMatches || []).forEach((r) => {
        if (!r || !r.id) return;
        if (seen.has(r.id)) return;
        seen.add(r.id);
        combined.push({ row: r, score: scoreCandidate(r) });
      });

      // Sort by score desc, then recent
      combined.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ta = new Date(a.row.created_at).getTime();
        const tb = new Date(b.row.created_at).getTime();
        return tb - ta;
      });

      const top = combined.slice(0, 8).map((x) => normalizeRow(x.row));
      setRelated(top);
    } catch (err) {
      console.error("fetchRelated error", err);
      setRelated([]);
    }
  }, [searchTerm, category]);

  /* ---------------------------------- */
  /* Effects                            */
  /* ---------------------------------- */

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchItems(0, false);
    fetchRelated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([e]) => e.isIntersecting && fetchItems(offset, true),
      { rootMargin: "600px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loading, fetchItems]);

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */

  const showEmptySearch =
    searchTerm && !loading && items.length === 0;

  return (
    <div className="explore-page">
      <h2>
        {searchTerm
          ? `Results for “${searchTerm}”`
          : category
          ? category
          : "Explore"}
      </h2>

      {/* SEARCH RESULTS */}
      {items.length > 0 && (
        <div className="explore-grid">
          {items.map((item) => (
            <BookSummaryCard key={item.id} summary={item} />
          ))}
        </div>
      )}

      {/* EMPTY SEARCH STATE */}
      {showEmptySearch && (
        <div className="explore-empty">
          <h3>No results found for “{searchTerm}”</h3>
          <p>
            We couldn’t find any content matching your search.
            Try a different keyword or explore related content below.
          </p>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}

      {loading && <div className="explore-loading">Loading…</div>}

      {/* RELATED CONTENT */}
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
