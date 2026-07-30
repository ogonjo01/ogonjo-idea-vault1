/**
 * generate-sitemap.ts
 *
 * Generates public/sitemap.xml for ogonjo.com by pulling:
 *   - every published /library/:slug article from Supabase
 *   - every category as a /?category=... URL
 *   - core static pages
 *
 * Requires:
 *   npm install @supabase/supabase-js dotenv
 *
 * Env vars needed (put these in a .env file, NOT committed to git):
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import 'dotenv/config';

const SITE_URL = 'https://ogonjo.com';
const OUTPUT_PATH = 'public/sitemap.xml';

// ---- CONFIG: matches the public.book_summaries schema ----
const ARTICLES_TABLE = 'book_summaries';
const SLUG_COLUMN = 'slug';
const STATUS_COLUMN = 'status';             // text column: 'draft' | 'published'
const CATEGORY_COLUMN = 'category';
const LASTMOD_COLUMN = 'created_at';        // no updated_at column exists, so we fall back to created_at
// ---------------------------------------------------------------------

const STATIC_PAGES = [
  { path: '/', priority: '1.0' },
  { path: '/library', priority: '0.9' },
  { path: '/about', priority: '0.5' },
  { path: '/contact', priority: '0.4' },
  { path: '/privacy-policy', priority: '0.3' },
  { path: '/terms', priority: '0.3' },
];

interface ArticleRow {
  [key: string]: any;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, priority: string, lastmod?: string | null): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. ' +
      'Make sure your .env file (in the project root) has both set.'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Fetch published articles (paginated — Supabase caps a single
  //    request at 1000 rows, so we page through in batches until done)
  const selectColumns = `${SLUG_COLUMN}, ${CATEGORY_COLUMN}, ${LASTMOD_COLUMN}`;
  const PAGE_SIZE = 1000;

  const rows: ArticleRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data: page, error: pageError } = await supabase
      .from(ARTICLES_TABLE)
      .select(selectColumns)
      .eq(STATUS_COLUMN, 'published')
      .not(SLUG_COLUMN, 'is', null)
      .range(from, to);

    if (pageError) {
      throw new Error(`Failed to fetch articles: ${pageError.message}`);
    }

    if (!page || page.length === 0) break;

    rows.push(...page);

    if (page.length < PAGE_SIZE) break; // last page reached
    from += PAGE_SIZE;
  }

  // 2. Derive unique category names from the articles themselves
  const categories = Array.from(
    new Set(rows.map((row) => row[CATEGORY_COLUMN]).filter(Boolean))
  ).sort();

  // 3. Build the <url> entries
  const entries: string[] = [];

  for (const page of STATIC_PAGES) {
    entries.push(urlEntry(`${SITE_URL}${page.path}`, page.priority));
  }

  for (const category of categories) {
    const loc = `${SITE_URL}/?category=${encodeURIComponent(category)}`;
    entries.push(urlEntry(loc, '0.7'));
  }

  for (const row of rows) {
    const slug = row[SLUG_COLUMN];
    if (!slug) continue;
    const loc = `${SITE_URL}/library/${slug}`;
    const lastmod = row[LASTMOD_COLUMN]
      ? new Date(row[LASTMOD_COLUMN]).toISOString().split('T')[0]
      : undefined;
    entries.push(urlEntry(loc, '0.8', lastmod));
  }

  // 4. Write sitemap.xml
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, xml, 'utf-8');

  console.log(`✅ Sitemap generated with ${entries.length} URLs at ${OUTPUT_PATH}`);
  console.log(`   - ${STATIC_PAGES.length} static pages`);
  console.log(`   - ${categories.length} categories`);
  console.log(`   - ${rows.length} library articles`);
}

main().catch((err) => {
  console.error('❌ Sitemap generation failed:', err);
  process.exit(1);
});