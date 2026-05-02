// api/ticker.js

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const query = String(req.query.query || "").trim();
    if (!query || query.length < 1 || query.length > 30) {
      return res.status(400).json({
        error: "Please provide a query parameter between 1 and 30 characters.",
      });
    }

    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
    }

    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return res.status(502).json({ error: "Ticker lookup provider request failed" });
    }

    const data = await response.json();
    if (!Array.isArray(data.bestMatches)) {
      return res.status(502).json({
        error: "Error fetching ticker data from Alpha Vantage",
        details: data,
      });
    }

    return res.json({
      bestMatches: data.bestMatches.slice(0, 8),
    });
  } catch (error) {
    console.error("Error in /api/ticker route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
  