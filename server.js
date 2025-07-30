import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/subscribe', async (req, res) => {
  const { email, resubscribe } = req.body;
  const apiKey = process.env.MAILERLITE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: 'MailerLite API key not set' });
  }

  try {
    const response = await fetch('https://api.mailerlite.com/api/v2/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MailerLite-ApiKey': apiKey
      },
      body: JSON.stringify({ email, resubscribe })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MailerLite error:', data);
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
