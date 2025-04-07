// social.js
const express = require('express');
const router = express.Router();

// Use the native fetch (Node 18+ includes global fetch; otherwise, you might need to import node-fetch)
router.get('/social', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'No "symbol" query parameter provided.' });
    }

    const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`StockTwits error [${response.status}]: ${errorText}`);
      return res.status(500).json({ error: `StockTwits error: ${response.status}` });
    }

    const data = await response.json();
    // Return the messages array or an empty array if none are present
    res.status(200).json(data.messages || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
