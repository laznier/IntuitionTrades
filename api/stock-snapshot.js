import { buildFundamentalSummary } from "./fundamental-summary.js";

const SYMBOL_PATTERN = /^[A-Za-z0-9.-]{1,10}$/;
const TIMEFRAMES = {
  short: { label: "Short term", periodMonths: 4, horizonYears: 1 / 12 },
  medium: { label: "Medium term", periodMonths: 12, horizonYears: 3 / 12 },
  long: { label: "Long term", periodMonths: 24, horizonYears: 6 / 12 },
};

const AUTO_WEIGHTS = {
  Bear: {
    scale: 1,
    summary: "Defensive weighting that leans on fundamentals, insider conviction, and sentiment.",
    values: { risk: 0.1, technical: 0.05, sentiment: 0.2, insider: 0.2, fundamental: 0.3, congress: 0.15 },
  },
  Bull: {
    scale: 3,
    summary: "Aggressive weighting that amplifies technical and risk signals in a bullish tape.",
    values: { risk: 0.2, technical: 0.2, sentiment: 0.15, insider: 0.15, fundamental: 0.15, congress: 0.15 },
  },
  Neutral: {
    scale: 2,
    summary: "Balanced weighting that keeps technical and fundamental signals near the center.",
    values: { risk: 0.15, technical: 0.2, sentiment: 0.15, insider: 0.15, fundamental: 0.2, congress: 0.15 },
  },
};

function normalizeSymbol(input) {
  return String(input || "").trim().toUpperCase();
}

function normalizeTimeframe(input) {
  const key = String(input || "short").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TIMEFRAMES, key) ? key : null;
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function formatDate(input) {
  return input.toISOString().slice(0, 10);
}

function parseAlphaDate(input) {
  const value = String(input || "");
  if (value.length < 8) {
    return new Date(Number.NaN);
  }

  const year = value.substring(0, 4);
  const month = value.substring(4, 6);
  const day = value.substring(6, 8);
  const hour = value.substring(9, 11) || "00";
  const minute = value.substring(11, 13) || "00";
  const second = value.substring(13, 15) || "00";
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
}

function xmur3(input) {
  let hash = 1779033703 ^ input.length;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return function nextSeed() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return function nextRandom() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeededRandom(seedInput) {
  const seedFactory = xmur3(seedInput);
  return mulberry32(seedFactory());
}

function randn(random) {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = random();
  }
  while (v === 0) {
    v = random();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function processHistoricalData(timeSeries, periodMonths) {
  const dates = Object.keys(timeSeries).sort((left, right) => new Date(left) - new Date(right));
  const endDate = new Date(dates[dates.length - 1]);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - periodMonths);

  const prices = [];
  for (const date of dates) {
    const parsedDate = new Date(date);
    if (parsedDate < startDate || parsedDate > endDate) {
      continue;
    }

    const close = parseNumber(timeSeries[date]["5. adjusted close"]);
    if (close === null) {
      continue;
    }

    prices.push({
      date: parsedDate,
      close,
      high: parseNumber(timeSeries[date]["2. high"]) ?? close,
      low: parseNumber(timeSeries[date]["3. low"]) ?? close,
    });
  }

  return prices.sort((left, right) => left.date - right.date);
}

function computeEMA(prices, period) {
  if (prices.length < period) {
    return [];
  }

  const ema = [];
  const multiplier = 2 / (period + 1);
  let seed = 0;
  for (let index = 0; index < period; index += 1) {
    seed += prices[index].close;
  }

  let previous = seed / period;
  ema.push({ date: prices[period - 1].date, ema: previous });

  for (let index = period; index < prices.length; index += 1) {
    previous = (prices[index].close - previous) * multiplier + previous;
    ema.push({ date: prices[index].date, ema: previous });
  }

  return ema;
}

function computeMACD(prices, fast = 12, slow = 26, signal = 9) {
  const fastEMA = computeEMA(prices, fast);
  const slowEMA = computeEMA(prices, slow);
  const fastLookup = new Map(fastEMA.map((entry) => [entry.date.getTime(), entry.ema]));
  const macdLine = [];

  for (const slowEntry of slowEMA) {
    const matchingFast = fastLookup.get(slowEntry.date.getTime());
    if (matchingFast === undefined) {
      continue;
    }

    macdLine.push({ date: slowEntry.date, macd: matchingFast - slowEntry.ema });
  }

  if (macdLine.length < signal) {
    return { macdLine, signalLine: [] };
  }

  const multiplier = 2 / (signal + 1);
  let seed = 0;
  for (let index = 0; index < signal; index += 1) {
    seed += macdLine[index].macd;
  }

  let previous = seed / signal;
  const signalLine = [{ date: macdLine[signal - 1].date, signal: previous }];

  for (let index = signal; index < macdLine.length; index += 1) {
    previous = (macdLine[index].macd - previous) * multiplier + previous;
    signalLine.push({ date: macdLine[index].date, signal: previous });
  }

  return { macdLine, signalLine };
}

function computeRSI(prices, period = 14) {
  if (prices.length <= period) {
    return [];
  }

  const values = [];
  for (let index = period; index < prices.length; index += 1) {
    let gains = 0;
    let losses = 0;
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
      const diff = prices[cursor].close - prices[cursor - 1].close;
      if (diff > 0) {
        gains += diff;
      } else {
        losses -= diff;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    values.push({ date: prices[index].date, rsi });
  }

  return values;
}

function computeBollingerBands(prices, period = 20, k = 2) {
  if (prices.length < period) {
    return [];
  }

  const bands = [];
  for (let index = period - 1; index < prices.length; index += 1) {
    const slice = prices.slice(index - period + 1, index + 1).map((entry) => entry.close);
    const sma = slice.reduce((total, current) => total + current, 0) / period;
    const variance =
      slice.reduce((total, current) => total + Math.pow(current - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    bands.push({
      date: prices[index].date,
      sma,
      upper: sma + k * stdDev,
      lower: sma - k * stdDev,
    });
  }

  return bands;
}

function computeWMA(prices, period = 20) {
  if (prices.length < period) {
    return [];
  }

  const values = [];
  for (let index = period - 1; index < prices.length; index += 1) {
    const slice = prices.slice(index - period + 1, index + 1).map((entry) => entry.close);
    let numerator = 0;
    let denominator = 0;
    for (let cursor = 0; cursor < period; cursor += 1) {
      const weight = cursor + 1;
      numerator += slice[cursor] * weight;
      denominator += weight;
    }

    values.push({ date: prices[index].date, wma: numerator / denominator });
  }

  return values;
}

function computeIchimoku(prices) {
  const tenkan = [];
  const kijun = [];
  const senkouA = [];
  const senkouB = [];

  for (let index = 8; index < prices.length; index += 1) {
    const periodWindow = prices.slice(index - 8, index + 1);
    const high = Math.max(...periodWindow.map((entry) => entry.high));
    const low = Math.min(...periodWindow.map((entry) => entry.low));
    tenkan.push({ date: prices[index].date, value: (high + low) / 2 });
  }

  for (let index = 25; index < prices.length; index += 1) {
    const periodWindow = prices.slice(index - 25, index + 1);
    const high = Math.max(...periodWindow.map((entry) => entry.high));
    const low = Math.min(...periodWindow.map((entry) => entry.low));
    kijun.push({ date: prices[index].date, value: (high + low) / 2 });
  }

  const overlap = Math.min(tenkan.length, kijun.length);
  for (let index = 0; index < overlap; index += 1) {
    const baseDate = kijun[index].date;
    const projectedDate = new Date(baseDate);
    projectedDate.setDate(projectedDate.getDate() + 26);
    senkouA.push({ date: projectedDate, value: (tenkan[index].value + kijun[index].value) / 2 });
  }

  for (let index = 51; index < prices.length; index += 1) {
    const periodWindow = prices.slice(index - 51, index + 1);
    const high = Math.max(...periodWindow.map((entry) => entry.high));
    const low = Math.min(...periodWindow.map((entry) => entry.low));
    const projectedDate = new Date(prices[index].date);
    projectedDate.setDate(projectedDate.getDate() + 26);
    senkouB.push({ date: projectedDate, value: (high + low) / 2 });
  }

  return { tenkan, kijun, senkouA, senkouB };
}

function scoreRSI(latestRSI, previousRSI) {
  const relative = 50 - latestRSI;
  const base = 100 / (1 + Math.exp(-0.05 * relative));
  const delta = previousRSI - latestRSI;
  return clamp(base * (1 + 0.01 * delta), 0, 100);
}

function scoreBollinger(latestPrice, latestBand, previousPrice, previousBand) {
  const currentRange = latestBand.upper - latestBand.lower || 1;
  const previousRange = previousBand.upper - previousBand.lower || 1;
  const currentPercentB = (latestPrice - latestBand.lower) / currentRange;
  const previousPercentB = (previousPrice - previousBand.lower) / previousRange;
  const base = 100 / (1 + Math.exp(3 * (currentPercentB - 0.5)));
  const delta = previousPercentB - currentPercentB;
  return clamp(base * (1 + 0.1 * delta), 0, 100);
}

function scoreWMA(latestPrice, latestWMA, previousPrice, previousWMA) {
  const currentRatio = latestWMA === 0 ? 0 : latestPrice / latestWMA - 1;
  const previousRatio = previousWMA === 0 ? 0 : previousPrice / previousWMA - 1;
  const base = 100 / (1 + Math.exp(-10 * currentRatio));
  const delta = previousRatio - currentRatio;
  return clamp(base * (1 + 0.5 * delta), 0, 100);
}

function computeMACDSignalScore(prices) {
  const { macdLine, signalLine } = computeMACD(prices);
  if (macdLine.length < 2 || signalLine.length < 2) {
    return 50;
  }

  const latestMacd = macdLine[macdLine.length - 1].macd;
  const previousMacd = macdLine[macdLine.length - 2].macd;
  const latestSignal = signalLine[signalLine.length - 1].signal;
  const previousSignal = signalLine[signalLine.length - 2].signal;
  const latestHistogram = latestMacd - latestSignal;
  const previousHistogram = previousMacd - previousSignal;

  const positionScore = 100 / (1 + Math.exp(latestMacd));
  const crossoverScore = 100 / (1 + Math.exp(-12 * (latestMacd - latestSignal)));
  const histogramTrendScore = 100 / (1 + Math.exp(-10 * (latestHistogram - previousHistogram)));
  return clamp(average([positionScore, crossoverScore, histogramTrendScore]), 0, 100);
}

function computeIchimokuScore(prices, ichimoku) {
  if (
    prices.length < 26 ||
    ichimoku.senkouA.length === 0 ||
    ichimoku.senkouB.length === 0 ||
    ichimoku.tenkan.length === 0 ||
    ichimoku.kijun.length === 0
  ) {
    return 50;
  }

  const latestPrice = prices[prices.length - 1].close;
  const price26Ago = prices[prices.length - 26].close;
  const latestSenkouA = ichimoku.senkouA[ichimoku.senkouA.length - 1].value;
  const latestSenkouB = ichimoku.senkouB[ichimoku.senkouB.length - 1].value;
  const latestTenkan = ichimoku.tenkan[ichimoku.tenkan.length - 1].value;
  const latestKijun = ichimoku.kijun[ichimoku.kijun.length - 1].value;
  const cloudScore = 100 / (1 + Math.exp(-1 * (latestPrice - latestSenkouA)));
  const tenkanScore = 100 / (1 + Math.exp(-0.2 * (latestTenkan - latestKijun)));
  const chikouScore = 100 / (1 + Math.exp(-0.1 * (latestPrice - price26Ago)));
  const cloudMidpoint = (latestSenkouA + latestSenkouB) / 2 || 1;
  const senkouScore = 100 / (1 + Math.exp(-3 * ((latestSenkouA - latestSenkouB) / cloudMidpoint)));
  return clamp(average([cloudScore, tenkanScore, chikouScore, senkouScore]), 0, 100);
}

function buildTechnicalSummary(prices) {
  const rsis = computeRSI(prices, 14);
  const bands = computeBollingerBands(prices);
  const wmas = computeWMA(prices);
  const ichimoku = computeIchimoku(prices);

  const latestPrice = prices[prices.length - 1].close;
  const previousPrice = prices[prices.length - 2].close;
  const latestRSI = rsis.length >= 2 ? rsis[rsis.length - 1].rsi : 50;
  const previousRSI = rsis.length >= 2 ? rsis[rsis.length - 2].rsi : 50;
  const latestBand = bands.length >= 2 ? bands[bands.length - 1] : { upper: latestPrice, lower: latestPrice };
  const previousBand = bands.length >= 2 ? bands[bands.length - 2] : latestBand;
  const latestWMA = wmas.length >= 2 ? wmas[wmas.length - 1].wma : latestPrice;
  const previousWMA = wmas.length >= 2 ? wmas[wmas.length - 2].wma : latestWMA;

  const signals = [
    {
      id: "rsi",
      label: "RSI",
      score: scoreRSI(latestRSI, previousRSI),
      summary: "Balances recent momentum against overbought and oversold conditions.",
    },
    {
      id: "bollinger",
      label: "Bollinger Bands",
      score: scoreBollinger(latestPrice, latestBand, previousPrice, previousBand),
      summary: "Checks where price sits inside the current volatility envelope and whether that is improving.",
    },
    {
      id: "macd",
      label: "MACD",
      score: computeMACDSignalScore(prices),
      summary: "Measures crossover direction, histogram trend, and current MACD positioning.",
    },
    {
      id: "wma",
      label: "Weighted Moving Average",
      score: scoreWMA(latestPrice, latestWMA, previousPrice, previousWMA),
      summary: "Compares price to the weighted moving average and tracks whether the gap is improving.",
    },
    {
      id: "ichimoku",
      label: "Ichimoku",
      score: computeIchimokuScore(prices, ichimoku),
      summary: "Looks at cloud position, Tenkan-Kijun alignment, lagging span, and span spread.",
    },
  ];

  const aggregatedScore = average(signals.map((signal) => signal.score));
  return {
    aggregatedScore,
    tone: scoreTone(aggregatedScore),
    signals,
  };
}

function calculateSlope(xs, ys) {
  const n = xs.length;
  if (n < 2) {
    return 0;
  }

  const sumX = xs.reduce((total, current) => total + current, 0);
  const sumY = ys.reduce((total, current) => total + current, 0);
  const sumXY = xs.reduce((total, current, index) => total + current * ys[index], 0);
  const sumX2 = xs.reduce((total, current) => total + current * current, 0);
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }

  return (n * sumXY - sumX * sumY) / denominator;
}

function logisticBullish(slope) {
  return clamp(100 / (1 + Math.exp(-0.3 * slope)), 0, 100);
}

function buildSentimentSummary(feed, symbol, periodMonths) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - periodMonths);
  const byHour = {};
  let articleCount = 0;

  for (const article of feed) {
    const publishedAt = parseAlphaDate(article.time_published);
    if (Number.isNaN(publishedAt.getTime()) || publishedAt < startDate) {
      continue;
    }

    if (!Array.isArray(article.ticker_sentiment)) {
      continue;
    }

    const match = article.ticker_sentiment.find(
      (entry) => String(entry.ticker || "").toUpperCase() === symbol,
    );
    if (!match) {
      continue;
    }

    const raw = parseNumber(match.ticker_sentiment_score);
    if (raw === null) {
      continue;
    }

    articleCount += 1;
    const normalized = ((raw + 1) / 2) * 100;
    const hourKey = publishedAt.toISOString().slice(0, 13);
    byHour[hourKey] ??= [];
    byHour[hourKey].push(normalized);
  }

  const sentiments = Object.entries(byHour)
    .map(([hourKey, values]) => ({
      date: new Date(`${hourKey}:00:00Z`),
      sentiment: average(values),
    }))
    .sort((left, right) => left.date - right.date);

  if (sentiments.length < 2) {
    return {
      aggregatedScore: 50,
      tone: scoreTone(50),
      articleCount,
      dataPoints: sentiments.length,
      averageScore: sentiments[0]?.sentiment ?? 50,
      slope: 0,
      summary: articleCount
        ? "Recent coverage is too thin to compute a stable trend, so the score stays neutral."
        : "No usable news sentiment was available for the selected timeframe.",
    };
  }

  const firstDate = sentiments[0].date;
  const xs = sentiments.map((entry) => (entry.date - firstDate) / (1000 * 60 * 60 * 24));
  const ys = sentiments.map((entry) => entry.sentiment);
  const slope = calculateSlope(xs, ys);
  const slopeBull = logisticBullish(slope);
  const averageScore = average(ys);
  const aggregatedScore = clamp(0.5 * slopeBull + 0.5 * averageScore, 0, 100);

  return {
    aggregatedScore,
    tone: scoreTone(aggregatedScore),
    articleCount,
    dataPoints: sentiments.length,
    averageScore,
    slope,
    summary: `Built from ${articleCount} matching news items grouped into ${sentiments.length} time buckets.`,
  };
}

function buildInsiderSummary(transactions, sentimentData, periodMonths, lastPrice) {
  const lowerBound = lastPrice * 0.5;
  const upperBound = lastPrice * 1.5;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - periodMonths);

  const filtered = transactions
    .filter((item) => {
      const transactionDate = new Date(item.transaction_date);
      if (Number.isNaN(transactionDate.getTime()) || transactionDate < cutoff) {
        return false;
      }

      const sharePrice = parseNumber(item.share_price);
      if (sharePrice === null || sharePrice === 0) {
        return false;
      }

      return sharePrice >= lowerBound && sharePrice <= upperBound;
    })
    .sort((left, right) => new Date(left.transaction_date) - new Date(right.transaction_date));

  let totalBuys = 0;
  let totalSells = 0;
  for (const item of filtered) {
    const shares = parseNumber(item.shares) ?? 0;
    if (item.acquisition_or_disposal === "A") {
      totalBuys += shares;
    } else if (item.acquisition_or_disposal === "D") {
      totalSells += shares;
    }
  }

  let transactionScore = 0;
  if (totalBuys + totalSells > 0) {
    transactionScore = ((totalBuys - totalSells) / (totalBuys + totalSells)) * 100;
  }
  const normalizedTransactionScore = (transactionScore + 100) / 2;

  const today = new Date();
  const pastDate = new Date();
  pastDate.setMonth(today.getMonth() - periodMonths);

  const requestedFrom = new Date(pastDate.toISOString().slice(0, 10));
  let sentimentStart = requestedFrom;
  if (sentimentData.length > 0) {
    const sorted = sentimentData
      .map((entry) => ({ ...entry, date: new Date(entry.year, entry.month - 1, 1) }))
      .sort((left, right) => left.date - right.date);
    if (sorted[0].date < requestedFrom) {
      sentimentStart = sorted[0].date;
    }
  }

  const filledData = [];
  const cursor = new Date(sentimentStart);
  while (cursor <= today) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const found = sentimentData.find((entry) => entry.year === year && entry.month === month);
    filledData.push({ year, month, mspr: parseNumber(found?.mspr) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const finalMspr = filledData.length > 0 ? filledData[filledData.length - 1].mspr : 0;
  const normalizedFinalMspr = (finalMspr + 100) / 2;
  const averageMspr = filledData.length > 0 ? average(filledData.map((entry) => entry.mspr)) : 0;
  const normalizedAverageMspr = (averageMspr + 100) / 2;
  const slope = calculateSlope(
    filledData.map((_, index) => index + 1),
    filledData.map((entry) => entry.mspr),
  );
  const normalizedSlope = Number.isFinite(slope) ? (slope + 100) / 2 : 50;
  const trendComponent = (normalizedAverageMspr + normalizedSlope) / 2;
  const aggregatedScore = clamp(
    0.25 * normalizedFinalMspr + 0.5 * normalizedTransactionScore + 0.25 * trendComponent,
    0,
    100,
  );

  return {
    aggregatedScore,
    tone: scoreTone(aggregatedScore),
    totalBuys,
    totalSells,
    transactionScore: normalizedTransactionScore,
    finalMspr: normalizedFinalMspr,
    trendComponent,
    entries: filtered.length,
    summary: `Combines ${filtered.length} filtered insider filings with ${filledData.length} months of MSPR trend data.`,
  };
}

function computeDollarsScore(netDollars) {
  const cap = 10000000;
  let ratio;
  if (netDollars >= 0) {
    ratio = Math.log10(netDollars + 1) / Math.log10(cap + 1);
  } else {
    ratio = -Math.log10(Math.abs(netDollars) + 1) / Math.log10(cap + 1);
  }

  const adjusted = Math.pow(Math.abs(ratio), 2.2) * (ratio >= 0 ? 1 : -1);
  return 50 + 50 * adjusted;
}

function computeUniqueScore(uniqueBuyCount, uniqueSellCount) {
  const netUnique = clamp(uniqueBuyCount - uniqueSellCount, -5, 5);
  return 50 + 50 * (netUnique / 5);
}

function computeCongressScore(totalPurchase, totalSale, uniqueBuyCount, uniqueSellCount) {
  const dollarsScore = computeDollarsScore(totalPurchase - totalSale);
  const uniqueScore = computeUniqueScore(uniqueBuyCount, uniqueSellCount);
  return average([dollarsScore, uniqueScore]);
}

function buildCongressSummary(rawData, periodMonths) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - periodMonths);
  let totalPurchase = 0;
  let totalSale = 0;
  const uniqueBuyMembers = new Set();
  const uniqueSellMembers = new Set();

  for (const item of rawData) {
    if (!item.TransactionDate || !item.Transaction) {
      continue;
    }

    const transactionDate = new Date(item.TransactionDate);
    if (Number.isNaN(transactionDate.getTime()) || transactionDate < cutoff) {
      continue;
    }

    const amount = parseNumber(item.Amount) ?? 0;
    if (/purchase/i.test(item.Transaction)) {
      totalPurchase += amount;
      if (item.member) {
        uniqueBuyMembers.add(item.member);
      }
    }

    if (/sale/i.test(item.Transaction)) {
      totalSale += amount;
      if (item.member) {
        uniqueSellMembers.add(item.member);
      }
    }
  }

  const aggregatedScore = clamp(
    computeCongressScore(totalPurchase, totalSale, uniqueBuyMembers.size, uniqueSellMembers.size),
    0,
    100,
  );

  return {
    aggregatedScore,
    tone: scoreTone(aggregatedScore),
    totalPurchase,
    totalSale,
    uniqueBuyCount: uniqueBuyMembers.size,
    uniqueSellCount: uniqueSellMembers.size,
    summary: "Scores net congressional buying dollars together with the balance of unique buyers and sellers.",
  };
}

function computeStats(prices) {
  const logReturns = [];
  for (let index = 1; index < prices.length; index += 1) {
    logReturns.push(Math.log(prices[index].close / prices[index - 1].close));
  }

  if (logReturns.length < 1) {
    return { mean: 0, stdDev: 0, lastPrice: prices[prices.length - 1].close };
  }

  const dailyMean = average(logReturns);
  const variance =
    logReturns.reduce((total, current) => total + Math.pow(current - dailyMean, 2), 0) /
    Math.max(logReturns.length - 1, 1);
  const dailyStdDev = Math.sqrt(variance);
  return {
    mean: dailyMean * 252,
    stdDev: dailyStdDev * Math.sqrt(252),
    lastPrice: prices[prices.length - 1].close,
  };
}

function runDBHJSimulation(currentPrice, v10, v20, annualMean, horizonYears, simulations, random) {
  const dt = 1 / 252;
  const steps = Math.floor(horizonYears / dt);
  const finals = [];
  const kappa1 = 2;
  const theta1 = v10;
  const sigma1 = 0.5;
  const rho1 = -0.7;
  const kappa2 = 1.5;
  const theta2 = 0.5 * v10;
  const sigma2 = 0.3;
  const rho2 = -0.3;
  const lambda = 0.2;
  const jumpMean = -0.1;
  const jumpStdDev = 0.2;

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    let price = currentPrice;
    let varianceOne = v10;
    let varianceTwo = v20;

    for (let step = 0; step < steps; step += 1) {
      const z1 = randn(random);
      const z2 = randn(random);
      const z3 = randn(random);
      const dWa = Math.sqrt(dt) * z1;
      const dWv1 = Math.sqrt(dt) * (rho1 * z1 + Math.sqrt(1 - rho1 * rho1) * z2);
      const dWv2 = Math.sqrt(dt) * (rho2 * z1 + Math.sqrt(1 - rho2 * rho2) * z3);

      varianceOne = Math.max(
        varianceOne + kappa1 * (theta1 - varianceOne) * dt + sigma1 * Math.sqrt(Math.max(varianceOne, 0)) * dWv1,
        0,
      );
      varianceTwo = Math.max(
        varianceTwo + kappa2 * (theta2 - varianceTwo) * dt + sigma2 * Math.sqrt(Math.max(varianceTwo, 0)) * dWv2,
        0,
      );

      const totalVariance = varianceOne + varianceTwo;
      let jumpMultiplier = 1;
      if (random() < lambda * dt) {
        jumpMultiplier = Math.exp(jumpMean + jumpStdDev * randn(random));
      }

      price *= jumpMultiplier * Math.exp((annualMean - 0.5 * totalVariance) * dt + Math.sqrt(totalVariance) * dWa);
    }

    finals.push(price);
  }

  return finals;
}

function getMedian(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function computeRiskMetrics(finalPrices, currentPrice) {
  const sorted = finalPrices.slice().sort((left, right) => left - right);
  const index = Math.floor(0.05 * sorted.length);
  const varPrice = sorted[index];
  const tail = sorted.slice(0, index + 1);
  const cvarPrice = average(tail);
  return {
    varPrice,
    varPct: (100 * (currentPrice - varPrice)) / currentPrice,
    cvarPrice,
    cvarPct: (100 * (currentPrice - cvarPrice)) / currentPrice,
  };
}

function computeRiskVsRewardIndex(finalPrices, currentPrice, cvarFraction, horizonYears) {
  const medianPrice = getMedian(finalPrices);
  const rawReturn = medianPrice / currentPrice - 1;
  const annualizedReturn = Math.pow(1 + rawReturn, 1 / horizonYears) - 1;
  const annualizedDrawdown = 1 - Math.pow(1 - cvarFraction, 1 / horizonYears);
  const ratio =
    annualizedDrawdown > 1e-6
      ? annualizedReturn / annualizedDrawdown
      : annualizedReturn >= 0
        ? 9999
        : -9999;
  return 50 * (1 + Math.tanh(ratio));
}

function buildRiskSummary(prices, impliedVolatility, timeframeConfig, symbol) {
  const stats = computeStats(prices);
  const annualVolatility = impliedVolatility ?? stats.stdDev;
  const varianceOne = annualVolatility * annualVolatility;
  const varianceTwo = varianceOne * 0.5;
  const simulationCount = 4000;
  const random = createSeededRandom(`${symbol}:${timeframeConfig.label}:${formatDate(prices[prices.length - 1].date)}`);
  const finalPrices = runDBHJSimulation(
    stats.lastPrice,
    varianceOne,
    varianceTwo,
    stats.mean,
    timeframeConfig.horizonYears,
    simulationCount,
    random,
  );
  const metrics = computeRiskMetrics(finalPrices, stats.lastPrice);
  const medianPrice = getMedian(finalPrices);
  const probabilityAboveCurrent =
    (finalPrices.filter((price) => price >= stats.lastPrice).length / finalPrices.length) * 100;
  const aggregatedScore = clamp(
    computeRiskVsRewardIndex(finalPrices, stats.lastPrice, metrics.cvarPct / 100, timeframeConfig.horizonYears),
    0,
    100,
  );

  return {
    aggregatedScore,
    tone: scoreTone(aggregatedScore),
    currentPrice: stats.lastPrice,
    medianPrice,
    probabilityAboveCurrent,
    varPct: metrics.varPct,
    cvarPct: metrics.cvarPct,
    annualVolatility,
    impliedVolatility,
    simulationCount,
    summary: "Uses a seeded double-Heston jump-diffusion simulation so repeated requests stay stable for the same market window.",
  };
}

function computeSMAforRegime(priceArray, period) {
  if (priceArray.length < period) {
    return null;
  }
  return average(priceArray.slice(-period).map((entry) => entry.close));
}

function computePriceSlope(prices) {
  return calculateSlope(
    prices.map((_, index) => index),
    prices.map((entry) => entry.close),
  );
}

function determineMarketRegime(timeSeries, periodMonths = 4) {
  const allDates = Object.keys(timeSeries).sort((left, right) => new Date(left) - new Date(right));
  const priceSeries = allDates.map((date) => ({
    date: new Date(date),
    close: parseNumber(timeSeries[date]["5. adjusted close"]) ?? 0,
  }));

  if (priceSeries.length === 0) {
    return "Neutral";
  }

  const shortWindow = periodMonths * 5;
  const longWindow = periodMonths * 15;
  const totalDays = periodMonths * 30;
  const endDate = priceSeries[priceSeries.length - 1].date;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - totalDays);
  const filtered = priceSeries.filter((entry) => entry.date >= startDate && entry.date <= endDate);

  if (filtered.length < Math.max(shortWindow, longWindow)) {
    return "Neutral";
  }

  const shortSMA = computeSMAforRegime(filtered, shortWindow);
  const longSMA = computeSMAforRegime(filtered, longWindow);
  const ratio = shortSMA && longSMA ? shortSMA / longSMA : 1;
  const smaSignal = ratio > 1.01 ? "Bull" : ratio < 0.99 ? "Bear" : "Neutral";
  const slopeValue = computePriceSlope(filtered);
  const slopeSignal = slopeValue > 0.2 ? "Bull" : slopeValue < -0.2 ? "Bear" : "Neutral";

  let votes = 0;
  if (smaSignal === "Bull") votes += 1;
  if (smaSignal === "Bear") votes -= 1;
  if (slopeSignal === "Bull") votes += 1;
  if (slopeSignal === "Bear") votes -= 1;

  if (votes >= 2) {
    return "Bull";
  }
  if (votes <= -2) {
    return "Bear";
  }
  return "Neutral";
}

function aggregateSignalScores(signals, regime) {
  const weights = AUTO_WEIGHTS[regime];
  const weightedSignals = signals.map((signal) => {
    const weight = weights.values[signal.id];
    return {
      ...signal,
      weight,
      weightedContribution: signal.score * weight,
    };
  });

  const raw = weightedSignals.reduce((total, signal) => total + signal.weightedContribution, 0);
  const combinedScore = clamp((raw - 50) * weights.scale + 50, 0, 100);

  return {
    combinedScore,
    weightedSignals,
    regime: {
      label: regime,
      scale: weights.scale,
      summary: weights.summary,
    },
  };
}

async function fetchJson(url, init, label) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`${label} request failed`);
  }

  return response.json();
}

async function fetchOptional(factory) {
  try {
    return await factory();
  } catch {
    return null;
  }
}

function buildSignalFallback(summary) {
  return {
    aggregatedScore: 50,
    tone: scoreTone(50),
    summary,
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

  const timeframe = normalizeTimeframe(req.query.timeframe);
  if (!timeframe) {
    return res.status(400).json({ error: "Timeframe must be short, medium, or long." });
  }

  const alphaKey = process.env.ALPHA_VANTAGE_KEY;
  if (!alphaKey) {
    return res.status(500).json({ error: "Missing ALPHA_VANTAGE_KEY env var" });
  }

  const timeframeConfig = TIMEFRAMES[timeframe];
  const encodedSymbol = encodeURIComponent(symbol);

  try {
    const [overview, historical] = await Promise.all([
      fetchJson(
        `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodedSymbol}&apikey=${alphaKey}`,
        {},
        "Company overview",
      ),
      fetchJson(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodedSymbol}&outputsize=full&apikey=${alphaKey}`,
        {},
        "Historical series",
      ),
    ]);

    if (!overview.Symbol) {
      return res.status(502).json({
        error: "No company overview returned for that symbol.",
        details: overview,
      });
    }

    const timeSeries = historical["Time Series (Daily)"];
    if (!timeSeries) {
      return res.status(502).json({
        error: "No historical price series returned for that symbol.",
        details: historical,
      });
    }

    const prices = processHistoricalData(timeSeries, timeframeConfig.periodMonths);
    if (prices.length < 60) {
      return res.status(422).json({
        error: "Not enough daily price history is available for the selected timeframe.",
      });
    }

    const now = new Date();
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - timeframeConfig.periodMonths);
    const fromDateText = fromDate.toISOString().slice(0, 10);
    const toDateText = now.toISOString().slice(0, 10);

    const [sentimentPayload, insiderPayload, insiderSentimentPayload, congressPayload, spyPayload, optionsPayload] =
      await Promise.all([
        fetchOptional(() =>
          fetchJson(
            `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodedSymbol}&limit=100&apikey=${alphaKey}`,
            {},
            "News sentiment",
          ),
        ),
        fetchOptional(() =>
          fetchJson(
            `https://www.alphavantage.co/query?function=INSIDER_TRANSACTIONS&symbol=${encodedSymbol}&apikey=${alphaKey}`,
            {},
            "Insider transactions",
          ),
        ),
        process.env.FINNHUB_KEY
          ? fetchOptional(() =>
              fetchJson(
                `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${encodedSymbol}&from=${fromDateText}&to=${toDateText}&token=${process.env.FINNHUB_KEY}`,
                {},
                "Insider sentiment",
              ),
            )
          : Promise.resolve(null),
        process.env.QUIVERQUANT_API_KEY
          ? fetchOptional(() =>
              fetchJson(
                `https://api.quiverquant.com/beta/historical/congresstrading/${encodedSymbol}`,
                {
                  headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${process.env.QUIVERQUANT_API_KEY}`,
                  },
                },
                "Congress trades",
              ),
            )
          : Promise.resolve(null),
        fetchOptional(() =>
          fetchJson(
            `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=SPY&outputsize=full&apikey=${alphaKey}`,
            {},
            "SPY regime series",
          ),
        ),
        fetchOptional(() =>
          fetchJson(
            `https://www.alphavantage.co/query?function=REALTIME_OPTIONS&symbol=${encodedSymbol}&require_greeks=true&datatype=json&apikey=${alphaKey}`,
            {},
            "Options chain",
          ),
        ),
      ]);

    const fundamental = buildFundamentalSummary(overview);
    const technical = buildTechnicalSummary(prices);

    const sentiment = sentimentPayload?.feed
      ? buildSentimentSummary(sentimentPayload.feed, symbol, timeframeConfig.periodMonths)
      : {
          ...buildSignalFallback("No usable news sentiment was available for the selected timeframe."),
          articleCount: 0,
          dataPoints: 0,
          averageScore: 50,
          slope: 0,
        };

    const insider = Array.isArray(insiderPayload?.data)
      ? buildInsiderSummary(
          insiderPayload.data,
          Array.isArray(insiderSentimentPayload?.data) ? insiderSentimentPayload.data : [],
          timeframeConfig.periodMonths,
          prices[prices.length - 1].close,
        )
      : {
          ...buildSignalFallback("Insider filings were unavailable, so this signal remains neutral."),
          totalBuys: 0,
          totalSells: 0,
          transactionScore: 50,
          finalMspr: 50,
          trendComponent: 50,
          entries: 0,
        };

    const congress = Array.isArray(congressPayload)
      ? buildCongressSummary(congressPayload, timeframeConfig.periodMonths)
      : {
          ...buildSignalFallback("Congressional trade data was unavailable, so this signal remains neutral."),
          totalPurchase: 0,
          totalSale: 0,
          uniqueBuyCount: 0,
          uniqueSellCount: 0,
        };

    const impliedVolatility = Array.isArray(optionsPayload?.data)
      ? parseNumber(
          optionsPayload.data.find((contract) => parseNumber(contract.impliedVolatility) !== null)
            ?.impliedVolatility,
        )
      : null;

    const risk = buildRiskSummary(prices, impliedVolatility, timeframeConfig, symbol);
    const regime = spyPayload?.["Time Series (Daily)"]
      ? determineMarketRegime(spyPayload["Time Series (Daily)"], 4)
      : "Neutral";

    const signalInputs = [
      {
        id: "risk",
        label: "Risk vs Reward",
        score: risk.aggregatedScore,
        summary: risk.summary,
      },
      {
        id: "technical",
        label: "Technical",
        score: technical.aggregatedScore,
        summary: "Combines RSI, Bollinger Bands, MACD, WMA, and Ichimoku into one technical read.",
      },
      {
        id: "sentiment",
        label: "Sentiment",
        score: sentiment.aggregatedScore,
        summary: sentiment.summary,
      },
      {
        id: "insider",
        label: "Insider",
        score: insider.aggregatedScore,
        summary: insider.summary,
      },
      {
        id: "fundamental",
        label: "Fundamental",
        score: fundamental.aggregatedScore,
        summary: "Uses company quality and valuation data from the backend company overview summary.",
      },
      {
        id: "congress",
        label: "Congress",
        score: congress.aggregatedScore,
        summary: congress.summary,
      },
    ];

    const aggregate = aggregateSignalScores(signalInputs, regime);
    const firstPrice = prices[0].close;
    const latestPrice = prices[prices.length - 1].close;
    const changePercent = firstPrice === 0 ? 0 : ((latestPrice - firstPrice) / firstPrice) * 100;

    return res.status(200).json({
      symbol,
      companyName: fundamental.companyName,
      description: fundamental.description,
      timeframe: {
        id: timeframe,
        label: timeframeConfig.label,
        periodMonths: timeframeConfig.periodMonths,
      },
      priceWindow: {
        startDate: formatDate(prices[0].date),
        endDate: formatDate(prices[prices.length - 1].date),
        startClose: firstPrice,
        latestClose: latestPrice,
        changePercent,
        tradingDays: prices.length,
      },
      combinedScore: aggregate.combinedScore,
      tone: scoreTone(aggregate.combinedScore),
      regime: aggregate.regime,
      signalScores: aggregate.weightedSignals,
      technical,
      fundamental,
      sentiment,
      insider,
      congress,
      risk,
    });
  } catch (error) {
    console.error("Error in /api/stock-snapshot route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}