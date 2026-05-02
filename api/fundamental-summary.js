const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;

function normalizeSymbol(input) {
  return String(input || "").trim().toUpperCase();
}

function parseNumber(input) {
  const parsed = Number.parseFloat(input);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeScore(value, min, max) {
  if (value === null) {
    return 50;
  }

  const ratio = (value - min) / (max - min);
  return clamp(ratio * 100, 0, 100);
}

function invertScore(value, min, max) {
  return 100 - normalizeScore(value, min, max);
}

function average(values) {
  return values.reduce((total, current) => total + current, 0) / values.length;
}

function scoreTone(score) {
  if (score >= 70) {
    return "strong";
  }

  if (score >= 45) {
    return "balanced";
  }

  return "fragile";
}

function formatLargeNumber(input) {
  const value = parseNumber(input);
  if (value === null) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function computeCategoryScores(data) {
  const profitMargin = normalizeScore(parseNumber(data.ProfitMargin), 0, 0.25);
  const operatingMargin = normalizeScore(parseNumber(data.OperatingMarginTTM), 0, 0.3);
  const returnOnAssets = normalizeScore(parseNumber(data.ReturnOnAssetsTTM), 0, 0.15);
  const returnOnEquity = normalizeScore(parseNumber(data.ReturnOnEquityTTM), 0, 0.35);
  const profitability = average([
    profitMargin,
    operatingMargin,
    returnOnAssets,
    returnOnEquity,
  ]);

  const valuation = average([
    invertScore(parseNumber(data.PERatio), 5, 40),
    invertScore(parseNumber(data.PEGRatio), 0.5, 2.5),
    invertScore(parseNumber(data.PriceToSalesRatioTTM), 1, 10),
    invertScore(parseNumber(data.PriceToBookRatio), 1, 10),
  ]);

  const referencePrice =
    parseNumber(data["50DayMovingAverage"]) ?? parseNumber(data["200DayMovingAverage"]) ?? 0;
  let analystPremium = null;
  const analystTargetPrice = parseNumber(data.AnalystTargetPrice);
  if (referencePrice > 0 && analystTargetPrice !== null) {
    analystPremium = analystTargetPrice / referencePrice - 1;
  }

  const growth = average([
    normalizeScore(parseNumber(data.QuarterlyRevenueGrowthYOY), -0.2, 0.3),
    normalizeScore(parseNumber(data.QuarterlyEarningsGrowthYOY), -0.3, 0.3),
    normalizeScore(analystPremium, 0, 0.5),
  ]);

  const dividends = average([
    normalizeScore(parseNumber(data.DividendYield), 0, 0.07),
    normalizeScore(parseNumber(data.DividendPerShare), 0, 10),
    normalizeScore(parseNumber(data.EPS), 0, 12),
  ]);

  const ebitda = parseNumber(data.EBITDA);
  const revenue = parseNumber(data.RevenueTTM);
  const ebitdaMargin = ebitda !== null && revenue ? ebitda / revenue : null;
  const financial = average([
    normalizeScore(ebitdaMargin, 0, 0.3),
    invertScore(parseNumber(data.EVToEBITDA), 5, 30),
    invertScore(parseNumber(data.Beta), 0, 2),
  ]);

  return {
    profitability,
    valuation,
    growth,
    dividends,
    financial,
  };
}

export function buildFundamentalSummary(data) {
  const categories = computeCategoryScores(data);
  const aggregatedScore = average(Object.values(categories));

  return {
    symbol: data.Symbol,
    companyName: data.Name || data.Symbol,
    description: data.Description || "No company description available.",
    exchange: data.Exchange || "Unavailable",
    currency: data.Currency || "Unavailable",
    sector: data.Sector || "Unavailable",
    industry: data.Industry || "Unavailable",
    country: data.Country || "Unavailable",
    marketCap: formatLargeNumber(data.MarketCapitalization),
    trailingPE: data.PERatio || "Unavailable",
    priceToBook: data.PriceToBookRatio || "Unavailable",
    dividendYield: data.DividendYield || "Unavailable",
    aggregatedScore,
    tone: scoreTone(aggregatedScore),
    categoryScores: [
      {
        id: "profitability",
        label: "Profitability",
        score: categories.profitability,
        summary: "Uses profit margin, operating margin, return on assets, and return on equity.",
      },
      {
        id: "valuation",
        label: "Valuation",
        score: categories.valuation,
        summary: "Uses P/E, PEG, price-to-sales, and price-to-book with lower multiples scoring better.",
      },
      {
        id: "growth",
        label: "Growth",
        score: categories.growth,
        summary: "Uses quarterly revenue growth, earnings growth, and analyst target premium.",
      },
      {
        id: "dividends",
        label: "Dividend and Return",
        score: categories.dividends,
        summary: "Uses dividend yield, dividend per share, and earnings per share.",
      },
      {
        id: "financial",
        label: "Financial Health",
        score: categories.financial,
        summary: "Uses EBITDA margin, EV/EBITDA, and beta as a volatility penalty.",
      },
    ],
    rawMetrics: [
      ["Market Cap", formatLargeNumber(data.MarketCapitalization)],
      ["P/E Ratio", data.PERatio || "Unavailable"],
      ["PEG Ratio", data.PEGRatio || "Unavailable"],
      ["Price to Sales", data.PriceToSalesRatioTTM || "Unavailable"],
      ["Price to Book", data.PriceToBookRatio || "Unavailable"],
      ["Revenue TTM", formatLargeNumber(data.RevenueTTM)],
      ["EBITDA", formatLargeNumber(data.EBITDA)],
      ["Beta", data.Beta || "Unavailable"],
      ["Dividend Yield", data.DividendYield || "Unavailable"],
      ["EPS", data.EPS || "Unavailable"],
    ].map(([label, value]) => ({ label, value })),
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

  const symbol = normalizeSymbol(req.query.symbol);
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return res.status(400).json({
      error: "Please provide a valid stock symbol (letters, numbers, . or -).",
    });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
  }

  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return res.status(502).json({ error: "Market data provider request failed" });
    }

    const data = await response.json();
    if (!data.Symbol) {
      return res.status(502).json({
        error: "No fundamental company overview returned for that symbol.",
        details: data,
      });
    }

    return res.status(200).json(buildFundamentalSummary(data));
  } catch (error) {
    console.error("Error in /api/fundamental-summary route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}