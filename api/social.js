// api/social.js

export default async function handler(req, res) {
    // Allow cross-origin requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Optionally:
    // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
    try {
      // Extract the ticker symbol from the query parameters
      const { symbol } = req.query;
  
      if (!symbol) {
        return res.status(400).json({ error: "Missing ticker symbol parameter" });
      }
  
      // Retrieve your FMP API key from environment variables
      const apiKey = process.env.FMP_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Missing FMP_API_KEY env var" });
      }
  
      // Build the FMP social sentiment URL.
      // For example: https://financialmodelingprep.com/api/v4/social-sentiment/AAPL?apikey=YOUR_API_KEY
      const url = `https://financialmodelingprep.com/api/v4/social-sentiment/${symbol.toUpperCase()}?apikey=${apiKey}`;
      console.log("Fetching from FMP URL:", url);
  
      // Fetch data from FMP
      const response = await fetch(url);
      const data = await response.json();
  
      // Check if the data is valid (FMP returns an array of data points)
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(500).json({
          error: "Error fetching social sentiment data from FMP",
          details: data,
        });
      }
  
      // Return the fetched data as JSON
      return res.json(data);
    } catch (error) {
      console.error("Error in /api/social route:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  