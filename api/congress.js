import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { ticker } = req.query;
    const originTool = req.headers["x-tool-name"] || "unknown";
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!ticker) {
      return res.status(400).json({ error: "Missing ticker (?ticker=TSLA)" });
    }

    const quiverApiKey = process.env.QUIVERQUANT_API_KEY;
    if (!quiverApiKey) {
      return res.status(500).json({ error: "Missing QUIVERQUANT_API_KEY" });
    }

    // STEP 1: Verify token (if provided)
    let isPremium = false;
    if (token) {
      try {
        const decoded = jwt.decode(token); // Only decode (not verify) if using Google-issued tokens
        isPremium = decoded?.email && decoded?.hd; // or use your own `isPremium` field if set
      } catch (err) {
        console.warn("Invalid token, treating as basic user.");
      }
    }

    // STEP 2: Restrict premium-only tools for basic users
    const isPremiumTool = originTool === "top5"; // You can send this header only from premium tools

    if (!isPremium && isPremiumTool) {
      return res.status(403).json({
        error: "Access denied. This tool is restricted to premium users only."
      });
    }

    // STEP 3: Fetch from QuiverQuant
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

    const rawData = await response.json();
    return res.status(200).json({ data: rawData });

  } catch (error) {
    console.error("Error in /api/congress route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
