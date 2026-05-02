export type ScoreTone = 'strong' | 'balanced' | 'fragile';

export type AnalystRatings = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  total: number;
};

export type AnalystSummary = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  targetPrice: number;
  impliedPremiumPercent: number;
  recommendationScore: number;
  targetPremiumScore: number;
  combinedScore: number;
  tone: ScoreTone;
  description: string;
  ratings: AnalystRatings;
  source: {
    latestTradingDay: string;
    exchange: string;
    currency: string;
  };
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error || 'Unable to load the analyst summary.')
      : 'Unable to load the analyst summary.';
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchAnalystSummary(symbol: string) {
  const response = await fetch(`/api/analyst-summary?symbol=${encodeURIComponent(symbol)}`);
  return readJsonResponse<AnalystSummary>(response);
}