const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Enable CORS for all routes.
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
      // Log details to help diagnose the error.
      const errorText = await response.text();
      console.error(`Error from StockTwits [${response.status}]: ${errorText}`);
      return res.status(500).json({ error: `Error fetching data from StockTwits: ${response.status}` });
    }
    const data = await response.json();
    // Return only the messages array so the client can process it.
    res.json(data.messages);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Social API proxy listening on port ${PORT}`);
});
