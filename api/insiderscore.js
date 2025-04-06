export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  
    try {
      const symbol = req.query.symbol;
      const from = req.query.from;
      const to = req.query.to;
      if (!symbol || !from || !to) {
        return res.status(400).json({ error: "Please provide symbol, from, and to query parameters." });
      }
  
      const apiKey = process.env.FINNHUB_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Missing FINNHUB_KEY env var" });
      }
  
      // Build the Finnhub API URL.
      const url = `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
  
      if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
        return res.status(500).json({ error: "No insider sentiment data available." });
      }
  
      // Compute linear regression (slope) on the mspr values.
      const sentimentData = data.data;
      const n = sentimentData.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      sentimentData.forEach((point, index) => {
        const x = index + 1; // Use sequential numbering for each month
        const y = parseFloat(point.mspr);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
      // Return both the raw sentiment data and the computed trend slope.
      return res.json({ data: sentimentData, trend: slope });
    } catch (error) {
      console.error("Error in /api/insiderscore route:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  