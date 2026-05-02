import type { FundamentalCategory, FundamentalSummary } from './fundamental-api';

export type StockTimeframe = 'short' | 'medium' | 'long';
export type ScoreTone = 'strong' | 'balanced' | 'fragile';

export type StockSignalScore = FundamentalCategory & {
  weight: number;
  weightedContribution: number;
};

export type StockSnapshot = {
  symbol: string;
  companyName: string;
  description: string;
  timeframe: {
    id: StockTimeframe;
    label: string;
    periodMonths: number;
  };
  priceWindow: {
    startDate: string;
    endDate: string;
    startClose: number;
    latestClose: number;
    changePercent: number;
    tradingDays: number;
  };
  combinedScore: number;
  tone: ScoreTone;
  regime: {
    label: 'Bull' | 'Bear' | 'Neutral';
    scale: number;
    summary: string;
  };
  signalScores: StockSignalScore[];
  technical: {
    aggregatedScore: number;
    tone: ScoreTone;
    signals: FundamentalCategory[];
  };
  fundamental: FundamentalSummary;
  sentiment: {
    aggregatedScore: number;
    tone: ScoreTone;
    articleCount: number;
    dataPoints: number;
    averageScore: number;
    slope: number;
    summary: string;
  };
  insider: {
    aggregatedScore: number;
    tone: ScoreTone;
    totalBuys: number;
    totalSells: number;
    transactionScore: number;
    finalMspr: number;
    trendComponent: number;
    entries: number;
    summary: string;
  };
  congress: {
    aggregatedScore: number;
    tone: ScoreTone;
    totalPurchase: number;
    totalSale: number;
    uniqueBuyCount: number;
    uniqueSellCount: number;
    summary: string;
  };
  risk: {
    aggregatedScore: number;
    tone: ScoreTone;
    currentPrice: number;
    medianPrice: number;
    probabilityAboveCurrent: number;
    varPct: number;
    cvarPct: number;
    annualVolatility: number;
    impliedVolatility: number | null;
    simulationCount: number;
    summary: string;
  };
};

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function fetchStockSnapshot(
  symbol: string,
  timeframe: StockTimeframe,
): Promise<StockSnapshot> {
  const response = await fetch(
    `/api/stock-snapshot?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`,
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as StockSnapshot;
}