// netlify/functions/ai-advisor.js
// Modes: trending | recommendations | news | chat | pattern | suggestions | worldnet
// Uses Google Gemini 2.5 Flash with grounding (real-time web search)
// Fixed: robust JSON extraction, writingPrompt built client-side, stricter prompts

const MODEL       = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CACHE_TTL   = 6 * 60 * 60 * 1000; // 6 hours

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Call Gemini and return raw text, throwing on HTTP error */
async function callGemini(apiKey, body) {
  const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw Object.assign(new Error(`Gemini HTTP ${res.status}: ${txt}`), { status: res.status });
  }
  const data   = await res.json();
  const parts  = (data.candidates ?? []).flatMap(c => c.content?.parts ?? []);
  const text   = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
  const reason = data.candidates?.[0]?.finishReason;
  if (reason === 'MAX_TOKENS') console.warn('WARNING: Gemini response cut off at MAX_TOKENS');
  return text;
}

/** Aggressively extract the first complete JSON object from a string */
function extractJSON(raw) {
  if (!raw) return null;

  // Strip markdown fences
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Try direct parse first
  try { return JSON.parse(s); } catch {}

  // Find outermost { … }
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  const candidate = s.slice(start, end + 1);
  try { return JSON.parse(candidate); } catch {}

  // Last resort: strip control characters and retry
  try { return JSON.parse(candidate.replace(/[\x00-\x1F\x7F]/g, ' ')); } catch {}

  return null;
}

/** JSON response helper */
const jsonResponse = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...extra },
  });

// ─────────────────────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

const JSON_PREAMBLE = `IMPORTANT: Respond with ONLY a raw JSON object. Do not include any text, explanation, markdown, or code fences before or after the JSON. Your entire response must start with { and end with }.

`;

function trendingPrompt(category) {
  return JSON_PREAMBLE + `You are a senior business intelligence analyst. Search the web RIGHT NOW for what people are actively searching for and what topics are trending in the "${category}" space — specifically content discovered via Google Search and Google Discover in March 2026.

Return this exact JSON structure:
{
  "category": "${category}",
  "updatedAt": "now",
  "trendingSearches": [
    {
      "searchQuery": "exact phrase people type",
      "volume": "high|medium|rising",
      "contentAngle": "specific compelling article title to write",
      "reason": "why trending now (10 words max)",
      "googleDiscoverPotential": "high|medium|low"
    }
  ],
  "risingTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "insight": "2-sentence summary of what is driving search interest in ${category} right now"
}

Rules:
- trendingSearches must have EXACTLY 6 items
- reason field must be 10 words or fewer
- Use real current data from web search`;
}

function recommendationsPrompt(category, pd) {
  const total   = pd?.totalContent ?? 0;
  const cats    = (pd?.topCategories ?? []).map(c => `${c.name}(${c.count})`).join(', ');
  const top     = (pd?.topContent ?? []).slice(0, 4).map(c => `"${c.title}"(${c.views_count}v)`).join(' | ');
  return JSON_PREAMBLE + `You are a senior content strategist specializing in Google SEO and Discover traffic. Search the web for what is currently trending in "${category}" in March 2026.

Platform context: ${total} total pieces. Top categories: ${cats}. Top content: ${top}.

Cross-reference live search trends with platform gaps to recommend the highest-impact content to create next.

Return this exact JSON structure:
{
  "category": "${category}",
  "summary": "2-sentence strategy focusing on biggest opportunity",
  "recommendations": [
    {
      "title": "specific compelling title",
      "type": "Book Summary|Business Concept|Business Idea|Course|Market Analysis|Company Profile",
      "searchDemand": "high|medium|rising",
      "reason": "why this gets Google traffic (10 words max)",
      "urgency": "hot|high|medium",
      "estimatedImpact": "traffic prediction (10 words max)"
    }
  ],
  "contentGaps": ["gap1", "gap2", "gap3"],
  "quickWins": ["win1", "win2", "win3"]
}

Rules:
- recommendations must have EXACTLY 5 items
- Keep reason and estimatedImpact to 10 words max each`;
}

function newsPrompt(category) {
  return JSON_PREAMBLE + `You are a business news analyst. Search the web for the most important business news related to "${category}" published in the last 48-72 hours (around March 2026). Focus on news relevant to entrepreneurs, investors, and content creators.

Return this exact JSON structure:
{
  "category": "${category}",
  "fetchedAt": "now",
  "headlines": [
    {
      "title": "exact headline",
      "summary": "1-sentence summary of what happened and why it matters",
      "source": "publication name",
      "publishedAt": "e.g. 2 hours ago / yesterday",
      "relevance": "why this matters for business content creators (10 words max)",
      "contentOpportunity": "specific article title you could write based on this news",
      "impact": "high|medium|low"
    }
  ],
  "marketSentiment": "bullish|bearish|neutral|mixed",
  "keyTheme": "the single biggest business theme dominating the news today",
  "editorNote": "2-sentence actionable advice on what content to create this week based on these headlines"
}

Rules:
- headlines must have EXACTLY 5 items
- Use real current news from the web
- summary must be 1 sentence max`;
}

function patternPrompt({ viewedContent, allTitles, periodLabel, totalViews, topCategories }) {
  const safe   = t => (t ?? '').replace(/"/g, "'").replace(/\\/g, '').slice(0, 80);
  const viewed = (viewedContent ?? []).slice(0, 25).map(v => `- ${safe(v.title)} [${v.category}] ${v.views}views`).join('\n');
  const lib    = (allTitles ?? []).slice(0, 40).map(safe).join(', ');
  const cats   = (topCategories ?? []).slice(0, 6).map(c => `${c.name}(${c.count})`).join(', ');

  return JSON_PREAMBLE + `You are a content pattern analyst for Ogonjo, a business knowledge platform.

PERIOD: ${periodLabel} | TOTAL VIEWS: ${totalViews}
TOP CATEGORIES: ${cats}

CONTENT VIEWED THIS PERIOD:
${viewed}

LIBRARY TITLES (for gap detection):
${lib}

Analyse patterns across viewed content to reveal audience intent, emerging themes, and content gaps.

Return this exact JSON structure:
{
  "periodLabel": "${periodLabel}",
  "totalViews": ${totalViews},
  "narrative": "3 sentences on the big picture pattern and audience intent",
  "clusters": [
    {
      "theme": "theme name",
      "emoji": "single emoji",
      "signal": "what this cluster reveals (1 sentence)",
      "titles": ["title from data", "title from data", "title from data"],
      "strength": "strong|moderate|emerging",
      "color": "cyan|purple|orange|green|pink|amber"
    }
  ],
  "archetypes": [
    {
      "name": "archetype name",
      "emoji": "single emoji",
      "description": "who this person is (1 sentence)",
      "whatTheyWant": "what content they seek",
      "percentOfAudience": 35
    }
  ],
  "gaps": [
    {
      "topic": "missing topic",
      "emoji": "single emoji",
      "whyItsMissing": "reason (1 sentence)",
      "opportunity": "content opportunity (1 sentence)",
      "urgency": "high|medium|low"
    }
  ],
  "momentum": {
    "rising": [{"topic": "topic", "signal": "signal (1 sentence)", "emoji": "emoji"}],
    "declining": [{"topic": "topic", "signal": "signal (1 sentence)", "emoji": "emoji"}],
    "stable": [{"topic": "topic", "signal": "signal (1 sentence)", "emoji": "emoji"}]
  },
  "outlines": [
    {
      "title": "article title",
      "angle": "specific content angle (1 sentence)",
      "whyNow": "why create this now (1 sentence)",
      "structure": ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5"],
      "targetArchetype": "archetype name",
      "estimatedImpact": "high|medium"
    }
  ]
}

Rules:
- clusters: 3-4 items
- archetypes: 2-3 items  
- gaps: 3-4 items
- momentum.rising: 2-4 items, momentum.declining: 2-3 items, momentum.stable: 1-2 items
- outlines: EXACTLY 5 items
- Reference actual titles from the data in clusters.titles`;
}

function worldnetPrompt(existingLibrary) {
  const safe = t => (t ?? '').replace(/"/g, "'").replace(/\\/g, '').slice(0, 80);
  const lib  = (existingLibrary ?? []).slice(0, 120).map(safe).join(' | ');

  return JSON_PREAMBLE + `You are an elite content network architect and SEO strategist for Ogonjo, a business knowledge platform.

Step 1: Search the web RIGHT NOW for the most important world news from the LAST 12 HOURS (March 2026).
Step 2: Transform that news into a powerful 10-piece content network across these 4 pillars:
  - Business & Entrepreneurship
  - Personal Finance & Investing
  - Career & Leadership
  - Marketing & Sales

EXISTING ARTICLE LIBRARY (use these titles for relatedFromLibrary — pick the 5 closest matches per piece):
${lib}

CONTENT RULES:
- Every piece must be framed as EVERGREEN educational content — NOT as breaking news
- Titles must be timeless SEO format: "How to...", "Why...", "The N Ways...", "What X Reveals About Y"
- Distribution: exactly 4 pieces marked isMagnet:true (high-traffic crisis/disruption angles), 6 pieces across pillars
- No two consecutive pieces from the same pillar

NETWORK TERMS RULES:
- newTerms: 20 NEW terms extracted from the 10 pieces — important cross-article concepts
- existingTerms: 5-10 terms found in the EXISTING LIBRARY above — flag these for back-linking

Return this exact JSON structure (no writingPrompt field — it is generated client-side):
{
  "generatedAt": "ISO timestamp",
  "newsWindow": "last 12 hours",
  "worldContext": "2 sentences on the dominant global story driving this network",
  "pieces": [
    {
      "id": 1,
      "pillar": "Business & Entrepreneurship",
      "isMagnet": true,
      "magnetReason": "why this is a high-impact traffic magnet (only when isMagnet is true, else omit)",
      "newsSource": "the real-world event that inspired this piece (1 sentence)",
      "title": "SEO-optimized evergreen article title",
      "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "keyPoints": [
        "Key insight 1 — specific and actionable",
        "Key insight 2 — specific and actionable",
        "Key insight 3 — specific and actionable"
      ],
      "outline": [
        "Introduction: hook angle",
        "Section 1: title",
        "Section 2: title",
        "Section 3: title",
        "Section 4: title",
        "Conclusion: CTA angle"
      ],
      "cta": "Specific call-to-action for the end of this article",
      "relatedFromLibrary": ["library title 1", "library title 2", "library title 3", "library title 4", "library title 5"],
      "searchVolumePotential": "high|medium|rising"
    }
  ],
  "networkTerms": {
    "newTerms": [
      {"term": "Term Name", "definition": "one-sentence definition", "appearsIn": [1, 2, 3]}
    ],
    "existingTerms": [
      {"term": "Term from existing library", "linkedArticle": "matching library title", "appearsIn": [1, 4]}
    ]
  },
  "networkGuide": {
    "sharedSuggestions": [
      {"title": "suggestion title", "relevantFor": [1, 2, 5]}
    ],
    "boldingRules": "Instruction on how to bold terms across all articles for auto-linking (2 sentences)",
    "linkingStrategy": "Strategy for interconnecting these 10 pieces with the existing library (2 sentences)"
  }
}

HARD RULES — violating any of these makes the response unusable:
1. pieces array must have EXACTLY 10 items
2. networkTerms.newTerms must have EXACTLY 20 items
3. networkTerms.existingTerms must have 5-10 items from the existing library
4. networkGuide.sharedSuggestions must have EXACTLY 10 items
5. relatedFromLibrary must have EXACTLY 5 titles per piece, chosen from the existing library
6. isMagnet must be true for EXACTLY 4 pieces
7. Do NOT include a writingPrompt field anywhere — it will cause a JSON parse error
8. All string values must use only standard characters — no unescaped quotes inside strings`;
}

function suggestionsPrompt() {
  return JSON_PREAMBLE + `You are a business intelligence analyst. Based on what is currently trending in the business world in March 2026, generate smart, specific questions that a business content platform owner would want to ask their AI advisor right now.

Return this exact JSON structure:
{
  "chat": ["question1", "question2", "question3", "question4", "question5", "question6", "question7", "question8"],
  "trending": ["question1", "question2", "question3"],
  "recommendations": ["question1", "question2", "question3"],
  "news": ["question1", "question2", "question3"]
}

Rules:
- chat: 8 questions about current trending business topics, monetization, viral content, what entrepreneurs search for today
- trending: 3 questions about specific niches with high search demand right now
- recommendations: 3 questions about content gaps and opportunities based on current market
- news: 3 questions about turning today's specific business news into content
- Make every question specific and timely — reference actual current trends, not generic advice`;
}

function chatSystemPrompt(platformData, categories) {
  const cats = (categories ?? []).join(', ') || 'business ideas, book summaries, business concepts, company profiles, market analysis, courses';
  const total = platformData?.totalContent ?? 0;
  const topCats = (platformData?.topCategories ?? []).map(c => `${c.name}(${c.count})`).join(', ');
  const topContent = (platformData?.topContent ?? []).slice(0, 3).map(c => `"${c.title}"(${c.views_count}v)`).join(' | ');

  return `You are Marcus — an elite business consultant, growth strategist, and content monetization expert advising the founder of Ogonjo, a fast-growing business knowledge platform. You have 20+ years of experience advising startups, Fortune 500s, and digital media companies.

PLATFORM CONTEXT:
- Platform: Ogonjo — a business knowledge platform covering ${cats}
- Traffic source: Primarily Google Search and Google Discover (SEO-driven)
- Content: ${total} total pieces published
- Top categories: ${topCats}
- Top performing content: ${topContent}

YOUR ROLE:
- Direct, sharp, and deeply practical — no fluff, no filler
- Think like a CEO, growth hacker, and media strategist simultaneously
- Give specific, actionable advice with numbers, frameworks, and concrete next steps
- Expert in monetization: how to turn content and traffic into revenue
- Stay updated on what is happening RIGHT NOW — use web search before answering
- Challenge the founder to think bigger and move faster

CORE EXPERTISE:
1. Content monetization (ads, courses, memberships, sponsorships, affiliate)
2. Google SEO and Discover optimization for massive organic traffic
3. Business strategy frameworks (Porter, Blue Ocean, Jobs-to-be-Done, OKRs)
4. Trending business topics and what entrepreneurs are searching for right now
5. African and emerging market business opportunities
6. Revenue diversification for media and content platforms
7. Scaling content operations efficiently

COMMUNICATION STYLE:
- Lead with the most important insight immediately
- Use specific numbers and examples when possible
- Break down strategies into clear numbered action steps
- Be encouraging but brutally honest when something is not working
- Always write COMPLETE responses — never cut off mid-sentence or truncate
- Always search the web for current information before answering trend questions

Today is March 2026.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handlePattern(apiKey, body) {
  const { viewedContent, allTitles, periodLabel, totalViews, topCategories } = body;
  if (!viewedContent?.length) throw Object.assign(new Error('No view data provided.'), { status: 400 });

  const text   = await callGemini(apiKey, {
    contents:         [{ role: 'user', parts: [{ text: patternPrompt({ viewedContent, allTitles, periodLabel, totalViews, topCategories }) }] }],
    generationConfig: { maxOutputTokens: 4000, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
  });

  const parsed = extractJSON(text);
  if (!parsed) throw new Error('AI returned unexpected format. Please try again.');
  return parsed;
}

async function handleWorldnet(apiKey, body) {
  const { existingLibrary } = body;

  const text = await callGemini(apiKey, {
    contents:         [{ role: 'user', parts: [{ text: worldnetPrompt(existingLibrary ?? []) }] }],
    tools:            [{ google_search: {} }],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
  });

  const parsed = extractJSON(text);
  if (!parsed) {
    console.error('Worldnet parse failed. Raw preview:', text.slice(0, 800));
    throw new Error('AI returned unexpected format. Please try again.');
  }

  // Validate critical fields
  if (!Array.isArray(parsed.pieces) || parsed.pieces.length === 0) {
    throw new Error('AI response missing pieces array. Please try again.');
  }

  parsed._generatedAt = new Date().toISOString();
  return parsed;
}

async function handleChat(apiKey, body) {
  const { message, history, platformData, categories } = body;
  if (!message) throw Object.assign(new Error('Missing message.'), { status: 400 });

  const contents = [];
  const recent   = (history ?? []).filter(m => m.role === 'user' || m.role === 'assistant').slice(-12);

  for (const m of recent) {
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }

  // Ensure the current message is the last user turn
  if (!contents.length || contents[contents.length - 1].role !== 'user') {
    contents.push({ role: 'user', parts: [{ text: message }] });
  }

  const text = await callGemini(apiKey, {
    system_instruction: { parts: [{ text: chatSystemPrompt(platformData, categories) }] },
    contents,
    tools:            [{ google_search: {} }],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.75 },
  });

  return { reply: text };
}

async function handleJSONMode(apiKey, mode, body, cache) {
  const { category, platformData } = body;
  if (!category) throw Object.assign(new Error('Missing category.'), { status: 400 });

  const cacheKey = `${mode}:${category}`;
  const cached   = cache[cacheKey];
  if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
    console.log('Cache hit:', cacheKey);
    return { data: cached.data, cacheHit: true };
  }

  let prompt;
  if      (mode === 'trending')        prompt = trendingPrompt(category);
  else if (mode === 'recommendations') prompt = recommendationsPrompt(category, platformData);
  else if (mode === 'news')            prompt = newsPrompt(category);
  else throw Object.assign(new Error('Invalid mode.'), { status: 400 });

  const text   = await callGemini(apiKey, {
    contents:         [{ role: 'user', parts: [{ text: prompt }] }],
    tools:            [{ google_search: {} }],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
  });

  const parsed = extractJSON(text);
  if (!parsed) throw new Error('AI returned unexpected format. Please try again.');

  cache[cacheKey] = { data: parsed, ts: Date.now() };
  return { data: parsed, cacheHit: false };
}

async function handleSuggestions(apiKey) {
  const text   = await callGemini(apiKey, {
    contents:         [{ role: 'user', parts: [{ text: suggestionsPrompt() }] }],
    tools:            [{ google_search: {} }],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
  });
  const parsed = extractJSON(text);
  if (!parsed) throw new Error('AI returned unexpected format.');
  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export default async (request) => {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'GEMINI_API_KEY not set in Netlify environment variables.' }, 500);
  }

  // In-memory cache (persists across warm invocations)
  if (!globalThis._aiCache) globalThis._aiCache = {};
  const cache = globalThis._aiCache;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON in request body.' }, 400);
  }

  const { mode } = body;
  if (!mode) return jsonResponse({ error: 'Missing mode.' }, 400);

  try {
    // ── Route by mode ────────────────────────────────────────────────────────
    if (mode === 'pattern') {
      const result = await handlePattern(apiKey, body);
      return jsonResponse(result);
    }

    if (mode === 'worldnet') {
      const result = await handleWorldnet(apiKey, body);
      return jsonResponse(result);
    }

    if (mode === 'chat') {
      const result = await handleChat(apiKey, body);
      return jsonResponse(result);
    }

    if (mode === 'suggestions') {
      const result = await handleSuggestions(apiKey);
      return jsonResponse(result);
    }

    if (['trending', 'recommendations', 'news'].includes(mode)) {
      const { data, cacheHit } = await handleJSONMode(apiKey, mode, body, cache);
      return jsonResponse(data, 200, { 'X-Cache': cacheHit ? 'HIT' : 'MISS' });
    }

    return jsonResponse({ error: `Unknown mode: ${mode}` }, 400);

  } catch (err) {
    console.error(`[ai-advisor] mode=${mode} error:`, err);
    const status = err.status ?? 500;
    return jsonResponse({ error: err.message ?? 'Internal server error.' }, status);
  }
};

export const config = { path: '/api/ai-advisor' };