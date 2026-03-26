// netlify/functions/ai-advisor.js
// Handles 5 modes: trending | recommendations | news | chat | pattern | suggestions | worldnet
// Uses Google Gemini 2.5 Flash with grounding (real-time web search)

const MODEL = 'gemini-2.5-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const trendingPrompt = (category) => `You are a senior business intelligence analyst. Search the web RIGHT NOW for what people are actively searching for and what topics are trending in the "${category}" space — specifically content that gets discovered via Google Search and Google Discover in March 2026.

Return ONLY a valid JSON object. No markdown. No backticks. No explanation before or after. Just the raw JSON:
{"category":"${category}","updatedAt":"now","trendingSearces":[{"searchQuery":"exact phrase people type","volume":"high|medium|rising","contentAngle":"specific compelling article title to write","reason":"why this is trending right now in one sentence","googleDiscoverPotential":"high|medium|low"}],"risingTopics":["topic1","topic2","topic3","topic4","topic5"],"insight":"2-sentence summary of what is driving search interest in ${category} right now"}

Provide exactly 6 trending searches. Keep reason field to 10 words max.`;

const recommendationsPrompt = (category, pd) => `You are a senior content strategist specializing in Google SEO and Discover traffic. Search the web for what is currently trending in "${category}" in March 2026.

Platform context: ${pd?.totalContent||0} total pieces published. Top categories: ${(pd?.topCategories||[]).map(c=>`${c.name}(${c.count} pieces)`).join(', ')}. Top performing content: ${(pd?.topContent||[]).slice(0,4).map(c=>`"${c.title}"(${c.views_count} views)`).join(' | ')}.

Cross-reference live search trends with existing platform gaps to recommend the highest-impact content to create next.

Return ONLY a valid JSON object. No markdown. No backticks. No explanation:
{"category":"${category}","summary":"2-sentence strategy focusing on biggest opportunity","recommendations":[{"title":"specific compelling title","type":"Book Summary|Business Concept|Business Idea|Course|Market Analysis|Company Profile","searchDemand":"high|medium|rising","reason":"specific reason this will get Google traffic","urgency":"hot|high|medium","estimatedImpact":"specific traffic/engagement prediction"}],"contentGaps":["specific gap 1","specific gap 2","specific gap 3"],"quickWins":["quick win 1","quick win 2","quick win 3"]}

Provide exactly 5 recommendations. Keep reason and estimatedImpact fields brief (10 words max each).`;

const newsPrompt = (category) => `You are a business news analyst. Search the web for the most important business news related to "${category}" published in the last 48-72 hours (around March 7, 2026). Focus on news that matters to entrepreneurs, business owners, investors, and content creators in this space.

Return ONLY a valid JSON object. No markdown. No backticks. No explanation:
{"category":"${category}","fetchedAt":"now","headlines":[{"title":"exact headline","summary":"2-sentence summary of what happened and why it matters","source":"publication name","publishedAt":"e.g. 2 hours ago / yesterday","relevance":"why this matters for business content creators","contentOpportunity":"specific article title you could write based on this news","impact":"high|medium|low"}],"marketSentiment":"bullish|bearish|neutral|mixed","keyTheme":"the single biggest business theme dominating the news today","editorNote":"2-sentence actionable advice on what content to create this week based on these headlines"}

Provide exactly 5 headlines. Use real current news from the web. Keep each summary to 1 sentence max.`;

const patternPrompt = ({ viewedContent, allTitles, periodLabel, totalViews, topCategories }) => {
  const safeTitle = (t) => (t||'').replace(/"/g,"'").replace(/\\/g,'').slice(0,80);
  const viewedList = (viewedContent||[]).slice(0,25)
    .map(v=>`- ${safeTitle(v.title)} [${v.category}] ${v.views}views`)
    .join('\n');
  const libraryList = (allTitles||[]).slice(0,40).map(safeTitle).join(', ');
  const catList = (topCategories||[]).slice(0,6).map(c=>`${c.name}(${c.count})`).join(', ');

  return `You are a content pattern analyst for Ogonjo, a business knowledge platform.

PERIOD: ${periodLabel} | TOTAL VIEWS: ${totalViews}
TOP CATEGORIES: ${catList}

CONTENT VIEWED THIS PERIOD:
${viewedList}

LIBRARY TITLES (for gap detection):
${libraryList}

Analyse what the COMBINATION of viewed content reveals about audience intent, emerging themes, and content gaps. Look for patterns across titles, categories, and concepts.

Respond with ONLY a valid JSON object. No markdown. No text before or after. Start with { end with }.

The JSON must have these exact keys:
- periodLabel: string
- totalViews: number  
- narrative: string (3 sentences on the big picture pattern and audience intent)
- clusters: array of {theme, emoji, signal, titles, strength, color} where strength is strong/moderate/emerging and color is cyan/purple/orange/green/pink/amber
- archetypes: array of {name, emoji, description, whatTheyWant, percentOfAudience}
- gaps: array of {topic, emoji, whyItsMissing, opportunity, urgency} where urgency is high/medium/low
- momentum: object with rising/declining/stable arrays of {topic, signal, emoji}
- outlines: array of EXACTLY 5 items with {title, angle, whyNow, structure, targetArchetype, estimatedImpact} where structure is array of 5 section headings and estimatedImpact is high/medium

Use 3-4 clusters, 2-3 archetypes, 3-4 gaps, 2-4 rising, 2-3 declining, 1-2 stable. Reference actual titles from the data in your analysis.`;
};

// ─────────────────────────────────────────────────────────────────────────────
// WORLDNET PROMPT
// Crawls last 12 hours of world news → generates full content network
// ─────────────────────────────────────────────────────────────────────────────
const worldnetPrompt = (existingLibrary) => {
  const safeTitle = (t) => (t||'').replace(/"/g,"'").replace(/\\/g,'').slice(0,80);
  const libraryList = (existingLibrary||[]).slice(0,120).map(safeTitle).join(' | ');

  return `You are an elite content network architect and SEO strategist. Your job is to:
1. Search the web RIGHT NOW for the most important and impactful world news from the LAST 12 HOURS only (focus on March 2026)
2. Transform that news into a powerful content network for a business knowledge platform called Ogonjo

Ogonjo's 4 content pillars:
- Business & Entrepreneurship
- Personal Finance & Investing  
- Career & Leadership
- Marketing & Sales

EXISTING ARTICLE LIBRARY (cross-reference for related articles and term bolding):
${libraryList}

YOUR TASK:
Generate exactly 10 content pieces from the last 12 hours of world news. Each piece must:
- Be reframed as evergreen, high-search-traffic educational content (NOT written as news)
- Be applicable today, next year, any day — timeless strategy framing
- Belong to one of the 4 pillars above
- Include a complete writing prompt so the author can copy-paste it into an AI and get a full article instantly

Distribution rules:
- 4 pieces must be HIGH-IMPACT "traffic magnet" pieces (disaster, crisis, major disruption, viral event — reframed as strategy)
- 6 pieces spread across the 4 pillars (1-2 per pillar minimum)
- Rotate niches — no two consecutive pieces from the same pillar

For the 20 network terms:
- Extract the most important cross-article concepts
- These will be bolded in every article for auto-linking
- Scan the EXISTING LIBRARY for any matching terms — flag those as "existing" so they get bolded and linked to old articles too

Return ONLY a valid JSON object. No markdown. No backticks. No explanation before or after. Start with { end with }:

{
  "generatedAt": "timestamp string",
  "newsWindow": "last 12 hours",
  "worldContext": "2-sentence summary of the most dominant global story driving this network",
  "pieces": [
    {
      "id": 1,
      "pillar": "Business & Entrepreneurship|Personal Finance & Investing|Career & Leadership|Marketing & Sales",
      "isMagnet": true,
      "magnetReason": "why this is a high-impact traffic magnet (only if isMagnet true)",
      "newsSource": "the real-world event that inspired this piece (1 sentence)",
      "title": "SEO-optimized evergreen article title (not news framing)",
      "seoKeywords": ["keyword1","keyword2","keyword3","keyword4","keyword5"],
      "keyPoints": [
        "Key insight 1 — specific and actionable",
        "Key insight 2 — specific and actionable",
        "Key insight 3 — specific and actionable"
      ],
      "outline": [
        "Introduction: [hook angle]",
        "Section 1: [title]",
        "Section 2: [title]",
        "Section 3: [title]",
        "Section 4: [title]",
        "Conclusion: [CTA angle]"
      ],
      "cta": "Specific call-to-action or professional advice prompt for the end of this article",
      "writingPrompt": "Write a comprehensive 1500-word article titled '[TITLE]'. Use this structure: [OUTLINE]. Key points to cover: [KEYPOINTS]. The article should be educational and strategic — not written as news. Reframe the topic as timeless business/career/finance/marketing wisdom. End with this CTA: [CTA]. Target audience: entrepreneurs, business professionals, investors, and marketers. Optimize for Google SEO using these keywords naturally: [KEYWORDS]. Use subheadings, short paragraphs, and one bold insight per section.",
      "relatedFromLibrary": ["title1 from existing library","title2","title3","title4","title5"],
      "searchVolumePotential": "high|medium|rising"
    }
  ],
  "networkTerms": {
    "newTerms": [
      {"term": "Term Name", "definition": "one-sentence definition", "appearsIn": [1,2,3]}
    ],
    "existingTerms": [
      {"term": "Term from existing library", "linkedArticle": "matching library title", "appearsIn": [1,4,7]}
    ]
  },
  "networkGuide": {
    "sharedSuggestions": [
      {"title": "suggestion title", "relevantFor": [1,2,5,8]}
    ],
    "boldingRules": "When writing any of these 10 articles, bold every term from networkTerms.newTerms and networkTerms.existingTerms whenever they appear. New terms link to other pieces in this network. Existing terms link back to the existing library.",
    "linkingStrategy": "2-sentence strategy for how to interconnect these 10 pieces with the existing library"
  }
}

CRITICAL RULES:
- pieces array must have EXACTLY 10 items
- networkTerms.newTerms must have EXACTLY 20 terms
- networkTerms.existingTerms should have 5-10 terms found in the existing library
- networkGuide.sharedSuggestions must have EXACTLY 10 suggestions
- relatedFromLibrary must have EXACTLY 5 titles from the existing library (find the closest matches)
- writingPrompt must be a complete, ready-to-paste prompt — replace [TITLE], [OUTLINE], [KEYPOINTS], [CTA], [KEYWORDS] with actual content inline
- All titles must be evergreen SEO format: "How to...", "Why...", "The [N] Ways...", "[Topic]: A Complete Guide", "What [Event] Reveals About [Strategy]"
- isMagnet must be true for exactly 4 pieces
`;
};

const chatSystemPrompt = (platformData, categories) => `You are Marcus — an elite business consultant, growth strategist, and content monetization expert advising the founder of Ogonjo, a fast-growing business knowledge platform. You have 20+ years of experience advising startups, Fortune 500s, and digital media companies.

PLATFORM CONTEXT:
- Platform: Ogonjo — a business knowledge platform covering ${(categories||[]).join(', ') || 'business ideas, book summaries, business concepts, company profiles, market analysis, courses, business strategy'}
- Traffic source: Primarily Google Search and Google Discover (SEO-driven)
- Content: ${platformData ? `${platformData.totalContent} total pieces published` : 'growing content library'}
- Top categories: ${platformData ? (platformData.topCategories||[]).map(c=>`${c.name}(${c.count})`).join(', ') : 'business, finance, strategy'}
- Top performing content: ${platformData ? (platformData.topContent||[]).slice(0,3).map(c=>`"${c.title}"(${c.views_count} views)`).join(' | ') : 'various business topics'}

YOUR ROLE & PERSONALITY:
- You are direct, sharp, and deeply practical — no fluff, no filler
- You think like a CEO, a growth hacker, and a media strategist simultaneously
- You give specific, actionable advice with numbers, frameworks, and concrete next steps
- You are a monetization expert — you know exactly how to turn content and traffic into revenue
- You stay updated on what is happening in the business world RIGHT NOW
- You challenge the founder to think bigger and move faster
- You use web search to get real current data before advising

CORE EXPERTISE:
1. Content monetization (ads, courses, memberships, sponsorships, affiliate)
2. Google SEO and Discover optimization for massive organic traffic
3. Business strategy frameworks (Porter, Blue Ocean, Jobs-to-be-Done, OKRs, etc.)
4. Trending business topics and what entrepreneurs are searching for right now
5. African and emerging market business opportunities
6. Revenue diversification for media and content platforms
7. Scaling content operations efficiently
8. How to make more money from an existing audience and traffic

COMMUNICATION STYLE:
- Lead with the most important insight immediately
- Use specific numbers and examples when possible
- Break down complex strategies into clear numbered action steps
- Ask sharp follow-up questions to give better advice
- Be encouraging but brutally honest when something is not working
- Reference what top platforms like HBR, Forbes, Investopedia do — and how Ogonjo can compete
- When relevant, mention African/emerging market angles since the platform likely serves this audience

IMPORTANT: Always write complete, full responses. Never cut off mid-sentence or mid-thought. If outlining steps or a framework, always complete every single step. Do not truncate or summarize at the end — write the full answer.

Always search the web for current information before answering questions about trends, news, or what is popular right now. Today is March 2026.`;

const suggestionsPrompt = () => `You are a business intelligence analyst. Based on what is currently trending in the business world in March 2026, generate smart, specific questions that a business content platform owner would want to ask their AI advisor right now. Make them highly relevant to current events, trending topics, and real business opportunities.

Return ONLY valid JSON, no markdown, no backticks:
{
  "chat": ["question1","question2","question3","question4","question5","question6","question7","question8"],
  "trending": ["question1","question2","question3"],
  "recommendations": ["question1","question2","question3"],
  "news": ["question1","question2","question3"]
}

Chat questions should be about: current trending business topics, monetization strategies, content that will go viral right now, what entrepreneurs are searching for today, specific industries that are booming.
Trending questions should be about: specific niches with high search demand right now.
Recommendations questions should be about: content gaps and opportunities based on current market.
News questions should be about: turning today specific business news into content.

Make every question specific and timely — reference actual current trends, not generic advice.`;

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not set in Netlify environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const CACHE_TTL = 6 * 60 * 60 * 1000;
  if (!globalThis._aiCache) globalThis._aiCache = {};

  try {
    const body = await request.json();
    const { mode, category, platformData, message, history, categories } = body;

    const cacheKey = `${mode}:${category}`;
    if (mode !== 'chat' && mode !== 'suggestions' && mode !== 'pattern' && mode !== 'worldnet') {
      const cached = globalThis._aiCache[cacheKey];
      if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
        console.log('Cache hit:', cacheKey);
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'HIT' },
        });
      }
    }

    if (!mode) {
      return new Response(JSON.stringify({ error: 'Missing mode.' }), { status: 400 });
    }

    // ── PATTERN ANALYSIS ────────────────────────────────────────────────────
    if (mode === 'pattern') {
      const { viewedContent, allTitles, periodLabel, totalViews, topCategories } = body;
      if (!viewedContent?.length) {
        return new Response(JSON.stringify({ error: 'No view data provided.' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }

      const prompt = patternPrompt({ viewedContent, allTitles, periodLabel, totalViews, topCategories });

      const geminiRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(JSON.stringify({ error: `Gemini error: ${errText}` }), {
          status: geminiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const data = await geminiRes.json();
      const allParts = (data.candidates || []).flatMap(c => c.content?.parts || []);
      const rawText = allParts.filter(p => p.text).map(p => p.text).join('').trim();

      if (!rawText) {
        return new Response(JSON.stringify({ error: 'No response from AI. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      let parsed = null;
      const attempts = [rawText, rawText.replace(/```json/gi,'').replace(/```/g,'').trim()];
      for (const attempt of attempts) {
        if (parsed) break;
        try { parsed = JSON.parse(attempt); break; } catch {}
        try {
          const s = attempt.indexOf('{'), e = attempt.lastIndexOf('}');
          if (s !== -1 && e > s) { parsed = JSON.parse(attempt.slice(s, e+1)); }
        } catch {}
      }

      if (!parsed) {
        return new Response(JSON.stringify({ error: 'AI returned unexpected format. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── WORLDNET ─────────────────────────────────────────────────────────────
    // TWO-CALL APPROACH:
    // Call 1 (with grounding): fetch real news headlines as plain text
    // Call 2 (no grounding):   transform text into clean JSON network
    // Grounding + JSON output is unreliable in Gemini — splitting fixes it
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === 'worldnet') {
      const { existingLibrary } = body;
      const safeTitle = (t) => (t||'').replace(/"/g,"'").replace(/\\/g,'').slice(0,80);
      const libraryList = (existingLibrary||[]).slice(0,120).map(safeTitle).join(' | ');

      // ── CALL 1: Grounded news fetch — plain text output, no JSON ────────────
      const newsGatherPrompt = `Search the web RIGHT NOW and find the 12 most important world news stories from the LAST 12 HOURS (March 2026). Focus on: major economic events, business disruptions, political decisions affecting markets, technology breakthroughs, disasters or crises, viral business stories.

For each story write:
STORY [N]: [headline]
SOURCE: [publication]
SUMMARY: [2 sentences on what happened and why it matters]
BUSINESS ANGLE: [how entrepreneurs, investors, or professionals should think about this]

List all 12 stories. Be specific and factual. Use real current news only.`;

      const newsRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: newsGatherPrompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 3000, temperature: 0.3 },
        }),
      });

      if (!newsRes.ok) {
        const errText = await newsRes.text();
        return new Response(JSON.stringify({ error: `News fetch failed: ${errText}` }), {
          status: newsRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const newsData = await newsRes.json();
      const newsParts = (newsData.candidates || []).flatMap(c => c.content?.parts || []);
      const newsText = newsParts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();

      if (!newsText) {
        return new Response(JSON.stringify({ error: 'Could not fetch news. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      console.log('Worldnet step 1 done, news length:', newsText.length);

      // ── CALL 2: JSON generation — NO grounding tool, pure reasoning ──────────
      const jsonGenPrompt = `You are a content network architect for Ogonjo, a business knowledge platform with 4 pillars:
- Business & Entrepreneurship
- Personal Finance & Investing
- Career & Leadership
- Marketing & Sales

Here are 12 real news stories from the last 12 hours:

${newsText}

EXISTING ARTICLE LIBRARY (cross-reference for related articles):
${libraryList}

Transform these news stories into 10 evergreen SEO content pieces. Each piece must reframe a news story as timeless strategy/education — NOT written as news.

STRICT OUTPUT RULES:
- Your response must be ONLY a JSON object
- Start with { and end with }
- No text, explanation, or markdown before or after
- No backticks

JSON structure:
{"generatedAt":"now","newsWindow":"last 12 hours","worldContext":"2-sentence summary of dominant global story","pieces":[{"id":1,"pillar":"Business & Entrepreneurship","isMagnet":true,"magnetReason":"why high traffic","newsSource":"real event that inspired this","title":"SEO evergreen title","seoKeywords":["kw1","kw2","kw3","kw4","kw5"],"keyPoints":["point1","point2","point3"],"outline":["Introduction: hook","Section 1: title","Section 2: title","Section 3: title","Section 4: title","Conclusion: CTA"],"cta":"professional advice CTA","writingPrompt":"Full ready-to-paste writing prompt with all details filled in — no placeholders, all content inline","relatedFromLibrary":["lib1","lib2","lib3","lib4","lib5"],"searchVolumePotential":"high"}],"networkTerms":{"newTerms":[{"term":"Term","definition":"one sentence","appearsIn":[1,2]}],"existingTerms":[{"term":"library term","linkedArticle":"matching title","appearsIn":[1,3]}]},"networkGuide":{"sharedSuggestions":[{"title":"suggestion","relevantFor":[1,2,5]}],"boldingRules":"Bold every networkTerm whenever it appears in any article.","linkingStrategy":"2-sentence strategy for interconnecting pieces with existing library."}}

RULES:
- pieces: exactly 10 items
- isMagnet true on exactly 4 pieces
- networkTerms.newTerms: exactly 20 items
- networkGuide.sharedSuggestions: exactly 10 items
- relatedFromLibrary: exactly 5 titles from the existing library
- writingPrompt: fully written out, no [PLACEHOLDER] tokens`;

      const jsonRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: jsonGenPrompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });

      if (!jsonRes.ok) {
        const errText = await jsonRes.text();
        return new Response(JSON.stringify({ error: `JSON generation failed: ${errText}` }), {
          status: jsonRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const jsonData = await jsonRes.json();
      const jsonParts = (jsonData.candidates || []).flatMap(c => c.content?.parts || []);
      const rawJson = jsonParts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();

      console.log('Worldnet step 2 done, json length:', rawJson.length, 'starts:', rawJson.slice(0, 80));

      if (!rawJson) {
        return new Response(JSON.stringify({ error: 'AI returned empty JSON. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // ── Brace-counting JSON extractor ────────────────────────────────────────
      const extractJSON = (raw) => {
        const s = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        try { return JSON.parse(s); } catch {}
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

      const parsed = extractJSON(rawJson);

      if (!parsed) {
        console.error('Worldnet parse failed. Preview:', rawJson.slice(0, 500));
        return new Response(JSON.stringify({ error: 'AI returned unexpected format. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      parsed._generatedAt = new Date().toISOString();

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── ALL OTHER MODES ──────────────────────────────────────────────────────
    const groundingTool = { google_search: {} };
    let geminiBody;

    if (mode === 'chat') {
      if (!message) {
        return new Response(JSON.stringify({ error: 'Missing message.' }), { status: 400 });
      }

      const contents = [];
      const recentHistory = (history || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-12);

      for (const m of recentHistory) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }

      if (!contents.length || contents[contents.length - 1].parts[0].text !== message) {
        contents.push({ role: 'user', parts: [{ text: message }] });
      }

      geminiBody = {
        system_instruction: { parts: [{ text: chatSystemPrompt(platformData, categories) }] },
        contents,
        tools: [groundingTool],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.75 },
      };
    } else {
      if (!category && mode !== 'suggestions') {
        return new Response(JSON.stringify({ error: 'Missing category.' }), { status: 400 });
      }

      let prompt;
      if (mode === 'trending')             prompt = trendingPrompt(category);
      else if (mode === 'recommendations') prompt = recommendationsPrompt(category, platformData);
      else if (mode === 'news')            prompt = newsPrompt(category);
      else if (mode === 'suggestions')     prompt = suggestionsPrompt();
      else return new Response(JSON.stringify({ error: 'Invalid mode.' }), { status: 400 });

      geminiBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.3 },
      };
    }

    const geminiRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', errText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${errText}` }),
        { status: geminiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const data = await geminiRes.json();

    const allParts = (data.candidates || []).flatMap(c => c.content?.parts || []);
    console.log('Parts count:', allParts.length, 'types:', allParts.map(p => p.thought ? 'thought' : p.text ? 'text' : 'other').join(','));

    const finishReason = data.candidates?.[0]?.finishReason;
    console.log('Finish reason:', finishReason);
    if (finishReason === 'MAX_TOKENS') {
      console.warn('WARNING: Response cut off. Consider increasing maxOutputTokens.');
    }

    const textBlocks = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('');
    console.log('Raw textBlocks length:', textBlocks.length, 'preview:', textBlocks.slice(0, 200));

    if (!textBlocks) {
      console.error('Empty Gemini response:', JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: 'No response from AI. Try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (mode === 'chat') {
      return new Response(JSON.stringify({ reply: textBlocks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } else {
      let clean = textBlocks.replace(/```json|```/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start === -1 || end === -1) {
        console.error('No JSON found:', clean.slice(0, 500));
        return new Response(
          JSON.stringify({ error: 'AI returned unexpected format. Please try again.' }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
      clean = clean.slice(start, end + 1);
      console.log('Parsing JSON, length:', clean.length, 'preview:', clean.slice(0, 120));
      const parsed = JSON.parse(clean);
      if (mode !== 'suggestions') {
        globalThis._aiCache[cacheKey] = { data: parsed, ts: Date.now() };
      }
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'MISS' },
      });
    }
  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
};

export const config = { path: '/api/ai-advisor' };