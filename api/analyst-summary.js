const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;

function normalizeSymbol(input) {
  return String(input || '').trim().toUpperCase();
}

function parseNumber(value) {
  const parsedValue = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function logistic(value, coefficient = 10) {
  return 1 / (1 + Math.exp(-coefficient * value));
}

function buildRecommendationScore(overview) {
  const strongBuy = parseNumber(overview.AnalystRatingStrongBuy) ?? 0;
  const buy = parseNumber(overview.AnalystRatingBuy) ?? 0;
  const hold = parseNumber(overview.AnalystRatingHold) ?? 0;
  const sell = parseNumber(overview.AnalystRatingSell) ?? 0;
  const strongSell = parseNumber(overview.AnalystRatingStrongSell) ?? 0;
  const total = strongBuy + buy + hold + sell + strongSell;

  if (total === 0) {
    return {
      score: 50,
      breakdown: { strongBuy, buy, hold, sell, strongSell, total },
    };
  }

  const averageRating = (2 * strongBuy + buy - sell - 2 * strongSell) / total;
  return {
    score: ((averageRating + 2) / 4) * 100,
    breakdown: { strongBuy, buy, hold, sell, strongSell, total },
  };
}

function buildTone(score) {
  if (score >= 67) {
    return 'strong';
  }

  if (score >= 45) {
    return 'balanced';
  }

  return 'fragile';
}

function buildDescription(companyName, impliedPremiumPercent, recommendationScore, coverageCount) {
  const premiumText = impliedPremiumPercent >= 0
    ? `Analyst targets imply ${impliedPremiumPercent.toFixed(1)}% upside from the latest close.`
    : `Analyst targets sit ${Math.abs(impliedPremiumPercent).toFixed(1)}% below the latest close.`;

  const coverageText = coverageCount > 0
    ? `${coverageCount} tracked ratings convert to a ${recommendationScore.toFixed(1)} consensus score.`
    : 'Analyst coverage is limited, so the recommendation score defaults to neutral.';

  return `${companyName}: ${premiumText} ${coverageText}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error('Market data provider request failed.');
  }

  return response.json();
}

export async function buildAnalystSummary(symbol, apiKey) {
  const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const historicalUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${apiKey}`;

  const [overview, historical] = await Promise.all([
    fetchJson(overviewUrl),
    fetchJson(historicalUrl),
  ]);

  if (!overview.Symbol) {
    throw new Error('Analyst overview data was unavailable.');
  }

  const timeSeries = historical['Time Series (Daily)'];
  if (!timeSeries || typeof timeSeries !== 'object') {
    throw new Error('Historical pricing data was unavailable.');
  }

  const latestDate = Object.keys(timeSeries).sort().at(-1);
  if (!latestDate) {
    throw new Error('Historical pricing data was empty.');
  }

  const latestBar = timeSeries[latestDate];
  const currentPrice = parseNumber(latestBar['5. adjusted close']) ?? parseNumber(latestBar['4. close']);
  const targetPrice = parseNumber(overview.AnalystTargetPrice);
  if (!currentPrice || !targetPrice) {
    throw new Error('Current price or analyst target price was unavailable.');
  }

  const recommendation = buildRecommendationScore(overview);
  const impliedPremiumPercent = ((targetPrice / currentPrice) - 1) * 100;
  const targetPremiumScore = logistic(impliedPremiumPercent / 100) * 100;
  const combinedScore = (recommendation.score + targetPremiumScore) / 2;
  const tone = buildTone(combinedScore);
  const companyName = overview.Name || overview.Symbol;

  return {
    symbol: overview.Symbol,
    companyName,
    currentPrice,
    targetPrice,
    impliedPremiumPercent,
    recommendationScore: recommendation.score,
    targetPremiumScore,
    combinedScore,
    tone,
    description: buildDescription(
      companyName,
      impliedPremiumPercent,
      recommendation.score,
      recommendation.breakdown.total,
    ),
    ratings: recommendation.breakdown,
    source: {
      latestTradingDay: latestDate,
      exchange: overview.Exchange || 'Unknown',
      currency: overview.Currency || 'USD',
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const symbol = normalizeSymbol(req.query.symbol);
  if (!symbol || !SYMBOL_PATTERN.test(symbol)) {
    return res.status(400).json({
      error: 'Please provide a valid stock symbol (letters, numbers, . or -).',
    });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing ALPHA_VANTAGE_KEY env var' });
  }

  try {
    const summary = await buildAnalystSummary(symbol, apiKey);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error in /api/analyst-summary route:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = /provider request failed/i.test(message) ? 502 : 500;
    return res.status(status).json({ error: message });
  }
}