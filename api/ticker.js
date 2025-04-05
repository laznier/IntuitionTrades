// api/ticker.js

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Uncomment if needed:
    // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
    try {
      // 1. Grab the query parameter from the URL, e.g. /api/ticker?query=SAIC
      const query = req.query.query;
      if (!query) {
        return res.status(400).json({ error: "Please provide a query parameter (e.g. ?query=SAIC)" });
      }
  
      // 2. Use your hidden API key from environment variables
      const apiKey = process.env.ALPHA_VANTAGE_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
      }
  
      // 3. Build the Alpha Vantage URL for the SYMBOL_SEARCH function
      const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;
  
      // 4. Fetch data from Alpha Vantage
      const response = await fetch(url);
      const data = await response.json();
  
      // 5. Check if the data is valid (i.e. contains bestMatches)
      if (!data.bestMatches) {
        return res.status(500).json({
          error: "Error fetching ticker data from Alpha Vantage",
          details: data,
        });
      }
  
      // 6. Return the data
      return res.json(data);
    } catch (error) {
      console.error("Error in /api/ticker route:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  