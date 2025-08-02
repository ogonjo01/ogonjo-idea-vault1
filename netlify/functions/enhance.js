const { GoogleAuth } = require('google-auth-library');

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { description, steps } = JSON.parse(event.body);

  console.log('Received payload:', { description, steps });
  console.log('Environment vars:', {
    emailSet: !!process.env.GEMINI_SERVICE_ACCOUNT_EMAIL,
    keySet: !!process.env.GEMINI_SERVICE_ACCOUNT_PRIVATE_KEY,
  });

  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GEMINI_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GEMINI_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken.token}`,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'You are an investment strategy enhancer. Improve the description and steps for clarity and professionalism. Return the enhanced description as the first line, followed by enhanced steps, one per line.' },
              { text: `Description: ${description}\nSteps: ${steps}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    const rawResponse = await resp.text();
    console.log('Raw Gemini Response:', resp.status, rawResponse);

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError, rawResponse);
      throw new Error(`Invalid JSON response: ${rawResponse}`);
    }

    if (!resp.ok) {
      throw new Error(`Gemini API error: ${resp.status} - ${JSON.stringify(data)}`);
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const lines = textResponse.split('\n').filter(line => line.trim().length > 0);

    return {
      statusCode: resp.status,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        enhanced_description: lines[0] || description,
        enhanced_steps: lines.slice(1).map((step, index) => ({
          step_number: index + 1,
          description: step.trim(),
        })) || steps.split('\n').filter(line => line.trim().length > 0).map((step, index) => ({
          step_number: index + 1,
          description: step.trim(),
        })),
      }),
    };
  } catch (error) {
    console.error('Error in enhance function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com',
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}