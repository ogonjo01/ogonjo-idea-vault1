import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAILERLITE_GROUP_ID = '161087138063976399';

// Add any variants you need here (www, localhost dev ports, etc.)
const allowedOrigins = [
  'https://ogonjo.com',
  'https://www.ogonjo.com',
  'http://172.31.32.1:8082',
  'http://localhost:5173'
];

// DEBUG logger for CORS troubleshooting — keep while testing
app.use((req, res, next) => {
  console.log(`[CORS DEBUG] ${new Date().toISOString()} ${req.method} ${req.path} Origin:`, req.headers.origin);
  next();
});

// Use cors middleware with origin validation (used for normal requests)
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server (curl/postman)
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Defensively echo CORS headers and handle OPTIONS preflight *early*
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    // echo the exact origin (required for credentialed requests; also clear)
    res.setHeader('Access-Control-Allow-Origin', origin);
    // res.setHeader('Access-Control-Allow-Credentials', 'true'); // enable if you use credentials
  }
  // always present these so the browser sees them on OPTIONS replies
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    // short-circuit preflight — return 204 No Content
    return res.status(204).end();
  }
  next();
});

// Your route
app.post('/subscribe', async (req, res) => {
  const { email, resubscribe } = req.body;
  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!apiKey) {
    console.error('MailerLite API key not set in environment variables.');
    return res.status(500).json({ message: 'Server configuration error: API key missing.' });
  }

  try {
    const response = await fetch(`https://api.mailerlite.com/api/v2/groups/${MAILERLITE_GROUP_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': apiKey
      },
      body: JSON.stringify({ email, resubscribe })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MailerLite API error:', data);
      return res.status(response.status).json(data);
    }

    res.status(200).json({ message: 'Successfully subscribed!' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
