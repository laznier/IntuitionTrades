// /api/intraday.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Optionally set additional CORS headers:
  // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    // Get symbol from query string
    const symbol = req.query.symbol;
    if (!symbol) {
      return res.status(400).json({ error: "Please provide a stock symbol (e.g. ?symbol=IBM)" });
    }
    // Use the provided interval or default to "5min"
    const interval = req.query.interval || "5min";
    // Use provided outputsize or default to "compact"
    const outputsize = req.query.outputsize || "compact";

    // Get your Alpha Vantage API key from env vars
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
    }

    // Build the URL. If a "month" parameter is provided, include it and force outputsize=full.
    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${apiKey}&entitlement=delayed`;
    if (req.query.month) {
      url += `&month=${req.query.month}&outputsize=full`;
    } else {
      url += `&outputsize=${outputsize}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    // Determine the key used in the returned JSON
    const timeSeriesKey = `Time Series (${interval})`;
    if (!data[timeSeriesKey]) {
      return res.status(500).json({
        error: "Error fetching intraday data from Alpha Vantage",
        details: data,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Error in /api/intraday route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
