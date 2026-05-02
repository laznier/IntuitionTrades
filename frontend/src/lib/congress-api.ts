export type CongressTrade = {
  ticker: string;
  member: string;
  transaction: string;
  amountText: string;
  amountEstimate: number;
  transactionDate: string;
  owner: string;
  chamber: string;
  description: string;
};

function parseAmountEstimate(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? '').trim();
  if (!text) {
    return 0;
  }

  const matches = text.replace(/[$,]/g, '').match(/\d+(?:\.\d+)?/g);
  if (!matches || matches.length === 0) {
    return 0;
  }

  const numbers = matches.map((entry) => Number.parseFloat(entry)).filter(Number.isFinite);
  if (numbers.length === 0) {
    return 0;
  }

  return numbers.reduce((total, current) => total + current, 0) / numbers.length;
}

function normalizeCongressTrade(record: Record<string, unknown>): CongressTrade {
  const amountText = String(
    record.Amount ?? record.amount ?? record.Range ?? record.amount_range ?? 'Unavailable',
  );

  return {
    ticker: String(record.Ticker ?? record.ticker ?? record.Symbol ?? record.symbol ?? 'Unknown'),
    member: String(
      record.Representative ?? record.member ?? record.Member ?? record.Politician ?? 'Unknown member',
    ),
    transaction: String(record.Transaction ?? record.transaction ?? record.Type ?? 'Unknown'),
    amountText,
    amountEstimate: parseAmountEstimate(amountText),
    transactionDate: String(
      record.TransactionDate ?? record.transactionDate ?? record.ReportDate ?? record.Date ?? '',
    ),
    owner: String(record.Owner ?? record.owner ?? 'Unknown owner'),
    chamber: String(record.Chamber ?? record.chamber ?? 'Unknown chamber'),
    description: String(
      record.Description ?? record.AssetDescription ?? record.assetDescription ?? '',
    ),
  };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error || 'Unable to load congressional trade data.')
      : 'Unable to load congressional trade data.';
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchTopCongressTrades() {
  const response = await fetch('/api/topcongress');
  const payload = await readJsonResponse<{ data?: Array<Record<string, unknown>> }>(response);
  return (payload.data ?? []).map(normalizeCongressTrade);
}

export async function fetchCongressTrades(ticker: string) {
  const response = await fetch(`/api/congress?ticker=${encodeURIComponent(ticker)}`);
  const payload = await readJsonResponse<{ data?: Array<Record<string, unknown>> }>(response);
  return (payload.data ?? []).map(normalizeCongressTrade);
}