// api/intraday.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // Optionally, add:
  // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    // 1. Grab required query parameters
    const symbol = req.query.symbol;
    if (!symbol) {
      return res
        .status(400)
        .json({ error: "Please provide a stock symbol (e.g. ?symbol=IBM)" });
    }
    const interval = req.query.interval || "5min";
    // If the user provides a month (format: YYYY-MM), then use full output.
    const month = req.query.month;
    let outputsize = req.query.outputsize;
    if (month) {
      outputsize = "full";
    } else {
      outputsize = outputsize || "compact";
    }
    
    // 2. Get your API key from the environment
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
    }
    
    // 3. Build the Alpha Vantage URL
    let url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${apiKey}`;
    if (month) {
      url += `&month=${month}&outputsize=full`;
    } else {
      url += `&outputsize=${outputsize}`;
    }
    
    // 4. Fetch data from Alpha Vantage
    const response = await fetch(url);
    const data = await response.json();
    
    // 5. Determine the key for the time series data based on the interval
    const timeSeriesKey = `Time Series (${interval})`;
    if (!data[timeSeriesKey]) {
      return res.status(500).json({
        error: "Error fetching intraday data from Alpha Vantage",
        details: data,
      });
    }
    
    // 6. Return the data
    return res.json(data);
  } catch (error) {
    console.error("Error in /api/intraday route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
