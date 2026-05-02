const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;
const CONTRACT_PATTERN = /^[A-Za-z0-9.-]{1,32}$/;

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return res.status(400).json({ error: "Please provide a valid stock symbol (letters, numbers, . or -)." });
  }

  const requireGreeks = req.query.require_greeks === "true" ? "true" : "false";
  const contract = req.query.contract ? String(req.query.contract).trim().toUpperCase() : "";
  if (contract && !CONTRACT_PATTERN.test(contract)) {
    return res.status(400).json({ error: "Contract contains unsupported characters." });
  }

  const datatype = String(req.query.datatype || "json").trim();
  if (datatype !== "json") {
    return res.status(400).json({ error: "Only json responses are supported." });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
  }

  try {
    let url = `https://www.alphavantage.co/query?function=REALTIME_OPTIONS&symbol=${encodeURIComponent(symbol)}&require_greeks=${requireGreeks}&datatype=${datatype}&apikey=${apiKey}`;
    if (contract) {
      url += `&contract=${encodeURIComponent(contract)}`;
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const data = await response.json();
    if (data.Note || data["Error Message"] || !Array.isArray(data.data)) {
      return res.status(502).json({
        error: "Error fetching options data from Alpha Vantage",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error in /api/liveoptions route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
  