// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAILERLITE_GROUP_ID = '161087138063976399';

const allowedOrigins = [
  'https://ogonjo.com',
  'https://www.ogonjo.com',
  'http://172.31.32.1:8082',
  'http://localhost:5173',
];

// immediate startup log
console.log('==> APP STARTING - NODE ENV:', process.env.NODE_ENV, 'PORT=', PORT);

// defensive error logging so we see crashes in the logs
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err && (err.stack || err.message || err));
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION', reason);
});

// Guaranteed preflight handler — must run before body parsing
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return res.status(204).end();
});

app.use(express.json());

app.post('/subscribe', async (req, res) => {
  console.log('[subscribe] request received');
  const { email, resubscribe } = req.body;
  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    console.error('[subscribe] MAILERLITE_API_KEY missing');
    return res.status(500).json({ message: 'Server configuration error: API key missing.' });
  }
  try {
    const resp = await fetch(
      `https://api.mailerlite.com/api/v2/groups/${MAILERLITE_GROUP_ID}/subscribers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-MailerLite-ApiKey': apiKey },
        body: JSON.stringify({ email, resubscribe })
      }
    );
    const data = await resp.json();
    if (!resp.ok) {
      console.error('[subscribe] MailerLite error', data);
      return res.status(resp.status).json(data);
    }
    return res.status(200).json({ message: 'Successfully subscribed!' });
  } catch (err) {
    console.error('[subscribe] server error', err && (err.stack || err.message || err));
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// bind to 0.0.0.0 so Railway can reach it
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==> Server listening on 0.0.0.0:${PORT}`);
});
