const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;

function normalizeSymbol(input) {
  return String(input || '').trim().toUpperCase();
}

function parseNumber(value) {
  const parsedValue = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseAlphaDate(input) {
  const value = String(input || '');
  if (value.length < 8) {
    return new Date(Number.NaN);
  }

  const year = value.substring(0, 4);
  const month = value.substring(4, 6);
  const day = value.substring(6, 8);
  const hour = value.substring(9, 11) || '00';
  const minute = value.substring(11, 13) || '00';
  const second = value.substring(13, 15) || '00';
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

function average(values) {
  return values.reduce((total, current) => total + current, 0) / values.length;
}

function calculateSlope(xs, ys) {
  const count = xs.length;
  if (count < 2) {
    return 0;
  }

  const sumX = xs.reduce((total, current) => total + current, 0);
  const sumY = ys.reduce((total, current) => total + current, 0);
  const sumXY = xs.reduce((total, current, index) => total + current * ys[index], 0);
  const sumX2 = xs.reduce((total, current) => total + current * current, 0);
  const denominator = count * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }

  return (count * sumXY - sumX * sumY) / denominator;
}

function scoreTone(score) {
  if (score >= 65) {
    return 'strong';
  }

  if (score >= 45) {
    return 'balanced';
  }

  return 'fragile';
}

function articleBucket(score) {
  if (score >= 60) {
    return 'positive';
  }

  if (score <= 40) {
    return 'negative';
  }

  return 'neutral';
}

function buildSummaryDescription(symbol, averageScore, articleCount, slope) {
  const toneText = averageScore >= 60
    ? 'Coverage is leaning constructive.'
    : averageScore <= 40
      ? 'Coverage is leaning cautious.'
      : 'Coverage is mixed.';
  const trendText = slope > 0.1
    ? 'The recent article trend is improving.'
    : slope < -0.1
      ? 'The recent article trend is softening.'
      : 'The recent article trend is fairly stable.';

  return `${symbol}: ${toneText} ${articleCount} matched articles were normalized into a public sentiment feed. ${trendText}`;
}

export async function buildSentimentSummary(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(symbol)}&limit=100&apikey=${apiKey}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error('Market data provider request failed.');
  }

  const payload = await response.json();
  if (!Array.isArray(payload.feed)) {
    throw new Error('Sentiment feed was unavailable.');
  }

  const articles = payload.feed
    .map((article) => {
      const publishedAt = parseAlphaDate(article.time_published);
      if (Number.isNaN(publishedAt.getTime())) {
        return null;
      }

      const tickerSentiment = Array.isArray(article.ticker_sentiment)
        ? article.ticker_sentiment.find(
            (entry) => String(entry.ticker || '').toUpperCase() === symbol,
          )
        : null;
      const rawScore = parseNumber(tickerSentiment?.ticker_sentiment_score);
      if (rawScore === null) {
        return null;
      }

      const score = ((rawScore + 1) / 2) * 100;
      return {
        id: `${article.time_published || publishedAt.toISOString()}-${article.title || 'article'}`,
        headline: article.title || 'Untitled article',
        summary: article.summary || 'No summary available.',
        url: article.url || '',
        source: article.source || 'Unknown source',
        publishedAt: publishedAt.toISOString(),
        score,
        bucket: articleBucket(score),
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt));

  if (articles.length < 2) {
    throw new Error('Not enough sentiment coverage is available for this symbol.');
  }

  const chronological = articles.slice().sort(
    (left, right) => new Date(left.publishedAt) - new Date(right.publishedAt),
  );
  const firstDate = new Date(chronological[0].publishedAt);
  const xs = chronological.map(
    (article) => (new Date(article.publishedAt) - firstDate) / (1000 * 60 * 60 * 24),
  );
  const ys = chronological.map((article) => article.score);
  const averageScore = average(ys);
  const slope = calculateSlope(xs, ys);
  const positiveCount = articles.filter((article) => article.bucket === 'positive').length;
  const neutralCount = articles.filter((article) => article.bucket === 'neutral').length;
  const negativeCount = articles.filter((article) => article.bucket === 'negative').length;

  return {
    symbol,
    averageScore,
    trendSlope: slope,
    tone: scoreTone(averageScore),
    articleCount: articles.length,
    positiveCount,
    neutralCount,
    negativeCount,
    latestPublishedAt: articles[0].publishedAt,
    description: buildSummaryDescription(symbol, averageScore, articles.length, slope),
    articles,
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
    const summary = await buildSentimentSummary(symbol, apiKey);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error in /api/sentiment-summary route:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    const status = /provider request failed/i.test(message) ? 502 : 500;
    return res.status(status).json({ error: message });
  }
}