export default async function handler(req, res) {
    // Allow CORS if needed.
    res.setHeader("Access-Control-Allow-Origin", "*");
  
    // Expect the search query in a query parameter, e.g. ?query=apple
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }
  
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing ALPHAVANTAGE_API_KEY env var" });
    }
  
    // Build the external API URL for symbol search.
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`;
    
    try {
      // Fetch data from Alpha Vantage
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        return res.status(response.status).json({ error: response.statusText });
      }
      const data = await response.json();
  
      // Check if bestMatches is available
      if (!data.bestMatches) {
        return res.status(500).json({
          error: "No bestMatches found in response",
          details: data
        });
      }
  
      // Return the fetched data (as JSON)
      return res.status(200).json(data);
    } catch (error) {
      console.error("Error in /api/ticker:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  