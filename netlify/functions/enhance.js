// netlify/functions/enhance.js

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let { description, steps } = JSON.parse(event.body);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // call Gemini with API key in query string
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'You are an investment strategy enhancer. Improve the description and steps for clarity and professionalism. Return the enhanced description as the first line, followed by enhanced steps, one per line.',
                },
                { text: `Description: ${description}\nSteps: ${steps}` },
              ],
            },
          ],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
        }),
      }
    );

    const raw = await resp.text();
    if (!resp.ok) {
      // log the full body for debugging
      console.error('Gemini error:', resp.status, raw);
      throw new Error(`Gemini API ${resp.status}: ${raw}`);
    }

    const data = JSON.parse(raw);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const lines = text.split('\n').filter((l) => l.trim());

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        enhanced_description: lines[0] || description,
        enhanced_steps: lines
          .slice(1)
          .map((s, i) => ({ step_number: i + 1, description: s.trim() })),
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
