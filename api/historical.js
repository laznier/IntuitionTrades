const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return res.status(400).json({
      error: "Please provide a valid stock symbol (letters, numbers, . or -).",
    });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
  }

  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const data = await response.json();
    if (!data["Time Series (Daily)"]) {
      return res.status(502).json({
        error: "Error fetching historical data from Alpha Vantage",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in /api/historical route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
