// src/pages/ExplorePage.jsx
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import BookSummaryCard from "../BookSummaryCard/BookSummaryCard";
import HorizontalCarousel from "../HorizontalCarousel/HorizontalCarousel";
import { ONBOARDING_KEY } from "../FeedOnboarding/FeedOnboarding";
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
const CAROUSEL_BATCH_SIZE = 8; // cards per carousel on mobile

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

// ── Relevance scorer ──
const relevanceScore = (item, rawQuery) => {
  const query = normalizeText(rawQuery);
  if (!query) return 0;

  const title  = normalizeText(item.title  || "");
  const author = normalizeText(item.author || "");
  const desc   = normalizeText(item.description || "");
  const tags   = Array.isArray(item.tags) ? item.tags.map(normalizeText) : [];

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

  if (titleScore <= 0) return 0;

  let bonus = 0;
  if (author === query)            bonus += 300;
  else if (author.includes(query)) bonus += 100;
  if (tags.some((t) => t === query))           bonus += 50;
  else if (tags.some((t) => t.includes(query))) bonus += 20;
  if (desc.includes(query)) bonus += 20;

  return titleScore + bonus;
};

// ── Personalisation helpers ──
const filterOutOldBriefs = (items) => {
  const now = Date.now();
  const maxAgeMs = 48 * 60 * 60 * 1000;
  return items.filter(item => {
    if (!item.category || item.category !== "Ogonjo Briefs") return true;
    if (!item.created_at) return false;
    const age = now - new Date(item.created_at).getTime();
    return age <= maxAgeMs;
  });
};

const parseNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  if (Array.isArray(v) && v.length) {
    const first = v[0];
    return parseNumber(first.avg ?? first.count ?? first.value ?? first.avg_rating ?? first.rating ?? first);
  }
  if (typeof v === "object") {
    return parseNumber(v.avg ?? v.count ?? v.value ?? v.avg_rating ?? v.rating ?? v.rating_count);
  }
  return 0;
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// ── Back to Feed button ──
const BackToFeedButton = () => (
  <div className="explore-end-cta">
    <p className="explore-end-text">You've seen everything here.</p>
    <a href="/" className="explore-back-btn">Back to Feed</a>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   PERSONALISED FEED (re‑used algorithm)
───────────────────────────────────────────────────────────── */
const PersonalisedExploreFeed = ({ userId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const allScoredRef = useRef([]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    // 1. Load weights
    let weights = {};
    if (userId) {
      const { data: profile } = await supabase
        .from("user_topic_profiles")
        .select("topic_weights")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.topic_weights) weights = profile.topic_weights;
    }
    if (!Object.keys(weights).length) {
      try {
        const stored = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || "{}");
        if (stored.weights) weights = stored.weights;
      } catch {}
    }
    if (!Object.keys(weights).length) {
      weights = {
        "entrepreneurship": 0.5, "business strategy & systems": 0.5,
        "career development": 0.4, "finance & funding": 0.4,
        "marketing & sales": 0.4, "leadership & management": 0.4,
        "digital skills & technology": 0.3, "mindset & motivation": 0.3,
        "business ideas": 0.3, "self-improvement": 0.3,
      };
    }

    const tagWeights = {}, kwWeights = {}, catWeights = {};
    let recentlySeen = new Set();
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    if (userId) {
      try {
        const { data: events } = await supabase
          .from("behavior_events")
          .select("article_id, event_type, value, created_at")
          .eq("user_id", userId)
          .gte("created_at", new Date(now - 90 * DAY).toISOString())
          .limit(5000);

        if (events) {
          const recentEvents = events.filter(e => new Date(e.created_at).getTime() > now - 2 * DAY);
          recentEvents.forEach(e => recentlySeen.add(e.article_id));

          const articleIds = [...new Set(events.map(e => e.article_id))];
          if (articleIds.length) {
            const chunks = [];
            for (let i = 0; i < articleIds.length; i += 100) chunks.push(articleIds.slice(i, i + 100));
            const metadataList = await Promise.all(
              chunks.map(ids =>
                supabase.from("book_summaries").select("id, tags, keywords, category").in("id", ids)
                  .then(({ data }) => data || [])
              )
            );
            const metadataMap = {};
            metadataList.flat().forEach(a => { metadataMap[a.id] = a; });

            events.forEach(e => {
              const meta = metadataMap[e.article_id];
              if (!meta) return;
              const ageDays = Math.max(0, (now - new Date(e.created_at).getTime()) / DAY);
              const decay = Math.pow(0.95, ageDays);
              let weight = 0;
              switch (e.event_type) {
                case "completed": weight = 15; break;
                case "saved":      weight = 12; break;
                case "time_spent": weight = Math.min(10, (e.value || 0) / 30); break;
                case "scroll_depth": weight = Math.min(8, (e.value || 0) / 12.5); break;
                default: weight = 1;
              }
              const effective = weight * decay;
              (meta.tags || []).forEach(tag => {
                const key = tag.toLowerCase().trim();
                tagWeights[key] = (tagWeights[key] || 0) + effective;
              });
              (meta.keywords || []).forEach(kw => {
                const key = kw.toLowerCase().trim();
                kwWeights[key] = (kwWeights[key] || 0) + effective;
              });
              const cat = (meta.category || "").toLowerCase().trim();
              if (cat) catWeights[cat] = (catWeights[cat] || 0) + effective;
            });
          }
        }
      } catch (e) { console.debug("Behavior vector build failed", e); }
    }

    const mergedWeights = { ...weights };
    for (const [k, v] of Object.entries(tagWeights)) mergedWeights[k] = (mergedWeights[k] || 0) + v * 0.5;
    for (const [k, v] of Object.entries(kwWeights)) mergedWeights[k] = (mergedWeights[k] || 0) + v * 0.4;
    for (const [k, v] of Object.entries(catWeights)) mergedWeights[k] = (mergedWeights[k] || 0) + v * 0.6;

    // Collaborative filtering
    let similarUserIds = [];
    if (userId) {
      try {
        const { data: allProfiles } = await supabase
          .from("user_topic_profiles")
          .select("user_id, topic_weights")
          .neq("user_id", userId)
          .limit(200);
        if (allProfiles && allProfiles.length) {
          const currentVec = Object.values(weights);
          const currentNorm = Math.sqrt(currentVec.reduce((s, v) => s + v * v, 0)) || 1;
          const scored = allProfiles.map(p => {
            const otherWeights = p.topic_weights || {};
            let dot = 0;
            for (const [k, v] of Object.entries(otherWeights)) dot += (weights[k] || 0) * v;
            const otherVec = Object.values(otherWeights);
            const otherNorm = Math.sqrt(otherVec.reduce((s, v) => s + v * v, 0)) || 1;
            return { userId: p.user_id, similarity: dot / (currentNorm * otherNorm) };
          }).sort((a, b) => b.similarity - a.similarity);
          similarUserIds = scored.slice(0, 20).map(x => x.userId);
        }
      } catch {}
    }

    let collaborativeBoostMap = {};
    if (similarUserIds.length) {
      try {
        const { data: collabEvents } = await supabase
          .from("behavior_events")
          .select("article_id")
          .in("user_id", similarUserIds)
          .in("event_type", ["time_spent", "completed", "saved"])
          .gte("created_at", new Date(now - 60 * DAY).toISOString())
          .limit(5000);
        if (collabEvents) {
          const counts = {};
          collabEvents.forEach(e => { counts[e.article_id] = (counts[e.article_id] || 0) + 1; });
          const max = Math.max(...Object.values(counts), 1);
          for (const [id, cnt] of Object.entries(counts)) collaborativeBoostMap[id] = Math.min(0.4, (cnt / max) * 0.4);
        }
      } catch {}
    }

    const { data: articles } = await supabase
      .from("book_summaries")
      .select(`
        id, created_at, title, author, description, category, tags, keywords,
        image_url, avg_rating, slug,
        likes_count:likes!likes_post_id_fkey(count),
        views_count:views!views_post_id_fkey(count),
        comments_count:comments!comments_post_id_fkey(count)
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1000);

    let normalized = (articles || []).map(a => ({
      ...a,
      likes_count:    parseNumber(a.likes_count),
      views_count:    parseNumber(a.views_count),
      comments_count: parseNumber(a.comments_count),
      avg_rating:     parseNumber(a.avg_rating),
    }));

    normalized = filterOutOldBriefs(normalized);

    const CLUTTER_CATEGORIES = new Set(["business concepts", "concepts", "concepts abbreviations"]);
    normalized = normalized.filter(a => {
      const catKey = (a.category || "").toLowerCase().trim();
      if (CLUTTER_CATEGORIES.has(catKey)) return (mergedWeights[catKey] || 0) > 0;
      return true;
    });

    const scored = normalized.map(a => {
      let score = 0;
      (a.tags || []).forEach(tag => {
        const key = tag.toLowerCase().trim();
        if (mergedWeights[key]) score += mergedWeights[key];
      });
      (a.keywords || []).forEach(kw => {
        const key = kw.toLowerCase().trim();
        if (mergedWeights[key]) score += mergedWeights[key] * 0.8;
      });
      const catKey = (a.category || "").toLowerCase().trim();
      if (catKey && mergedWeights[catKey]) score += mergedWeights[catKey];
      score += collaborativeBoostMap[a.id] || 0;
      if (recentlySeen.has(a.id)) score -= 3;
      const daysOld = Math.max(0, (now - new Date(a.created_at).getTime()) / DAY);
      score += Math.max(0, (30 - daysOld) * 0.02);
      return { ...a, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    const total = scored.length;
    const topMatch = scored.slice(0, Math.floor(total * 0.5));
    const related = scored.slice(Math.floor(total * 0.5), Math.floor(total * 0.75));
    const fresh = [...scored].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, Math.floor(total * 0.2));
    const randomPool = scored.slice(Math.floor(total * 0.8));

    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const blended = [
      ...shuffle(topMatch).slice(0, 7),
      ...shuffle(related).slice(0, 3),
      ...shuffle(fresh).slice(0, 2),
      ...shuffle(randomPool).slice(0, Math.ceil(total * 0.05)),
    ];
    const finalFeed = shuffle(blended).slice(0, 100);

    allScoredRef.current = finalFeed;
    setItems(finalFeed.slice(0, ITEMS_PER_PAGE));
    setOffset(ITEMS_PER_PAGE);
    setHasMore(finalFeed.length > ITEMS_PER_PAGE);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          const next = allScoredRef.current.slice(offset, offset + ITEMS_PER_PAGE);
          if (next.length) {
            setItems(prev => [...prev, ...next]);
            setOffset(offset + next.length);
            setHasMore(allScoredRef.current.length > offset + next.length);
          } else {
            setHasMore(false);
          }
        }
      },
      { rootMargin: "600px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loading]);

  if (loading) return <div className="explore-loading">Loading personalised feed…</div>;

  const batches = chunkArray(items, CAROUSEL_BATCH_SIZE);

  return (
    <>
      {items.length === 0 ? (
        <div className="explore-empty">
          <h3>No personalised content found</h3>
          <p>Read a few articles to train the algorithm.</p>
        </div>
      ) : (
        <>
          {/* Desktop grid */}
          <div className="explore-grid">
            {items.map(item => <BookSummaryCard key={item.id} summary={item} />)}
          </div>

          {/* Mobile carousels */}
          <div className="explore-mobile-carousels">
            {batches.map((batch, idx) => (
              <HorizontalCarousel
                key={idx}
                title={idx === 0 ? "✨ For You" : ""}
                items={batch}
                loading={false}
                skeletonCount={4}
              >
                {batch.map(item => <BookSummaryCard key={item.id} summary={item} titleOverlay={true} />)}
              </HorizontalCarousel>
            ))}
          </div>
        </>
      )}
      {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}
      {!hasMore && items.length > 0 && <BackToFeedButton />}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN EXPLORE PAGE
───────────────────────────────────────────────────────────── */
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

  const [currentUserId, setCurrentUserId] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  const showPersonalised = !searchTerm && !category && tagList.length === 0;

  // ── Filtered (search/browse) mode ──
  const [items,   setItems]   = useState([]);
  const [related, setRelated] = useState([]);
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef  = useRef(null);
  const fetchingRef  = useRef(false);
  const allScoredRef = useRef([]);

  const applyFilters = useCallback((qb) => {
    if (category) qb = qb.eq("category", category);
    if (tagList.length === 1)      qb = qb.contains("tags", [tagList[0]]);
    else if (tagList.length > 1)   qb = qb.overlaps("tags", tagList);
    return qb;
  }, [category, tagList]);

  const fetchItems = useCallback(async (start = 0, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      if (searchTerm) {
        if (start === 0 || allScoredRef.current.length === 0) {
          const pattern = `%${searchTerm}%`;
          const tokens  = tokenize(searchTerm);

          const [titleRes, kwRes] = await Promise.allSettled([
            applyFilters(
              supabase
                .from("book_summaries")
                .select(SELECT)
                .or(`title.ilike.${pattern},author.ilike.${pattern},description.ilike.${pattern}`)
                .order("created_at", { ascending: false })
                .limit(500)
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

          const seen   = new Map();
          const merged = [];
          [...titleRows, ...kwRows].forEach((r) => {
            if (r?.id && !seen.has(r.id)) { seen.set(r.id, true); merged.push(r); }
          });

          const scored = merged
            .map((r) => ({ row: r, score: relevanceScore(r, searchTerm) }))
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((x) => normalizeRow(x.row));

          allScoredRef.current = scored;
        }

        const all      = allScoredRef.current;
        const page     = all.slice(start, start + ITEMS_PER_PAGE);
        setItems((prev) => (append ? [...prev, ...page] : page));
        setOffset(start + page.length);
        setHasMore(all.length > start + page.length);
      } else {
        allScoredRef.current = [];
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

  // ── Related fetch with explicit exclusion ──
  const fetchRelated = useCallback(async (excludeIds = []) => {
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

      const excludeSet = new Set(excludeIds);
      const seen = new Map();
      const combined = [];

      [...titleMatches, ...keywordMatches].forEach((r) => {
        if (!r?.id || seen.has(r.id) || excludeSet.has(r.id)) return;
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

  // ── Effects ──
  useEffect(() => {
    if (showPersonalised) return;
    allScoredRef.current = [];
    setItems([]);
    setOffset(0);
    setHasMore(true);
    // First fetch items, then fetch related with the IDs
    fetchItems(0, false).then(() => {
      // After items are loaded, pass their IDs to related
      const currentIds = items.map(item => item.id);
      fetchRelated(currentIds);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // When items change, update related exclusion list (if search term exists)
  useEffect(() => {
    if (showPersonalised || !searchTerm) return;
    const currentIds = items.map(item => item.id);
    fetchRelated(currentIds);
  }, [items, searchTerm, fetchRelated, showPersonalised]);

  // Infinite scroll
  useEffect(() => {
    if (showPersonalised || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([e]) => e.isIntersecting && fetchItems(offset, true),
      { rootMargin: "600px" }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loading, fetchItems, showPersonalised]);

  // ── Render helpers ──
  const renderTitle = () => {
    if (searchTerm) return `Results for "${searchTerm}"`;
    if (tagList.length > 0) return `Tag: ${tagList.join(", ")}`;
    if (category) return category;
    return "Explore";
  };

  // ── Render carousels for mobile ──
  const renderMobileCarousels = (itemsArray, title = "") => {
    const batches = chunkArray(itemsArray, CAROUSEL_BATCH_SIZE);
    return (
      <div className="explore-mobile-carousels">
        {batches.map((batch, idx) => (
          <HorizontalCarousel
            key={idx}
            title={idx === 0 ? title : ""}
            items={batch}
            loading={false}
            skeletonCount={4}
          >
            {batch.map(item => <BookSummaryCard key={item.id} summary={item} titleOverlay={true} />)}
          </HorizontalCarousel>
        ))}
      </div>
    );
  };

  if (showPersonalised) {
    if (!authChecked) return <div className="explore-loading">Loading…</div>;
    return (
      <div className="explore-page">
        <h2>Explore</h2>
        <p className="explore-subtitle">Personalised recommendations based on your interests</p>
        <PersonalisedExploreFeed userId={currentUserId} />
      </div>
    );
  }

  return (
    <div className="explore-page">
      <h2>{renderTitle()}</h2>

      {items.length > 0 && (
        <>
          {/* Desktop grid */}
          <div className="explore-grid">
            {items.map((item) => (
              <BookSummaryCard key={item.id} summary={item} />
            ))}
          </div>

          {/* Mobile carousels */}
          {renderMobileCarousels(items)}
        </>
      )}

      {!searchTerm && !loading && items.length === 0 && (
        <div className="explore-empty">
          <h3>No content found</h3>
          <p>Try adjusting your filters or explore different categories.</p>
        </div>
      )}

      {searchTerm && !loading && items.length === 0 && (
        <div className="explore-empty">
          <h3>No results found for "{searchTerm}"</h3>
          <p>We couldn't find any content matching your search. Try a different keyword or explore related content below.</p>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}
      {loading && <div className="explore-loading">Loading…</div>}
      {!hasMore && !loading && items.length > 0 && <BackToFeedButton />}

      {searchTerm && related.length > 0 && (
        <>
          <h3 className="explore-related-title">Related content</h3>
          {/* Desktop grid for related */}
          <div className="explore-grid explore-related">
            {related.map((item) => (
              <BookSummaryCard key={`rel-${item.id}`} summary={item} />
            ))}
          </div>
          {/* Mobile carousels for related */}
          {renderMobileCarousels(related, "Related")}
        </>
      )}
    </div>
  );
};

export default ExplorePage;