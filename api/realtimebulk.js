// api/realtimebulk.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Optionally, add:
  // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    // 1. Grab the symbols from the query string, e.g. /api/realtimebulk?symbol=MSFT,AAPL,IBM
    const symbol = req.query.symbol;
    if (!symbol) {
      return res
        .status(400)
        .json({ error: "Please provide one or more stock symbols (e.g. ?symbol=MSFT,AAPL,IBM)" });
    }

    // 2. Use your hidden API key from environment variables
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
    }

    // 3. Build the Alpha Vantage URL for realtime bulk quotes
    const url = `https://www.alphavantage.co/query?function=REALTIME_BULK_QUOTES&symbol=${symbol}&apikey=${apiKey}`;

    // 4. Fetch data from Alpha Vantage
    const response = await fetch(url);
    const data = await response.json();

    // 5. Check if the data is valid
    if (!data.data) {
      return res.status(500).json({
        error: "Error fetching realtime bulk quotes data from Alpha Vantage",
        details: data,
      });
    }

    // 6. Return the data
    return res.json(data);
  } catch (error) {
    console.error("Error in /api/realtimebulk route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
