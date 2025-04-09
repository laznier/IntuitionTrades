// /api/liveoptions.js

export default async function handler(req, res) {
    // Enable CORS so requests from your frontend (or other domains) are allowed.
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Uncomment the below if needed:
    // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
    try {
      // Get the required symbol parameter.
      const symbol = req.query.symbol;
      if (!symbol) {
        return res.status(400).json({ error: "Please provide a stock symbol (e.g. ?symbol=IBM)" });
      }
  
      // Get optional parameters.
      // require_greeks: flag to include greeks & IV fields.
      const requireGreeks = req.query.require_greeks === "true" ? "true" : "false";
      // contract: if a specific US options contract is desired.
      const contract = req.query.contract;
      // datatype: defaults to "json", but "csv" is also allowed.
      const datatype = req.query.datatype || "json";
  
      // Retrieve the Alpha Vantage API key from environment variables.
      const apiKey = process.env.ALPHA_VANTAGE_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
      }
  
      // Build the API request URL. Note: The required function is REALTIME_OPTIONS.
      let url = `https://www.alphavantage.co/query?function=REALTIME_OPTIONS&symbol=${symbol}&require_greeks=${requireGreeks}&datatype=${datatype}&apikey=${apiKey}`;
      
      // Include the contract parameter if provided.
      if (contract) {
        url += `&contract=${contract}`;
      }
  
      // Fetch the options data from Alpha Vantage.
      const response = await fetch(url);
      const data = await response.json();
  
      // Check for API errors; sometimes the API returns a "Note" or "Error Message"
      if (data.Note || data["Error Message"]) {
        return res.status(500).json({
          error: "Error fetching options data from Alpha Vantage",
          details: data
        });
      }
      
      // Basic check: Expect the options chain in the "data" property.
      if (!data.data || !Array.isArray(data.data)) {
        return res.status(500).json({
          error: "Invalid response format from Alpha Vantage",
          details: data
        });
      }
  
      // Return the valid JSON response to the client.
      return res.json(data);
    } catch (error) {
      console.error("Error in /api/liveoptions route:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  