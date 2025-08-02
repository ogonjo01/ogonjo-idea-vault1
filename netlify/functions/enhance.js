// netlify/functions/enhance.js

import { GoogleAuth } from 'google-auth-library';

export async function handler(event) {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (parseErr) {
    console.error('Bad request JSON:', parseErr);
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Bad Request', details: parseErr.message }),
    };
  }

  const { description, steps } = payload;

  try {
    // Auth setup
    const auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();

    // Call Gemini
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    const aiResponse = await client.request({
      url,
      method: 'POST',
      data: {
        contents: [
          {
            parts: [
              {
                text:
                  'You are an investment strategy enhancer. Improve the description and steps for clarity and professionalism.',
              },
              { text: `Description: ${description}\nSteps: ${steps}` },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      },
    });

    const data = aiResponse.data;
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const [firstLine, ...restLines] = rawText.split('\n');
    const enhancedDescription = firstLine.trim();
    const enhancedSteps = restLines.map((line, i) => ({
      step_number: i + 1,
      description: line.trim(),
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
    console.error('Enhance function error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}
