const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();
  if (!symbol || !from || !to || !SYMBOL_PATTERN.test(symbol) || !DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return res.status(400).json({ error: "Please provide a valid symbol plus from and to dates in YYYY-MM-DD format." });
  }

  const apiKey = process.env.FINNHUB_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing FINNHUB_KEY env var" });
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const data = await response.json();
    if (!Array.isArray(data.data) || data.data.length === 0) {
      return res.status(502).json({ error: "No insider sentiment data available." });
    }

    const sentimentData = data.data;
    const n = sentimentData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    sentimentData.forEach((point, index) => {
      const x = index + 1;
      const y = Number.parseFloat(point.mspr);
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return res.status(200).json({ data: sentimentData, trend: slope });
  } catch (error) {
    console.error("Error in /api/insiderscore route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
  