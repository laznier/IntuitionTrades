// file: api/social.js
// A minimal serverless route for Vercel using built-in fetch (Node 18+)

export default async function handler(req, res) {
  try {
    // Grab the query parameter: ?symbol=XYZ
    const { symbol } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Missing ?symbol=...' });
    }

    // Construct StockTwits URL
    const url = `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json`;

    // Use the built-in fetch in Node 18+ (no import from 'node-fetch')
    console.log(`[stocktwits] Fetching: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      // For instance, a 404 if the symbol is invalid
      const errorText = await response.text();
      console.error(`[stocktwits] Non-200 status: ${response.status}`, errorText);
      return res
        .status(500)
        .json({ error: `Failed fetch from StockTwits: ${response.status}` });
    }

    // Parse JSON
    const data = await response.json();

    // Typically, data.messages is an array of messages
    if (!data.messages || !Array.isArray(data.messages)) {
      // Return an empty array if no messages
      return res.status(200).json([]);
    }

    // Return the array of messages
    return res.status(200).json(data.messages);
  } catch (err) {
    // Catch any runtime error (network, etc.)
    console.error('[stocktwits] Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}
