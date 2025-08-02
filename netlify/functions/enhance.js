// netlify/functions/enhance.js
import { GoogleAuth } from 'google-auth-library';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { description, steps } = JSON.parse(event.body);

    // 1) Initialize Google Auth client using the service account key
    const auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();

    // 2) Call the Gemini generateContent endpoint
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
                text: 'You are an investment strategy enhancer. Improve the description and steps for clarity and professionalism.',
              },
              { text: `Description: ${description}\nSteps: ${steps}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      },
    });

    const data = aiResponse.data;

    // 3) Extract and structure the output
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const [firstLine, ...rest] = rawText.split('\n');
    const enhancedDescription = firstLine.trim();
    const enhancedSteps = rest.map((line, i) => ({
      step_number: i + 1,
      description: line.trim(),
    }));

    // 4) Return with CORS headers
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
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
}
