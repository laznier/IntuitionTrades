export type IntradayInterval = '1min' | '5min' | '15min' | '30min' | '60min';
export type IntradayOutputsize = 'compact' | 'full';

export type IntradayCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type DailyCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
};

type AlphaSeriesPayload = {
  [key: string]: unknown;
};

function parseNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error || 'Unable to load market data.')
      : 'Unable to load market data.';
    throw new Error(message);
  }

  return payload as T;
}

function findTimeSeries(payload: AlphaSeriesPayload) {
  const key = Object.keys(payload).find((candidate) => candidate.toLowerCase().startsWith('time series'));
  if (!key) {
    throw new Error('No price series was returned for that request.');
  }

  const rawSeries = payload[key];
  if (!rawSeries || typeof rawSeries !== 'object') {
    throw new Error('The price series payload was invalid.');
  }

  return rawSeries as Record<string, Record<string, string>>;
}

export async function fetchIntradayCandles(
  symbol: string,
  interval: IntradayInterval,
  outputsize: IntradayOutputsize,
) {
  const response = await fetch(
    `/api/intraday?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=${encodeURIComponent(outputsize)}`,
  );
  const payload = await readJsonResponse<AlphaSeriesPayload>(response);
  const series = findTimeSeries(payload);

  return Object.entries(series)
    .map(([timestamp, values]) => ({
      timestamp,
      open: parseNumber(values['1. open']),
      high: parseNumber(values['2. high']),
      low: parseNumber(values['3. low']),
      close: parseNumber(values['4. close']),
      volume: parseNumber(values['5. volume']),
    }))
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export async function fetchDailyCandles(symbol: string) {
  const response = await fetch(`/api/historical?symbol=${encodeURIComponent(symbol)}`);
  const payload = await readJsonResponse<AlphaSeriesPayload>(response);
  const series = findTimeSeries(payload);

  return Object.entries(series)
    .map(([date, values]) => ({
      date,
      open: parseNumber(values['1. open']),
      high: parseNumber(values['2. high']),
      low: parseNumber(values['3. low']),
      close: parseNumber(values['4. close']),
      adjustedClose: parseNumber(values['5. adjusted close']),
      volume: parseNumber(values['6. volume']),
    }))
    .sort((left, right) => right.date.localeCompare(left.date));
}