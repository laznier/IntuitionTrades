// api/sentiment.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // If needed:
  // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  try {
    const { symbol, topic, limit } = req.query;

    // Use your hidden API key
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
    }

    // Build the Alpha Vantage URL
    let url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT`;

    // If a symbol is provided, add it as tickers
    if (symbol) {
      url += `&tickers=${symbol}`;
    }

    // If a topic is provided, add it as topics
    if (topic) {
      url += `&topics=${topic}`;
    }

    // If neither symbol nor topic was provided, 
    // we do NOT throw an error anymore — it fetches "All News"
    // (Alpha Vantage will return the latest news if no tickers/topics are specified).

    // Apply limit if provided, otherwise default to 20
    const finalLimit = limit ? parseInt(limit, 10) : 20;
    url += `&limit=${finalLimit}`;

    // Append your API key
    url += `&apikey=${apiKey}`;

    // Fetch data from Alpha Vantage
    const response = await fetch(url);
    const data = await response.json();

    // Check if the data is valid
    if (!data.feed) {
      return res.status(500).json({
        error: "Error fetching news sentiment data from Alpha Vantage",
        details: data,
      });
    }

    // Return the fetched data
    return res.json(data);
  } catch (error) {
    console.error("Error in /api/sentiment route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
