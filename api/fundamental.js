// api/fundamental.js

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    // If needed:
    // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
    try {
      // 1. Parse the symbol from the query string
      const symbol = req.query.symbol;
      if (!symbol) {
        return res.status(400).json({
          error: "Please provide a stock symbol (e.g. ?symbol=TSLA)",
        });
      }
  
      // 2. Fetch the API key
      const apiKey = process.env.ALPHA_VANTAGE_KEY;
      if (!apiKey) {
        return res
          .status(500)
          .json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
      }
  
      // 3. Call the 'OVERVIEW' function
      const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`;
  
      // 4. Fetch data
      const response = await fetch(url);
      const data = await response.json();
  
      // 5. Check if the response has a 'Symbol' field (the correct way to validate OVERVIEW data)
      if (!data.Symbol) {
        return res.status(500).json({
          error: "Error fetching fundamental data from Alpha Vantage",
          details: data,
        });
      }
  
      // 6. Return data
      return res.json(data);
  
    } catch (error) {
      console.error("Error in /api/fundamental route:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  