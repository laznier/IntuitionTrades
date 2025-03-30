// If using Next.js, place this in pages/api/topcongress.js
// If using a standard Express app, adapt to an Express route.

export default async function handler(req, res) {
    // Allow cross-origin requests (optional)
    res.setHeader("Access-Control-Allow-Origin", "*");
  
    try {
      const quiverApiKey = process.env.QUIVERQUANT_API_KEY;
      if (!quiverApiKey) {
        return res.status(500).json({
          error: "Missing QUIVERQUANT_API_KEY environment variable."
        });
      }
  
      // QuiverQuant bulk endpoint for congressional trading
      const url = "https://api.quiverquant.com/beta/bulk/congresstrading";
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
  
      // QuiverQuant returns a raw array of trade objects
      const rawData = await response.json();
  
      // Wrap it in { data: ... } for consistency
      return res.status(200).json({ data: rawData });
    } catch (error) {
      console.error("Error in /api/topcongress route:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  