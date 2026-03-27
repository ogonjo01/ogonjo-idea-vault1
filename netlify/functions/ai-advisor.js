// netlify/functions/ai-advisor.js
// Handles: trending | recommendations | news | chat | pattern | suggestions | worldnet
// Uses Google Gemini 2.5 Flash with grounding (real-time web search)
//
// WORLDNET approach — two calls, plain text output:
// Call 1 (grounded): fetches real 12hr news as plain text — no JSON pressure
// Call 2 (no grounding): builds network as plain text — no JSON = no parse errors ever

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

const newsPrompt = (category) => `You are a business news analyst. Search the web for the most important business news related to "${category}" published in the last 48-72 hours (around March 2026). Focus on news that matters to entrepreneurs, business owners, investors, and content creators in this space.

Return ONLY a valid JSON object. No markdown. No backticks. No explanation:
{"category":"${category}","fetchedAt":"now","headlines":[{"title":"exact headline","summary":"2-sentence summary of what happened and why it matters","source":"publication name","publishedAt":"e.g. 2 hours ago / yesterday","relevance":"why this matters for business content creators","contentOpportunity":"specific article title you could write based on this news","impact":"high|medium|low"}],"marketSentiment":"bullish|bearish|neutral|mixed","keyTheme":"the single biggest business theme dominating the news today","editorNote":"2-sentence actionable advice on what content to create this week based on these headlines"}

Provide exactly 5 headlines. Use real current news from the web. Keep each summary to 1 sentence max.`;

const patternPrompt = ({ viewedContent, allTitles, periodLabel, totalViews, topCategories }) => {
  const safeTitle = (t) => (t||'').replace(/"/g,"'").replace(/\\/g,'').slice(0,80);
  const viewedList = (viewedContent||[]).slice(0,25).map(v=>`- ${safeTitle(v.title)} [${v.category}] ${v.views}views`).join('\n');
  const libraryList = (allTitles||[]).slice(0,40).map(safeTitle).join(', ');
  const catList = (topCategories||[]).slice(0,6).map(c=>`${c.name}(${c.count})`).join(', ');
  return `You are a content pattern analyst for Ogonjo, a business knowledge platform.

PERIOD: ${periodLabel} | TOTAL VIEWS: ${totalViews}
TOP CATEGORIES: ${catList}

CONTENT VIEWED THIS PERIOD:
${viewedList}

LIBRARY TITLES (for gap detection):
${libraryList}

Analyse what the COMBINATION of viewed content reveals about audience intent, emerging themes, and content gaps.

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

Use 3-4 clusters, 2-3 archetypes, 3-4 gaps, 2-4 rising, 2-3 declining, 1-2 stable.`;
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

IMPORTANT: Always write complete, full responses. Never cut off mid-sentence or mid-thought. Do not truncate or summarize at the end — write the full answer.

Always search the web for current information before answering questions about trends, news, or what is popular right now. Today is March 2026.`;

const suggestionsPrompt = () => `You are a business intelligence analyst. Based on what is currently trending in the business world in March 2026, generate smart, specific questions that a business content platform owner would want to ask their AI advisor right now.

Return ONLY valid JSON, no markdown, no backticks:
{
  "chat": ["question1","question2","question3","question4","question5","question6","question7","question8"],
  "trending": ["question1","question2","question3"],
  "recommendations": ["question1","question2","question3"],
  "news": ["question1","question2","question3"]
}

Make every question specific and timely — reference actual current trends, not generic advice.`;

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Netlify.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set in Netlify environment variables.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
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
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'HIT' },
        });
      }
    }

    if (!mode) {
      return new Response(JSON.stringify({ error: 'Missing mode.' }), { status: 400 });
    }

    // ── PATTERN ───────────────────────────────────────────────────────────────
    if (mode === 'pattern') {
      const { viewedContent, allTitles, periodLabel, totalViews, topCategories } = body;
      if (!viewedContent?.length) {
        return new Response(JSON.stringify({ error: 'No view data provided.' }), {
          status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const prompt = patternPrompt({ viewedContent, allTitles, periodLabel, totalViews, topCategories });
      const geminiRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.3, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(JSON.stringify({ error: `Gemini error: ${errText}` }), {
          status: geminiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const data = await geminiRes.json();
      const allParts = (data.candidates||[]).flatMap(c=>c.content?.parts||[]);
      const rawText = allParts.filter(p=>p.text).map(p=>p.text).join('').trim();
      if (!rawText) {
        return new Response(JSON.stringify({ error: 'No response from AI. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      let parsed = null;
      for (const attempt of [rawText, rawText.replace(/```json/gi,'').replace(/```/g,'').trim()]) {
        if (parsed) break;
        try { parsed = JSON.parse(attempt); break; } catch {}
        try { const s=attempt.indexOf('{'),e=attempt.lastIndexOf('}'); if(s!==-1&&e>s) parsed=JSON.parse(attempt.slice(s,e+1)); } catch {}
      }
      if (!parsed) {
        return new Response(JSON.stringify({ error: 'AI returned unexpected format. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return new Response(JSON.stringify(parsed), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── WORLDNET ──────────────────────────────────────────────────────────────
    // Call 1: Grounded — get real 12hr news as plain text
    // Call 2: No grounding — build network as plain text (plain text = zero parse errors)
    // ─────────────────────────────────────────────────────────────────────────
    if (mode === 'worldnet') {
      const { existingLibrary = [] } = body;
      const safeTitle = (t) => (t||'').replace(/"/g,"'").replace(/\\/g,'').slice(0,80);
      const libraryList = existingLibrary.slice(0, 100).map(safeTitle).join('\n');

      // Call 1 — grounded news fetch
      const newsRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text:
            `Search the web RIGHT NOW. Find the 10 most important world news stories from the LAST 12 HOURS (March 2026). Business, economic, political, tech, disasters, viral stories.

For each write:
STORY [N]: [headline]
SOURCE: [publication]
SUMMARY: [2 sentences — what happened and why it matters for business/finance/career/marketing]
ANGLE: [1 sentence — how entrepreneurs or investors should think about this]

All 10 stories. Real news only.`
          }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.2 },
        }),
      });
      if (!newsRes.ok) {
        const err = await newsRes.text();
        return new Response(JSON.stringify({ error: `News fetch failed: ${err.slice(0,200)}` }), {
          status: newsRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const newsData = await newsRes.json();
      const newsParts = (newsData.candidates||[]).flatMap(c=>c.content?.parts||[]);
      const newsText = newsParts.filter(p=>p.text&&!p.thought).map(p=>p.text).join('').trim();
      if (!newsText) {
        return new Response(JSON.stringify({ error: 'Could not fetch news. Try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Call 2 — build network as plain text, no grounding
      const buildRes = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text:
            `You are a content network architect for Ogonjo, a business knowledge platform with 4 pillars: Business & Entrepreneurship, Personal Finance & Investing, Career & Leadership, Marketing & Sales.

Here are 10 real world news stories from the last 12 hours:
${newsText}

Here is the existing article library to cross-reference:
${libraryList}

Build a Content Network using exactly this format. Fill every section completely.

=== OGONJO CONTENT NETWORK ===
Generated: ${new Date().toUTCString()}
News window: Last 12 hours

--- 10 TITLES ---
Transform the news into 10 evergreen SEO titles (never news headlines). Format: "How to..." / "Why..." / "What X Reveals About Y" / "The N Ways...". Mark exactly 4 as [MAGNET] — highest traffic potential.

1. [MAGNET or blank] Title here
   Pillar: [one of the 4 pillars]
   Inspired by: [the real news story in 1 sentence]
   SEO keywords: keyword1, keyword2, keyword3, keyword4, keyword5

[repeat for titles 2–10]

--- 20 NEW TERMS ---
Extract 20 key concepts from these 10 articles. Bold these in every article you write for auto-linking.

1. Term — definition in one sentence — appears in titles: 1, 3, 5
[repeat for all 20]

--- LIBRARY MATCHES ---
For each of the 10 titles, list 3 closest matching articles from the existing library below. If no match exists, write "none found".

Title 1 related: Article A | Article B | Article C
[repeat for titles 2–10]

--- LIBRARY BOLD TERMS ---
List any terms from the existing library that also appear in the 10 new articles. Bold these to link back to old content.

- term → links to: existing article title
[list all found, or write "none found"]

--- WRITING PROMPTS ---

[FULL ARTICLE PROMPT — for 2000–2500 word articles]
Copy this prompt, paste your chosen title at the top, then paste it into any AI:

---
You are a professional business writer for Ogonjo. Write a complete, SEO-optimized article of 2000–2500 words.

TITLE: [paste title here]

STRUCTURE:
- Introduction: hook the reader, explain why this matters right now
- Section 1: core concept / what happened
- Section 2: why it matters for entrepreneurs/investors/professionals
- Section 3: practical strategies and how to apply this
- Section 4: common mistakes or what to avoid
- Conclusion: professional advice on next steps

STYLE: Educational strategy content, not news. Timeless wisdom. Short paragraphs (2–4 sentences). Clear subheadings. Bold one key insight per section.

SEO: Use the title keywords naturally throughout. Optimize for Google Search and Google Discover.

BOLDING FOR AUTO-LINKING: Bold every term from the 20 New Terms list and Library Bold Terms list whenever they appear in the article. This enables automatic internal linking.

RELATED ARTICLES: At the end of the article, add a "Related Articles" section using the 3 library matches for this specific title.

END WITH: A professional call-to-action advising the reader on their next concrete step.
---

[TERM DEFINITION PROMPT — for 1500 word term articles]
Copy this prompt, paste your chosen term at the top, then paste it into any AI:

---
You are a professional business educator for Ogonjo. Write a complete term definition article of 1500 words.

TERM: [paste term here]

STRUCTURE:
- Definition: clear plain-language definition
- Why it matters: importance in business today
- Real-world examples: 2–3 specific examples
- How to apply it: practical steps
- Common mistakes: what people get wrong
- Expert advice: professional recommendation

STYLE: Educational, clear, practical. Short paragraphs. Clear subheadings.

SEO: Use the term as the primary keyword throughout.

BOLDING FOR AUTO-LINKING: Bold every term from the 20 New Terms list and Library Bold Terms list whenever they appear.

END WITH: Professional advice on how to master this concept.
---

=== END OF NETWORK ===`
          }] }],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });

      if (!buildRes.ok) {
        const err = await buildRes.text();
        return new Response(JSON.stringify({ error: `Network build failed: ${err.slice(0,200)}` }), {
          status: buildRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const buildData = await buildRes.json();
      const buildParts = (buildData.candidates||[]).flatMap(c=>c.content?.parts||[]);
      const networkText = buildParts.filter(p=>p.text&&!p.thought).map(p=>p.text).join('').trim();
      if (!networkText) {
        return new Response(JSON.stringify({ error: 'Network generation failed. Try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Return as { network: "plain text" } — no JSON parsing, no parse errors ever
      return new Response(JSON.stringify({ network: networkText }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── ALL OTHER MODES ───────────────────────────────────────────────────────
    const groundingTool = { google_search: {} };
    let geminiBody;

    if (mode === 'chat') {
      if (!message) return new Response(JSON.stringify({ error: 'Missing message.' }), { status: 400 });
      const contents = [];
      const recentHistory = (history||[]).filter(m=>m.role==='user'||m.role==='assistant').slice(-12);
      for (const m of recentHistory) {
        contents.push({ role: m.role==='assistant'?'model':'user', parts: [{ text: m.content }] });
      }
      if (!contents.length || contents[contents.length-1].parts[0].text !== message) {
        contents.push({ role: 'user', parts: [{ text: message }] });
      }
      geminiBody = {
        system_instruction: { parts: [{ text: chatSystemPrompt(platformData, categories) }] },
        contents,
        tools: [groundingTool],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.75 },
      };
    } else {
      if (!category && mode !== 'suggestions') return new Response(JSON.stringify({ error: 'Missing category.' }), { status: 400 });
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
      return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), {
        status: geminiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await geminiRes.json();
    const allParts = (data.candidates||[]).flatMap(c=>c.content?.parts||[]);
    console.log('Parts count:', allParts.length, 'types:', allParts.map(p=>p.thought?'thought':p.text?'text':'other').join(','));
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') console.warn('WARNING: Response cut off.');

    const textBlocks = allParts.filter(p=>p.text&&!p.thought).map(p=>p.text).join('');
    if (!textBlocks) {
      return new Response(JSON.stringify({ error: 'No response from AI. Try again.' }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (mode === 'chat') {
      return new Response(JSON.stringify({ reply: textBlocks }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let clean = textBlocks.replace(/```json|```/g,'').trim();
    const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) {
      return new Response(JSON.stringify({ error: 'AI returned unexpected format. Please try again.' }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    clean = clean.slice(start, end+1);
    const parsed = JSON.parse(clean);
    if (mode !== 'suggestions') globalThis._aiCache[cacheKey] = { data: parsed, ts: Date.now() };
    return new Response(JSON.stringify(parsed), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': 'MISS' },
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: `Server error: ${err.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config = { path: '/api/ai-advisor' };