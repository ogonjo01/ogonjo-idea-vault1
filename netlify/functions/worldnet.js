// netlify/functions/worldnet.js
// Regular Netlify Function (NOT edge) — gets full 26s default timeout, 60s with netlify.toml
// worldnet needs this because two sequential Gemini calls take 20-40s total
//
// STEP 1: Grounded Gemini call — fetches real news as plain text (grounding = no JSON)
// STEP 2: Ungrounded Gemini call — transforms text into clean JSON (no grounding = clean output)

const MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const extractJSON = (raw) => {
  const s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(s); } catch {}
  // Brace-counting — finds outermost { } regardless of preamble
  let depth = 0, start = -1, end = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (s[i] === '}') { depth--; if (depth === 0 && start !== -1) { end = i; break; } }
  }
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }
  return null;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'GEMINI_API_KEY not set.' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body.' }) }; }

  const { existingLibrary = [] } = body;
  const safeTitle = (t) => (t||'').replace(/"/g,"'").replace(/\\/g,'').slice(0,80);
  const libraryList = existingLibrary.slice(0, 100).map(safeTitle).join(' | ');

  // ── STEP 1: Grounded call — fetch real news as plain text ─────────────────
  const newsPrompt = `Search the web RIGHT NOW and list the 12 most important world news stories from the LAST 12 HOURS (March 2026). Include major economic events, business disruptions, political decisions affecting markets, technology breakthroughs, disasters, and viral business stories.

For each story write exactly:
STORY [N]: [headline]
SOURCE: [publication name]
SUMMARY: [2 sentences — what happened and why it matters for business/finance/careers/marketing]
ANGLE: [one sentence — how entrepreneurs, investors, or professionals should think about this]

Write all 12 stories. Be specific. Use only real current news.`;

  let newsText = '';
  try {
    const newsRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: newsPrompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 2500, temperature: 0.3 },
      }),
    });

    if (!newsRes.ok) {
      const err = await newsRes.text();
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `News fetch failed: ${err.slice(0,200)}` }) };
    }

    const newsData = await newsRes.json();
    const parts = (newsData.candidates || []).flatMap(c => c.content?.parts || []);
    newsText = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();

    if (!newsText) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Could not fetch news. Try again.' }) };
    }
    console.log('Step 1 done. News length:', newsText.length);
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `News step error: ${e.message}` }) };
  }

  // ── STEP 2: Ungrounded call — transform news into clean JSON ──────────────
  const jsonPrompt = `You are a content network architect for Ogonjo, a business knowledge platform with 4 pillars: Business & Entrepreneurship, Personal Finance & Investing, Career & Leadership, Marketing & Sales.

NEWS FROM LAST 12 HOURS:
${newsText}

EXISTING ARTICLE LIBRARY:
${libraryList}

Transform these news stories into 10 evergreen SEO content pieces. Each piece reframes a real news story as timeless strategy content — NOT written as news.

YOUR ENTIRE RESPONSE MUST BE ONLY A JSON OBJECT. Start with { and end with }. No other text.

{"generatedAt":"now","newsWindow":"last 12 hours","worldContext":"2-sentence summary of dominant global story","pieces":[{"id":1,"pillar":"Business & Entrepreneurship","isMagnet":true,"magnetReason":"why this gets high traffic","newsSource":"real event that inspired this piece","title":"Evergreen SEO title (How to / Why / What X Reveals About Y — never a news headline)","seoKeywords":["kw1","kw2","kw3","kw4","kw5"],"keyPoints":["Actionable insight 1","Actionable insight 2","Actionable insight 3"],"outline":["Introduction: hook","Section 1: title","Section 2: title","Section 3: title","Section 4: title","Conclusion: CTA"],"cta":"Specific professional advice for readers","writingPrompt":"Write a 1500-word article titled ACTUAL_TITLE_HERE. Cover these key points: ACTUAL_POINTS_HERE. Use this structure: ACTUAL_OUTLINE_HERE. End with this advice: ACTUAL_CTA_HERE. Audience: entrepreneurs, investors, professionals. SEO keywords to use naturally: ACTUAL_KEYWORDS_HERE. Use subheadings, short paragraphs, bold one insight per section. Frame as timeless strategy not news.","relatedFromLibrary":["lib title 1","lib title 2","lib title 3","lib title 4","lib title 5"],"searchVolumePotential":"high"}],"networkTerms":{"newTerms":[{"term":"Term","definition":"one sentence","appearsIn":[1,2,3]}],"existingTerms":[{"term":"term from library","linkedArticle":"matching title","appearsIn":[1,4]}]},"networkGuide":{"sharedSuggestions":[{"title":"suggestion","relevantFor":[1,2,5]}],"boldingRules":"Bold every term from networkTerms in every article for auto-linking.","linkingStrategy":"2-sentence strategy for interconnecting these 10 pieces with the existing library."}}

RULES — follow exactly:
- pieces: exactly 10 items
- isMagnet true on exactly 4 pieces (the 4 biggest/most viral stories)
- networkTerms.newTerms: exactly 20 terms
- networkGuide.sharedSuggestions: exactly 10 items
- relatedFromLibrary: exactly 5 titles picked from the existing library
- writingPrompt: replace all placeholder text with the ACTUAL content for that specific piece — no generic placeholders
- All titles must be evergreen strategy format, never news headlines`;

  try {
    const jsonRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: jsonPrompt }] }],
        // No grounding tool = clean JSON output
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 }, // disable thinking = no thought blocks, faster
        },
      }),
    });

    if (!jsonRes.ok) {
      const err = await jsonRes.text();
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `JSON generation failed: ${err.slice(0,200)}` }) };
    }

    const jsonData = await jsonRes.json();
    const parts = (jsonData.candidates || []).flatMap(c => c.content?.parts || []);
    const rawJson = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();

    console.log('Step 2 done. JSON length:', rawJson.length, 'starts:', rawJson.slice(0, 60));

    if (!rawJson) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'AI returned empty response. Try again.' }) };
    }

    const parsed = extractJSON(rawJson);

    if (!parsed) {
      console.error('JSON parse failed. Preview:', rawJson.slice(0, 400));
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'AI returned unexpected format. Try again.' }) };
    }

    parsed._generatedAt = new Date().toISOString();

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(parsed),
    };

  } catch (e) {
    console.error('JSON step error:', e);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `JSON step error: ${e.message}` }) };
  }
};