export type InsiderTransaction = {
  transactionDate: string;
  type: string;
  shares: number;
  sharePrice: number;
  owner: string;
  title: string;
};

export type InsiderSentimentPoint = {
  year: number;
  month: number;
  mspr: number;
};

function parseNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error || 'Unable to load insider data.')
      : 'Unable to load insider data.';
    throw new Error(message);
  }

  return payload as T;
}

function normalizeInsiderTransaction(record: Record<string, unknown>): InsiderTransaction {
  return {
    transactionDate: String(record.transaction_date ?? record.transactionDate ?? ''),
    type: String(record.acquisition_or_disposal ?? record.acquisitionOrDisposal ?? record.type ?? ''),
    shares: parseNumber(record.shares),
    sharePrice: parseNumber(record.share_price ?? record.sharePrice),
    owner: String(
      record.insider_name ?? record.owner ?? record.reporting_name ?? record.name ?? 'Unknown insider',
    ),
    title: String(record.executive_title ?? record.title ?? ''),
  };
}

export async function fetchInsiderTransactions(symbol: string) {
  const response = await fetch(`/api/insider?symbol=${encodeURIComponent(symbol)}`);
  const payload = await readJsonResponse<{ data?: Array<Record<string, unknown>> }>(response);
  return (payload.data ?? []).map(normalizeInsiderTransaction);
}

export async function fetchInsiderSentiment(symbol: string, periodMonths: number) {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - periodMonths);

  const response = await fetch(
    `/api/insiderscore?symbol=${encodeURIComponent(symbol)}&from=${fromDate.toISOString().slice(0, 10)}&to=${toDate.toISOString().slice(0, 10)}`,
  );
  const payload = await readJsonResponse<{ data?: Array<Record<string, unknown>> }>(response);

  return (payload.data ?? []).map((record) => ({
    year: parseNumber(record.year),
    month: parseNumber(record.month),
    mspr: parseNumber(record.mspr),
  }));
}