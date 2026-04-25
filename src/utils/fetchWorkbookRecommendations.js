// src/utils/fetchWorkbookRecommendations.js
// ─────────────────────────────────────────────────────────────────────────────
// Fetches workbooks from book_summaries (category = 'workbooks') that are
// relevant to the currently viewed article.
//
// Relevance is scored by:
//   1. Tag overlap with article tags
//   2. Keyword overlap with article keywords
//   3. Title word overlap with article title
//
// Returns an array sorted by relevance score, deduplicated, excluding the
// current article's own ID. Each item includes parsed affiliate link info.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../supabase/supabaseClient';

/**
 * Parse the affiliate_link field into { url, label, type }.
 * Handles three formats:
 *   "pdf|https://..."   → { type: 'pdf',  label: 'Get PDF',  url }
 *   "book|https://..."  → { type: 'book', label: 'Get Book', url }
 *   "app|https://..."   → { type: 'app',  label: 'Open App', url }
 *   "https://..."       → { type: 'book', label: 'Get Book', url }  ← plain URL fallback
 */
export const parseAffiliateLink = (raw) => {
  if (!raw) return null;
  try {
    if (typeof raw === 'object' && raw !== null) {
      const url = String(raw.url || raw.link || '').trim();
      if (!url) return null;
      const type = (raw.type || 'book').toLowerCase();
      const label = type === 'pdf' ? 'Get PDF' : type === 'app' ? 'Open App' : 'Get Book';
      return { url, type, label };
    }
    if (typeof raw === 'string') {
      const parts = raw.split('|', 2).map(p => p.trim());
      if (parts.length === 2 && parts[1]) {
        const type = parts[0].toLowerCase();
        const label = type === 'pdf' ? 'Get PDF' : type === 'app' ? 'Open App' : 'Get Book';
        return { url: parts[1], type, label };
      }
      // Plain URL
      if (raw.trim()) return { url: raw.trim(), type: 'book', label: 'Get Book' };
    }
  } catch (e) {}
  return null;
};

/**
 * Tokenise a string into lowercase words for overlap scoring.
 */
const tokenise = (str = '') =>
  String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2); // ignore tiny words like "a", "of", "in"

/**
 * Count how many tokens from `setA` appear in `setB`.
 */
const overlapCount = (setA = [], setB = []) => {
  const b = new Set(setB);
  return setA.filter(t => b.has(t)).length;
};

/**
 * Score a workbook's relevance to the current article.
 * Higher = more relevant.
 */
const scoreWorkbook = (workbook, { articleTags, articleKeywords, articleTitleTokens }) => {
  let score = 0;

  // Tag overlap (highest weight — tags are curated)
  const wbTags = Array.isArray(workbook.tags)
    ? workbook.tags.map(t => (t || '').toLowerCase().trim())
    : [];
  score += overlapCount(wbTags, articleTags) * 10;

  // Keyword overlap (medium weight)
  const wbKeywords = Array.isArray(workbook.keywords)
    ? workbook.keywords.map(k => (k || '').toLowerCase().trim())
    : [];
  score += overlapCount(wbKeywords, articleKeywords) * 6;
  score += overlapCount(wbKeywords, articleTags) * 4;

// Title word overlap — meaningful words only (4+ chars)
const wbTitleTokens = tokenise(workbook.title).filter(w => w.length >= 4);
const meaningfulArticleTokens = articleTitleTokens.filter(w => w.length >= 4);
const titleOverlap = overlapCount(wbTitleTokens, meaningfulArticleTokens);
const titleTagOverlap = overlapCount(wbTitleTokens, articleTags);
score += titleOverlap * 4;      // raised from 2 — title match matters more
score += titleTagOverlap * 5;   // raised from 3

// Bonus: if workbook title contains any article tag word directly
const wbTitleStr = (workbook.title || '').toLowerCase();
const directTagHit = articleTags.some(tag => wbTitleStr.includes(tag));
const directKeywordHit = articleKeywords.some(kw => wbTitleStr.includes(kw));
if (directTagHit) score += 8;
if (directKeywordHit) score += 5;

  // Popularity tiebreaker (tiny boost so high-view workbooks win ties)
  score += Math.log1p(Number(workbook.views_count) || 0) * 0.1;

  return score;
};

/**
 * Main function — call this once on article page load.
 *
 * @param {object} article  — the normalised article object from SummaryView
 *   { id, title, tags, keywords, category }
 * @param {number} limit    — max workbooks to return (default: 8, enough for 5 slots + buffer)
 * @returns {Promise<Array>} — sorted workbook items with parsed affiliate info
 */
export const fetchWorkbookRecommendations = async (article, limit = 8) => {
  if (!article) return [];

  // Build the scoring context from the article
  const articleTags = Array.isArray(article.tags)
    ? article.tags.map(t => (t || '').toLowerCase().trim()).filter(Boolean)
    : [];
  const articleKeywords = Array.isArray(article.keywords)
    ? article.keywords.map(k => (k || '').toLowerCase().trim()).filter(Boolean)
    : [];
  const articleTitleTokens = tokenise(article.title);

  // Merge all article signal tokens for a broader keyword search
  const allSignals = [...new Set([...articleTags, ...articleKeywords, ...articleTitleTokens])];

  try {
    // Fetch all published workbooks in one query.
    // We filter category = 'workbooks' and status = 'published'.
    // We fetch a reasonable cap (200) and score/sort in JS to avoid
    // complex Postgres logic and stay within existing RLS rules.
  // Build a search term from the article title's most meaningful words
const searchTerm = articleTitleTokens.filter(w => w.length >= 4).slice(0, 3).join(' ');

const [mainRes, titleRes] = await Promise.all([
  supabase
    .from('book_summaries')
    .select(`id, title, slug, description, image_url, affiliate_link,
      tags, keywords, category, views_count, likes_count, avg_rating, created_at`)
    .eq('category', 'Workbooks')
    .neq('id', article.id)
    .limit(200),
  searchTerm
    ? supabase
        .from('book_summaries')
        .select(`id, title, slug, description, image_url, affiliate_link,
          tags, keywords, category, views_count, likes_count, avg_rating, created_at`)
        .eq('category', 'Workbooks')
        .neq('id', article.id)
        .ilike('title', `%${searchTerm}%`)
        .limit(50)
    : Promise.resolve({ data: [] })
]);

// Merge both result sets, dedupe by id
const seen = new Map();
[...(mainRes.data || []), ...(titleRes.data || [])].forEach(r => {
  if (r?.id && !seen.has(r.id)) seen.set(r.id, r);
});
const data = Array.from(seen.values());
const error = mainRes.error;

    if (error) throw error;

    const rows = data || [];

   // Score every workbook
const scored = rows.map(wb => ({
  ...wb,
  _score: scoreWorkbook(wb, { articleTags, articleKeywords, articleTitleTokens }),
  affiliateParsed: parseAffiliateLink(wb.affiliate_link),
}));

// Sort: highest score first, then by views as tiebreaker
scored.sort((a, b) => {
  if (b._score !== a._score) return b._score - a._score;
  return (Number(b.views_count) || 0) - (Number(a.views_count) || 0);
});

// Only return workbooks that meet the minimum relevance threshold.
// If nothing is relevant enough, return empty — slots will show Ezoic ad instead.
const MINIMUM_SCORE = 4; // requires at least one strong tag/keyword match
const result = scored.filter(w => w._score >= MINIMUM_SCORE);

return result.slice(0, limit);
  } catch (err) {
    console.error('[fetchWorkbookRecommendations] Error:', err);
    return [];
  }
};