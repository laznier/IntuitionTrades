const express = require('express');
const cors = require('cors');
// For Node versions earlier than 18, install node-fetch
const fetch = require('node-fetch');

const app = express();

// Enable CORS for all routes.
app.use(cors());

// Proxy endpoint: fetch StockTwits data for a given symbol.
app.get('/api/social', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol query parameter is required' });
    }
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(500).json({ error: 'Error fetching data from StockTwits' });
    }
    const data = await response.json();
    // Return only the messages array so the client can process it.
    res.json(data.messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Social API proxy listening on port ${PORT}`);
});
