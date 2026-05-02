export type ScoreTone = 'strong' | 'balanced' | 'fragile';
export type SentimentBucket = 'positive' | 'neutral' | 'negative';

export type SentimentArticle = {
  id: string;
  headline: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  score: number;
  bucket: SentimentBucket;
};

export type SentimentSummary = {
  symbol: string;
  averageScore: number;
  trendSlope: number;
  tone: ScoreTone;
  articleCount: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  latestPublishedAt: string;
  description: string;
  articles: SentimentArticle[];
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error || 'Unable to load sentiment data.')
      : 'Unable to load sentiment data.';
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchSentimentSummary(symbol: string) {
  const response = await fetch(`/api/sentiment-summary?symbol=${encodeURIComponent(symbol)}`);
  return readJsonResponse<SentimentSummary>(response);
}