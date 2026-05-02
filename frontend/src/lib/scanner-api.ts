import type { ScoreTone, StockTimeframe } from './stock-api';

export type TopPickResult = {
  symbol: string;
  companyName: string;
  combinedScore: number;
  tone: ScoreTone;
  regime: {
    label: 'Bull' | 'Bear' | 'Neutral';
    scale: number;
    summary: string;
  };
  latestClose: number;
  changePercent: number;
  leadingSignals: Array<{
    id: string;
    label: string;
    score: number;
    weight: number;
  }>;
};

export type SupportScanResult = {
  symbol: string;
  score: number;
  latestClose: number;
  supportPrice: number | null;
  touches: number;
  distancePct: number | null;
  recentDate: string | null;
  summary: string;
};

type TopPicksResponse = {
  results: TopPickResult[];
  failures: string[];
  requestedCount: number;
  processedCount: number;
};

type SupportResponse = {
  timeframe: {
    label: string;
    periodMonths: number;
  };
  results: SupportScanResult[];
  failures: string[];
  requestedCount: number;
  processedCount: number;
};

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function fetchTopPicks(symbols: string[], timeframe: StockTimeframe) {
  const response = await fetch(
    `/api/top-picks?symbols=${encodeURIComponent(symbols.join(','))}&timeframe=${encodeURIComponent(timeframe)}`,
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as TopPicksResponse;
}

export async function fetchSupportScan(symbols: string[], timeframe: StockTimeframe) {
  const response = await fetch(
    `/api/support-summary?symbols=${encodeURIComponent(symbols.join(','))}&timeframe=${encodeURIComponent(timeframe)}`,
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as SupportResponse;
}