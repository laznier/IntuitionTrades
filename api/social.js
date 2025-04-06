// file: /pages/api/social.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Missing "symbol" query parameter' });
    }

    // Request data from StockTwits
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`StockTwits error [${response.status}]: ${errorText}`);
      return res
        .status(500)
        .json({ error: `Failed to fetch data: ${response.status} - ${errorText}` });
    }

    const data = await response.json();
    // `data.messages` is an array of message objects if StockTwits returns data
    if (!data.messages || !Array.isArray(data.messages)) {
      return res.status(200).json([]); // Return an empty array if no messages
    }

    // Return the array of messages
    return res.status(200).json(data.messages);
  } catch (err) {
    console.error('API error in /api/social:', err);
    return res.status(500).json({ error: err.message });
  }
}
