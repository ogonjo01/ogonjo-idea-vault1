// ESM: Entry-type File ― ES Module
import { GoogleAuth } from 'google-auth-library';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { description, steps } = JSON.parse(event.body);

  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GEMINI_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GEMINI_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken())?.token;

  const resp = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "You are an investment strategy enhancer. ..." },
              { text: `Description: ${description}\nSteps: ${steps}` },
            ],
          },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    }
  );

  const parsed = await resp.json();
  const lines = parsed.candidates?.[0]?.content?.parts?.[0]?.text
    .split('\n')
    .filter(l => l.trim());

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://ogonjo.com",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify({
      enhanced_description: lines[0] || description,
      enhanced_steps: lines.slice(1).map((s, i) => ({
        step_number: i + 1,
        description: s.trim(),
      })),
    }),
  };
}
