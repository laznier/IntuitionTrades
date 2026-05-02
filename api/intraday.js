const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;
const INTERVALS = new Set(["1min", "5min", "15min", "30min", "60min"]);

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

  const interval = String(req.query.interval || "5min").trim();
  if (!INTERVALS.has(interval)) {
    return res.status(400).json({ error: "Interval must be one of 1min, 5min, 15min, 30min, or 60min." });
  }

  const outputsize = String(req.query.outputsize || "compact").trim();
  if (outputsize !== "compact" && outputsize !== "full") {
    return res.status(400).json({ error: "Outputsize must be compact or full." });
  }

  const month = req.query.month ? String(req.query.month).trim() : "";
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "Month must be in YYYY-MM format." });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
  }

  try {
    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(symbol)}&interval=${interval}&apikey=${apiKey}&entitlement=delayed`;
    if (month) {
      url += `&month=${month}&outputsize=full`;
    } else {
      url += `&outputsize=${outputsize}`;
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const data = await response.json();
    const timeSeriesKey = `Time Series (${interval})`;
    if (!data[timeSeriesKey]) {
      return res.status(502).json({
        error: "Error fetching intraday data from Alpha Vantage",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in /api/intraday route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
