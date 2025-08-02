// netlify/functions/enhance.js

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { description, steps } = JSON.parse(event.body);

  try {
    // Note: we’re using the API key via query param, not a Bearer header
    const apiKey = encodeURIComponent(process.env.GEMINI_API_KEY);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'You are an investment strategy enhancer. Improve the description and steps for clarity and professionalism.'
              },
              {
                text: `Description: ${description}\nSteps: ${steps}`
              }
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await resp.json();
    console.log('Gemini Response:', resp.status, data);

    if (!resp.ok) {
      throw new Error(`Gemini API error: ${resp.status} – ${JSON.stringify(data)}`);
    }

    // Parse out your enhanced description & steps
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const [firstLine, ...restLines] = raw.split('\n');
    const enhancedDescription = firstLine.trim();
    const enhancedSteps = restLines.map((line, i) => ({
      step_number: i + 1,
      description: line.trim(),
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com', // or '*' 
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ enhanced_description: enhancedDescription, enhanced_steps: enhancedSteps }),
    };
  } catch (error) {
    console.error('Error in enhance function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
    };
  }
}
