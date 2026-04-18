// src/utils/injectAds.js

/**
 * injectAds
 * ─────────────────────────────────────────────────────────────────────────────
 * Splits processed article HTML into paragraph segments and returns an array
 * of { type: 'html' | 'ad', content, adIndex } items ready to render.
 *
 * Ad placement strategy (based on word count):
 *  < 600 words  → 2 ads  — after ¶2, after ¶5 (or last ¶ if shorter)
 *  600–1199     → 3 ads  — after ¶2, mid, near end
 *  1200–1999    → 4 ads  — after ¶2, ¶5, mid, near end
 *  2000+        → 5 ads  — evenly spread, first after ¶2, last before final ¶
 *
 * Rules:
 *  • Never place an ad before paragraph 2
 *  • Never place an ad as the very last segment (article ends with content)
 *  • Minimum 2 paragraphs gap between ads
 * ─────────────────────────────────────────────────────────────────────────────
 */

const stripHtmlForWordCount = (html = '') =>
  String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const countWords = (text = '') =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .length;

const chooseAdCount = (wordCount) => {
  if (wordCount < 800)  return 1; // short article — one slot only
  if (wordCount < 1200) return 2; // medium — beginning and end
  if (wordCount < 2000) return 3;
  return 4;
};

/**
 * Given N paragraphs and a desired ad count, compute the paragraph indices
 * AFTER which an ad should be inserted.
 * Indices are 0-based into the `paragraphs` array.
 * Returns an array of paragraph indices (sorted ascending).
 */
const computeAdPositions = (paragraphCount, adCount) => {
  if (paragraphCount < 3) return []; // too short to insert anything

  // Hard constraints
 const MIN_AFTER_PARA = 2;          // never in the first 3 paragraphs
const MAX_AFTER_PARA = paragraphCount - 3; // never in the last 3 paragraphs// never after the last paragraph

  const range = MAX_AFTER_PARA - MIN_AFTER_PARA;
  if (range <= 0) return [];

  const clampedCount = Math.min(adCount, Math.floor(range / 2) + 1);
  const positions = new Set();

  if (clampedCount === 1) {
    positions.add(Math.round(MIN_AFTER_PARA + range / 2));
  } else {
    const step = range / (clampedCount - 1);
    for (let i = 0; i < clampedCount; i++) {
      positions.add(Math.round(MIN_AFTER_PARA + i * step));
    }
  }

  // Enforce minimum 2-paragraph gap
  const sorted = Array.from(positions).sort((a, b) => a - b);
  const filtered = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - filtered[filtered.length - 1] >= 2) {
      filtered.push(sorted[i]);
    }
  }

  return filtered;
};

/**
 * Main export.
 * @param {string} html — the fully processed article HTML
 * @returns {Array<{ type: 'html'|'ad', content?: string, adIndex?: number }>}
 */
export const injectAds = (html) => {
  if (!html) return [{ type: 'html', content: '' }];

  // Split on closing </p> tags, keeping delimiter
  const rawChunks = html.split(/(?<=<\/p>)/gi).filter(s => s.trim());

  // If for some reason there are no </p> tags, treat the whole thing as one block
  if (rawChunks.length <= 1) return [{ type: 'html', content: html }];

  const paragraphs = rawChunks;
  const fullText = stripHtmlForWordCount(html);
  const wordCount = countWords(fullText);
  const adCount = chooseAdCount(wordCount);
  const adPositions = new Set(computeAdPositions(paragraphs.length, adCount));

  const segments = [];
  paragraphs.forEach((para, idx) => {
    segments.push({ type: 'html', content: para });
    if (adPositions.has(idx)) {
      segments.push({ type: 'ad', adIndex: segments.filter(s => s.type === 'ad').length + 1 });
    }
  });

  return segments;
};

export default injectAds;