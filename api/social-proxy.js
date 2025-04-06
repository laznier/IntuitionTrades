// social-proxy.js: The Express router that fetches from StockTwits
const { Router } = require('express');
const fetch = require('node-fetch');

const router = Router();

// GET /social?symbol=XYZ
router.get('/social', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'No "symbol" query parameter' });
    }

    const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`StockTwits error [${response.status}]: ${errorText}`);
      return res.status(500).json({ error: `StockTwits error: ${response.status}` });
    }

    const data = await response.json();
    // data.messages is typically an array
    return res.status(200).json(data.messages || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
