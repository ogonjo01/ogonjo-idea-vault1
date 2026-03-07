// netlify/functions/ai-advisor.js
// Handles 4 modes: trending | recommendations | news | chat
// Uses Claude web_search tool for real current data.

const MODEL = 'claude-haiku-4-5-20251001';

const trendingPrompt = (category) => `Search the web right now for what people are actively searching for and what topics are trending in the "${category}" space — specifically content discoverable via Google Search and Google Discover. Find real current trending searches and questions. Return ONLY valid JSON, no markdown:
{"category":"${category}","updatedAt":"now","trendingSearces":[{"searchQuery":"exact phrase","volume":"high|medium|rising","contentAngle":"specific article title","reason":"why trending (1 sentence)","googleDiscoverPotential":"high|medium|low"}],"risingTopics":["t1","t2","t3","t4","t5"],"insight":"2-sentence summary of what is driving search interest in ${category} right now"}
Provide exactly 8 trending searches.`;

const recommendationsPrompt = (category, pd) => `Search the web for what is currently trending in "${category}". Cross-reference: total content: ${pd?.totalContent||0}, top categories: ${(pd?.topCategories||[]).map(c=>`${c.name}(${c.count})`).join(',')}, top content: ${(pd?.topContent||[]).slice(0,4).map(c=>`"${c.title}"(${c.views_count}views)`).join('|')}. Recommend content for Google discovery. Return ONLY valid JSON:
{"category":"${category}","summary":"2-sentence strategy","recommendations":[{"title":"specific title","type":"Book Summary|Business Concept|Business Idea|Course|Market Analysis|Company Profile","searchDemand":"high|medium|rising","reason":"why Google traffic","urgency":"hot|high|medium","estimatedImpact":"prediction"}],"contentGaps":["g1","g2","g3"],"quickWins":["w1","w2","w3"]}
Provide exactly 6 recommendations.`;

const newsPrompt = (category) => `Search the web for the latest business news related to "${category}" from the last 48-72 hours. Focus on what affects entrepreneurs and business professionals. Return ONLY valid JSON:
{"category":"${category}","fetchedAt":"now","headlines":[{"title":"headline","summary":"2 sentences","source":"publication","publishedAt":"how recent","relevance":"why it matters for content creators","contentOpportunity":"article you could write","impact":"high|medium|low"}],"marketSentiment":"bullish|bearish|neutral|mixed","keyTheme":"biggest theme today","editorNote":"2-sentence content strategy note"}
Provide exactly 7 headlines.`;

const chatSystemPrompt = (platformData, categories) => `You are an expert content strategy advisor for "Ogonjo" — a business knowledge platform that gets most of its traffic from Google Search and Google Discover. The platform covers: ${(categories||[]).join(', ') || 'business ideas, book summaries, business concepts, company profiles, market analysis, courses, business strategy'}.

Platform snapshot: ${platformData ? `${platformData.totalContent} total pieces, top categories: ${(platformData.topCategories||[]).map(c=>`${c.name}(${c.count})`).join(', ')}, top content: ${(platformData.topContent||[]).slice(0,3).map(c=>`"${c.title}"(${c.views_count}views)`).join(' | ')}` : 'data loading'}

You have web search capability. When asked about trends, current events, what's popular, or anything that requires up-to-date information — ALWAYS search the web first before answering. Give specific, actionable advice. Be direct and practical. You are a real strategic advisor, not just a chatbot.`;

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status:204, headers:{ 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type' } });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error:'Method not allowed' }), { status:405, headers:{ 'Content-Type':'application/json' } });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error:'ANTHROPIC_API_KEY not set in Netlify environment variables.' }), { status:500, headers:{ 'Content-Type':'application/json' } });
  }

  try {
    const body = await request.json();
    const { mode, category, platformData, message, history, categories } = body;

    if (!mode) return new Response(JSON.stringify({ error:'Missing mode.' }), { status:400 });

    let requestBody;

    if (mode === 'chat') {
      // ── Chat mode: conversational with web search ────────────────────────
      if (!message) return new Response(JSON.stringify({ error:'Missing message.' }), { status:400 });

      // Build conversation history for Claude
      const claudeMessages = (history || [])
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10) // keep last 10 for context
        .map(m => ({ role: m.role, content: m.content }));

      // Make sure last message is the current user message
      if (!claudeMessages.length || claudeMessages[claudeMessages.length-1].content !== message) {
        claudeMessages.push({ role:'user', content: message });
      }

      requestBody = {
        model: MODEL,
        max_tokens: 1500,
        system: chatSystemPrompt(platformData, categories),
        tools: [{ type:'web_search_20250305', name:'web_search' }],
        messages: claudeMessages,
      };
    } else {
      // ── Non-chat modes ───────────────────────────────────────────────────
      if (!category) return new Response(JSON.stringify({ error:'Missing category.' }), { status:400 });

      let prompt;
      if (mode==='trending')        prompt = trendingPrompt(category);
      else if (mode==='recommendations') prompt = recommendationsPrompt(category, platformData);
      else if (mode==='news')       prompt = newsPrompt(category);
      else return new Response(JSON.stringify({ error:'Invalid mode.' }), { status:400 });

      requestBody = {
        model: MODEL,
        max_tokens: 2000,
        tools: [{ type:'web_search_20250305', name:'web_search' }],
        messages: [{ role:'user', content: prompt }],
      };
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic error:', errText);
      return new Response(JSON.stringify({ error:'Anthropic API error. Check Netlify function logs.' }), { status:anthropicRes.status, headers:{ 'Content-Type':'application/json' } });
    }

    const data = await anthropicRes.json();
    const textBlocks = (data.content || []).filter(b => b.type === 'text').map(b => b.text || '').join('');

    if (mode === 'chat') {
      // Return plain text reply for chat
      return new Response(JSON.stringify({ reply: textBlocks }), {
        status: 200,
        headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' },
      });
    } else {
      // Parse JSON for structured tabs
      const clean = textBlocks.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' },
      });
    }

  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error:`Server error: ${err.message}` }), { status:500, headers:{ 'Content-Type':'application/json' } });
  }
};

export const config = { path: '/api/ai-advisor' };