// netlify/functions/enhance.js
import fetch from 'node-fetch';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { description, steps } = JSON.parse(event.body);

  // Call the xAI API server-side (no CORS issue, key stays secret)
  const resp = await fetch('https://api.x.ai/v1/grok/enhance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`, 
    },
    body: JSON.stringify({ description, steps })
  });

  const data = await resp.json();

  return {
    statusCode: resp.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(data)
  };
}
