// api/sentiment.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  // If needed, also:
  // res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  try {
    // Grab the symbol and topic from the query string.
    const { symbol, topic } = req.query;
    if (!symbol && !topic) {
      return res.status(400).json({
        error:
          "Please provide a stock symbol (e.g. ?symbol=TSLA) or a news topic (e.g. ?topic=finance)",
      });
    }

    // Use your hidden API key
    const apiKey = process.env.ALPHA_VANTAGE_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
    }

    // Build the Alpha Vantage URL.
    // Start with the required function.
    let url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT`;
    
    // If a symbol is provided, add it as tickers.
    if (symbol) {
      url += `&tickers=${symbol}`;
    }
    // If a topic is provided, add it as topics.
    if (topic) {
      url += `&topics=${topic}`;
    }
    
    // Append your API key.
    url += `&apikey=${apiKey}`;

    // Fetch data from Alpha Vantage.
    const response = await fetch(url);
    const data = await response.json();

    // Check if the data is valid.
    if (!data.feed) {
      return res.status(500).json({
        error: "Error fetching news sentiment data from Alpha Vantage",
        details: data,
      });
    }

    // Return the fetched data.
    return res.json(data);
  } catch (error) {
    console.error("Error in /api/sentiment route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
