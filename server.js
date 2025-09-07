import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const MAILERLITE_GROUP_ID = '161087138063976399';

// Configure CORS to explicitly allow both the live and local origins.
const allowedOrigins = ['https://ogonjo.com', 'http://172.31.32.1:8082'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
      callback(new Error(msg), false);
    }
  }
}));

app.use(express.json());

// Explicitly handle the OPTIONS preflight request.
app.options('/subscribe', cors());

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
