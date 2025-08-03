// netlify/functions/enhance.js

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { description = '', steps = '' } = JSON.parse(event.body);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

   const prompt = `
You are a top-tier business strategist and educator writing high-value content for professionals. 

Your task is to take a short draft consisting of a description and steps — and expand it into a complete, 15–20 minute read. Your response should follow this structure:

1. Begin with an **engaging, well-written summary** that sets the tone and purpose.
2. Rewrite and **expand the description** into 3–4 full paragraphs. Make it informative, inspiring, and persuasive.
3. Rewrite each step into a detailed, numbered section — each step should include:
   - A clear explanation.
   - Practical advice or how-to guidance.
   - (If appropriate) An example or scenario.
   - Make each step roughly 150–200 words.
4. Avoid repetition and fluff. Write with clarity, flow, and depth.

Now, expand the following:

Description:
${description}

Steps:
${typeof steps === 'string' ? steps : JSON.stringify(steps)}
`;


    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt.trim() }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        }),
      }
    );

    const raw = await resp.text();
    if (!resp.ok) {
      console.error('Gemini error:', resp.status, raw);
      throw new Error(`Gemini API ${resp.status}: ${raw}`);
    }

    const data = JSON.parse(raw);
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const lines = aiText.split('\n').map((line) => line.trim()).filter(Boolean);

    // Heuristically separate description from steps
    const enhancedDescription = lines[0];
    const enhancedSteps = lines.slice(1).map((stepText, i) => ({
      step_number: i + 1,
      description: stepText.replace(/^\d+\.\s*/, ''), // strip leading numbering
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        enhanced_description: enhancedDescription,
        enhanced_steps: enhancedSteps,
      }),
    };
  } catch (err) {
    console.error('Enhance failed:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message }),
    };
  }
}
