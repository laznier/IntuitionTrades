const SYMBOL_PATTERN = /^[A-Za-z0-9.,-]{1,60}$/;
const TOPIC_PATTERN = /^[A-Za-z0-9,_-]{1,80}$/;

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbol = req.query.symbol ? String(req.query.symbol).trim().toUpperCase() : "";
  if (symbol && !SYMBOL_PATTERN.test(symbol)) {
    return res.status(400).json({ error: "Symbol contains unsupported characters." });
  }

  const topic = req.query.topic ? String(req.query.topic).trim() : "";
  if (topic && !TOPIC_PATTERN.test(topic)) {
    return res.status(400).json({ error: "Topic contains unsupported characters." });
  }

  const parsedLimit = Number.parseInt(String(req.query.limit || "20"), 10);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    return res.status(400).json({ error: "Limit must be an integer between 1 and 100." });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
  }

  try {
    let url = "https://www.alphavantage.co/query?function=NEWS_SENTIMENT";
    if (symbol) {
      url += `&tickers=${encodeURIComponent(symbol)}`;
    }
    if (topic) {
      url += `&topics=${encodeURIComponent(topic)}`;
    }
    url += `&limit=${parsedLimit}&apikey=${apiKey}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const data = await response.json();
    if (!data.feed) {
      return res.status(502).json({
        error: "Error fetching news sentiment data from Alpha Vantage",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in /api/sentiment route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
