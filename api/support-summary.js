const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;
const TIMEFRAMES = {
  short: { label: "Short term", periodMonths: 4 },
  medium: { label: "Medium term", periodMonths: 12 },
  long: { label: "Long term", periodMonths: 24 },
};
const MAX_SYMBOLS = 8;

function normalizeSymbols(input) {
  const unique = [];
  const seen = new Set();

  for (const candidate of String(input || "").split(/[\s,]+/)) {
    const symbol = candidate.trim().toUpperCase();
    if (!symbol || seen.has(symbol)) {
      continue;
    }

    if (!SYMBOL_PATTERN.test(symbol)) {
      throw new Error(`Invalid symbol: ${symbol}`);
    }

    seen.add(symbol);
    unique.push(symbol);
  }

  return unique.slice(0, MAX_SYMBOLS);
}

function parseNumber(input) {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  const cleaned = String(input || "")
    .trim()
    .replace(/[$,%\s,]/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchHistoricalSeries(symbol, alphaKey) {
  const response = await fetch(
    `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${alphaKey}`,
    {
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    throw new Error(`Historical request failed for ${symbol}.`);
  }

  const payload = await response.json();
  const timeSeries = payload["Time Series (Daily)"];
  if (!timeSeries) {
    throw new Error(`No daily price series returned for ${symbol}.`);
  }

  return timeSeries;
}

function processHistoricalData(timeSeries, periodMonths) {
  const entries = Object.entries(timeSeries)
    .map(([dateText, values]) => ({
      date: new Date(dateText),
      close: parseNumber(values["5. adjusted close"]) ?? parseNumber(values["4. close"]) ?? 0,
    }))
    .sort((left, right) => left.date - right.date);

  const endDate = entries[entries.length - 1]?.date;
  if (!endDate) {
    return [];
  }

  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - periodMonths);
  return entries.filter((entry) => entry.date >= startDate && entry.date <= endDate);
}

function detectSupportZones(data) {
  const bins = new Map();
  const bucketSize = 0.5;

  for (let index = 1; index < data.length - 1; index += 1) {
    const previous = data[index - 1].close;
    const current = data[index].close;
    const next = data[index + 1].close;
    if (current < previous && current < next) {
      const bucket = Math.round(current / bucketSize) * bucketSize;
      if (!bins.has(bucket)) {
        bins.set(bucket, []);
      }

      bins.get(bucket).push(data[index]);
    }
  }

  return Array.from(bins.entries())
    .filter(([, touches]) => touches.length >= 2)
    .map(([price, touches]) => ({
      price,
      touches: touches.length,
      recentDate: touches[touches.length - 1].date,
    }));
}

function scoreSupportMatch(currentPrice, support, slope) {
  const proximity = Math.abs(currentPrice - support.price) / support.price;
  const distanceScore = Math.max(0, 1 - proximity / 0.05);
  const touchScore = Math.min(1, support.touches / 4);
  const recentBonus = new Date() - support.recentDate < 90 * 86400000 ? 1 : 0;
  const directionBonus = slope < 0 ? 1 : 0;
  const raw = 0.6 * distanceScore + 0.2 * touchScore + 0.1 * recentBonus + 0.1 * directionBonus;
  return Math.round(100 * Math.max(0.01, Math.min(0.99, raw)));
}

function buildSupportCandidate(symbol, data) {
  if (data.length < 50) {
    return {
      symbol,
      score: 0,
      latestClose: data[data.length - 1]?.close ?? 0,
      supportPrice: null,
      touches: 0,
      distancePct: null,
      recentDate: null,
      summary: "Not enough price history was available to build a support scan.",
    };
  }

  const slopeIndex = Math.max(data.length - 10, 0);
  const slope = data[data.length - 1].close - data[slopeIndex].close;
  const supports = detectSupportZones(data);
  const latestClose = data[data.length - 1].close;
  const nearbySupports = supports
    .filter((support) => Math.abs(latestClose - support.price) / support.price <= 0.05)
    .sort((left, right) => Math.abs(latestClose - left.price) - Math.abs(latestClose - right.price));

  if (nearbySupports.length === 0) {
    return {
      symbol,
      score: 0,
      latestClose,
      supportPrice: null,
      touches: 0,
      distancePct: null,
      recentDate: null,
      summary: "No nearby support zone was detected within five percent of the latest close.",
    };
  }

  const best = nearbySupports[0];
  return {
    symbol,
    score: scoreSupportMatch(latestClose, best, slope),
    latestClose,
    supportPrice: best.price,
    touches: best.touches,
    distancePct: (Math.abs(latestClose - best.price) / best.price) * 100,
    recentDate: formatDate(best.recentDate),
    summary: `Nearest support sits around $${best.price.toFixed(2)} with ${best.touches} qualifying touches.`,
  };
}

export default async function handler(req, res) {
  res.setHeader("Allow", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const timeframe = String(req.query.timeframe || "medium").trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(TIMEFRAMES, timeframe)) {
    return res.status(400).json({ error: "Timeframe must be short, medium, or long." });
  }

  let symbols;
  try {
    symbols = normalizeSymbols(req.query.symbols);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid symbols." });
  }

  if (symbols.length === 0) {
    return res.status(400).json({ error: "Provide at least one valid ticker symbol." });
  }

  const alphaKey = process.env.ALPHA_VANTAGE_KEY;
  if (!alphaKey) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
  }

  try {
    const settled = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const timeSeries = await fetchHistoricalSeries(symbol, alphaKey);
        const data = processHistoricalData(timeSeries, TIMEFRAMES[timeframe].periodMonths);
        return buildSupportCandidate(symbol, data);
      }),
    );

    const results = [];
    const failures = [];
    for (const entry of settled) {
      if (entry.status === "fulfilled") {
        results.push(entry.value);
      } else {
        failures.push(entry.reason instanceof Error ? entry.reason.message : "Support scan request failed.");
      }
    }

    if (results.length === 0) {
      return res.status(502).json({
        error: failures[0] || "Unable to build the support scan.",
        failures,
      });
    }

    return res.status(200).json({
      timeframe: TIMEFRAMES[timeframe],
      results: results.sort((left, right) => right.score - left.score),
      failures,
      requestedCount: symbols.length,
      processedCount: results.length,
    });
  } catch (error) {
    console.error("Error in /api/support-summary route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}