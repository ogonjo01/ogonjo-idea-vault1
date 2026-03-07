// netlify/functions/ai-advisor.js
// Handles 4 modes: trending | recommendations | news | chat
// Uses Google Gemini API with grounding (real-time web search)

const MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const trendingPrompt = (category) => `Search the web right now for what people are actively searching for and what topics are trending in the "${category}" space — specifically content discoverable via Google Search and Google Discover. Find real current trending searches and questions. Return ONLY valid JSON, no markdown, no backticks:
{"category":"${category}","updatedAt":"now","trendingSearces":[{"searchQuery":"exact phrase","volume":"high|medium|rising","contentAngle":"specific article title","reason":"why trending (1 sentence)","googleDiscoverPotential":"high|medium|low"}],"risingTopics":["t1","t2","t3","t4","t5"],"insight":"2-sentence summary of what is driving search interest in ${category} right now"}
Provide exactly 8 trending searches.`;

const recommendationsPrompt = (category, pd) => `Search the web for what is currently trending in "${category}". Cross-reference: total content: ${pd?.totalContent||0}, top categories: ${(pd?.topCategories||[]).map(c=>`${c.name}(${c.count})`).join(',')}, top content: ${(pd?.topContent||[]).slice(0,4).map(c=>`"${c.title}"(${c.views_count}views)`).join('|')}. Recommend content for Google discovery. Return ONLY valid JSON, no markdown, no backticks:
{"category":"${category}","summary":"2-sentence strategy","recommendations":[{"title":"specific title","type":"Book Summary|Business Concept|Business Idea|Course|Market Analysis|Company Profile","searchDemand":"high|medium|rising","reason":"why Google traffic","urgency":"hot|high|medium","estimatedImpact":"prediction"}],"contentGaps":["g1","g2","g3"],"quickWins":["w1","w2","w3"]}
Provide exactly 6 recommendations.`;

const newsPrompt = (category) => `Search the web for the latest business news related to "${category}" from the last 48-72 hours. Focus on what affects entrepreneurs and business professionals. Return ONLY valid JSON, no markdown, no backticks:
{"category":"${category}","fetchedAt":"now","headlines":[{"title":"headline","summary":"2 sentences","source":"publication","publishedAt":"how recent","relevance":"why it matters for content creators","contentOpportunity":"article you could write","impact":"high|medium|low"}],"marketSentiment":"bullish|bearish|neutral|mixed","keyTheme":"biggest theme today","editorNote":"2-sentence content strategy note"}
Provide exactly 7 headlines.`;

const chatSystemPrompt = (platformData, categories) => `You are an expert content strategy advisor for "Ogonjo" — a business knowledge platform that gets most of its traffic from Google Search and Google Discover. The platform covers: ${(categories||[]).join(', ') || 'business ideas, book summaries, business concepts, company profiles, market analysis, courses, business strategy'}.

Platform snapshot: ${platformData ? `${platformData.totalContent} total pieces, top categories: ${(platformData.topCategories||[]).map(c=>`${c.name}(${c.count})`).join(', ')}, top content: ${(platformData.topContent||[]).slice(0,3).map(c=>`"${c.title}"(${c.views_count}views)`).join(' | ')}` : 'data loading'}

You have web search / grounding capability. When asked about trends, current events, what's popular, or anything requiring up-to-date information — search the web first. Give specific, actionable advice. Be direct and practical. You are a real strategic advisor, not just a chatbot.`;

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

  try {
    const body = await request.json();
    const { mode, category, platformData, message, history, categories } = body;

    if (!mode) {
      return new Response(JSON.stringify({ error: 'Missing mode.' }), { status: 400 });
    }

    // Google Search grounding tool — gives Gemini real-time web access
    const groundingTool = { google_search: {} };

    let geminiBody;

    if (mode === 'chat') {
      if (!message) {
        return new Response(JSON.stringify({ error: 'Missing message.' }), { status: 400 });
      }

      // Build conversation history
      const contents = [];

      // Add history (last 10 messages)
      const recentHistory = (history || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10);

      for (const m of recentHistory) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        });
      }

      // Add current message if not already last
      if (!contents.length || contents[contents.length - 1].parts[0].text !== message) {
        contents.push({ role: 'user', parts: [{ text: message }] });
      }

      geminiBody = {
        system_instruction: { parts: [{ text: chatSystemPrompt(platformData, categories) }] },
        contents,
        tools: [groundingTool],
        generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
      };
    } else {
      // Non-chat structured modes
      if (!category) {
        return new Response(JSON.stringify({ error: 'Missing category.' }), { status: 400 });
      }

      let prompt;
      if (mode === 'trending')           prompt = trendingPrompt(category);
      else if (mode === 'recommendations') prompt = recommendationsPrompt(category, platformData);
      else if (mode === 'news')          prompt = newsPrompt(category);
      else return new Response(JSON.stringify({ error: 'Invalid mode.' }), { status: 400 });

      geminiBody = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [groundingTool],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.4 },
      };
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', errText);
      return new Response(
        JSON.stringify({ error: 'Gemini API error. Check Netlify function logs.' }),
        { status: geminiRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await geminiRes.json();

    // Extract text from Gemini response
    const textBlocks = (data.candidates || [])
      .flatMap(c => c.content?.parts || [])
      .filter(p => p.text)
      .map(p => p.text)
      .join('');

    if (mode === 'chat') {
      return new Response(JSON.stringify({ reply: textBlocks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } else {
      // Parse JSON for structured tabs
      const clean = textBlocks.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch (err) {
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = { path: '/api/ai-advisor' };