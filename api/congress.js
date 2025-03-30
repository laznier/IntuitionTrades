export default async function handler(req, res) {
    // Allow cross-origin requests
    res.setHeader("Access-Control-Allow-Origin", "*");
  
    try {
      const { ticker } = req.query;
      if (!ticker) {
        return res.status(400).json({
          error: "Please provide a ticker symbol (e.g. ?ticker=TSLA)"
        });
      }
  
      const quiverApiKey = process.env.QUIVERQUANT_API_KEY;
      if (!quiverApiKey) {
        return res.status(500).json({
          error: "Missing QUIVERQUANT_API_KEY environment variable."
        });
      }
  
      // Build the QuiverQuant URL for congressional trading data
      const url = `https://api.quiverquant.com/beta/historical/congresstrading/${encodeURIComponent(ticker)}`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${quiverApiKey}`
        }
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: "Error fetching data from QuiverQuant",
          details: errorText
        });
      }
  
      // Parse the JSON response (a raw array)
      const rawData = await response.json();
  
      // Wrap the array in an object with a data property for consistency
      return res.status(200).json({ data: rawData });
    } catch (error) {
      console.error("Error in /api/congress route:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  