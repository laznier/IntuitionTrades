const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ticker = String(req.query.ticker || "").trim().toUpperCase();
  if (!ticker || !SYMBOL_PATTERN.test(ticker)) {
    return res.status(400).json({ error: "Please provide a valid ticker symbol (letters, numbers, . or -)." });
  }

  const quiverApiKey = process.env.QUIVERQUANT_API_KEY;
  if (!quiverApiKey) {
    return res.status(500).json({ error: "Missing QUIVERQUANT_API_KEY environment variable." });
  }

  try {
    const url = `https://api.quiverquant.com/beta/historical/congresstrading/${encodeURIComponent(ticker)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${quiverApiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const rawData = await response.json();
    if (!Array.isArray(rawData)) {
      return res.status(502).json({ error: "Unexpected response from QuiverQuant." });
    }

    return res.status(200).json({ data: rawData });
  } catch (error) {
    console.error("Error in /api/congress route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
  