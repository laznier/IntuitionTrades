// /api/social.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) {
    res.status(400).json({ error: 'Symbol query parameter is required' });
    return;
  }
  try {
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from StockTwits [${response.status}]: ${errorText}`);
      res.status(500).json({ error: `Error fetching data from StockTwits: ${response.status}` });
      return;
    }
    const data = await response.json();
    res.status(200).json(data.messages);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
}
