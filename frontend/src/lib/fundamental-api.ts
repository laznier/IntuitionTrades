export type TickerMatch = {
  symbol: string;
  name: string;
};

export type FundamentalCategory = {
  id: string;
  label: string;
  score: number;
  summary: string;
};

export type FundamentalMetric = {
  label: string;
  value: string;
};

export type FundamentalSummary = {
  symbol: string;
  companyName: string;
  description: string;
  exchange: string;
  currency: string;
  sector: string;
  industry: string;
  country: string;
  marketCap: string;
  trailingPE: string;
  priceToBook: string;
  dividendYield: string;
  aggregatedScore: number;
  tone: 'strong' | 'balanced' | 'fragile';
  categoryScores: FundamentalCategory[];
  rawMetrics: FundamentalMetric[];
};

function assertOk(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export async function fetchTickerMatches(query: string): Promise<TickerMatch[]> {
  const response = await fetch(`/api/ticker?query=${encodeURIComponent(query)}`);
  assertOk(response);
  const payload = (await response.json()) as {
    bestMatches?: Array<Record<string, string>>;
  };

  return (payload.bestMatches ?? []).map((match) => ({
    symbol: match['1. symbol'] ?? '',
    name: match['2. name'] ?? '',
  }));
}

export async function fetchFundamentalSummary(symbol: string): Promise<FundamentalSummary> {
  const response = await fetch(`/api/fundamental-summary?symbol=${encodeURIComponent(symbol)}`);
  assertOk(response);
  return (await response.json()) as FundamentalSummary;
}