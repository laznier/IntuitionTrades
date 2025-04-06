// social-proxy.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // If using Node <18

const app = express();

// Enable CORS on our endpoint so browsers can call it
app.use(cors());

app.get('/api/social', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol query parameter is required' });
    }
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: `Error from StockTwits: ${response.status} ${errorText}` });
    }
    const data = await response.json();
    // Send only the messages data back to the client.
    res.json(data.messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
