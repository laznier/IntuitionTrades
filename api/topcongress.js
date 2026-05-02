export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const quiverApiKey = process.env.QUIVERQUANT_API_KEY;
  if (!quiverApiKey) {
    return res.status(500).json({ error: "Missing QUIVERQUANT_API_KEY environment variable." });
  }

  try {
    const response = await fetch("https://api.quiverquant.com/beta/bulk/congresstrading", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${quiverApiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const rawData = await response.json();
    if (!Array.isArray(rawData)) {
      return res.status(502).json({ error: "Unexpected response from QuiverQuant." });
    }

    return res.status(200).json({ data: rawData });
  } catch (error) {
    console.error("Error in /api/topcongress route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
