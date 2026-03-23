// netlify/functions/ai-advisor.js
// Handles 4 modes: trending | recommendations | news | chat
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
  // Sanitize titles to avoid breaking JSON output
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

  // ── Simple in-memory cache ───────────────────────────────────────────────
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  if (!globalThis._aiCache) globalThis._aiCache = {};

  try {
    const body = await request.json();
    const { mode, category, platformData, message, history, categories } = body;

    const cacheKey = `${mode}:${category}`;
    if (mode !== 'chat' && mode !== 'suggestions' && mode !== 'pattern') {
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

    // ── PATTERN ANALYSIS — pure reasoning, no grounding needed ──────────────
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
          generationConfig: { maxOutputTokens: 4000, temperature: 0.3 },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(JSON.stringify({ error: `Gemini error: ${errText}` }), { status: geminiRes.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }

      const data = await geminiRes.json();
      console.log('Pattern response candidates:', data.candidates?.length);

      // gemini-2.5-flash is a thinking model — collect ALL text parts (thought + non-thought)
      // Sometimes the JSON ends up in thought parts, so try everything
      const allParts = (data.candidates || []).flatMap(c => c.content?.parts || []);
      const nonThoughtText = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('');
      const allText = allParts.filter(p => p.text).map(p => p.text).join('');

      console.log('Non-thought text length:', nonThoughtText.length);
      console.log('All text length:', allText.length);
      console.log('Preview:', (nonThoughtText||allText).slice(0, 200));

      // Try to extract JSON from either source
      const extractJSON = (text) => {
        if (!text) return null;
        // Strip markdown fences
        let t = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        // Try direct parse
        try { return JSON.parse(t); } catch {}
        // Find outermost { }
        const s = t.indexOf('{'), e = t.lastIndexOf('}');
        if (s !== -1 && e > s) {
          try { return JSON.parse(t.slice(s, e + 1)); } catch {}
        }
        // Try finding largest JSON-like block
        const matches = t.match(/\{[\s\S]+\}/g);
        if (matches) {
          for (const m of matches.sort((a,b) => b.length - a.length)) {
            try { return JSON.parse(m); } catch {}
          }
        }
        return null;
      };

      let parsed = extractJSON(nonThoughtText) || extractJSON(allText);

      if (!parsed) {
        console.error('JSON extraction failed. Raw text:', (nonThoughtText||allText).slice(0, 500));
        return new Response(JSON.stringify({ error: 'AI returned unexpected format. Please try again.' }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

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