// netlify/functions/enhance.cjs
'use strict';

const fetch = require('node-fetch'); // or global fetch if supported
const { GoogleAuth } = require('google-auth-library');

exports.handler = async function enhanceHandler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const { description, steps } = JSON.parse(event.body);

  console.log('Payload:', { description, steps });
  console.log('Env vars:',
    !!process.env.GEMINI_SERVICE_ACCOUNT_EMAIL,
    !!process.env.GEMINI_SERVICE_ACCOUNT_PRIVATE_KEY?.length
  );

  let accessToken;
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GEMINI_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GEMINI_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    accessToken = tokenResponse?.token;

    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

  } catch (err) {
    console.error('Auth Error:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: 'Auth failure: ' + err.message,
      }),
    };
  }

  let textResponse;
  try {
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'You are an investment strategy enhancer. Improve description & steps for clarity & professionalism. Return enhanced description as first line, then steps — one per line.',
                },
                {
                  text: `Description: ${description}\nSteps: ${steps}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const raw = await resp.text();
    console.log('Gemini status:', resp.status, raw);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (pe) {
      throw new Error('Invalid JSON from Gemini: ' + pe.message);
    }

    if (!resp.ok) {
      const errorDetail = parsed.error?.message || JSON.stringify(parsed);
      throw new Error(`Gen API returned ${resp.status}: ${errorDetail}`);
    }

    textResponse =
      parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.error('Gen API Error:', err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        details: 'GenAPI failure: ' + err.message,
      }),
    };
  }

  const lines = textResponse.split('\n').filter((l) => l.trim().length > 0);
  const enhancedDescription = lines[0] || description;
  const enhancedSteps =
    lines.slice(1).map((step, i) => ({
      step_number: i + 1,
      description: step.trim(),
    })) ||
    steps
      .split('\n')
      .filter((l) => l.trim())
      .map((step, i) => ({
        step_number: i + 1,
        description: step.trim(),
      }));

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://ogonjo.com',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify({
      enhanced_description: enhancedDescription,
      enhanced_steps: enhancedSteps,
    }),
  };
};
