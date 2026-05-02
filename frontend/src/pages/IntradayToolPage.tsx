import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTickerMatches, type TickerMatch } from '../lib/fundamental-api';
import {
  fetchDailyCandles,
  fetchIntradayCandles,
  type DailyCandle,
  type IntradayCandle,
  type IntradayInterval,
  type IntradayOutputsize,
} from '../lib/intraday-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

const intervalOptions: Array<{ value: IntradayInterval; label: string }> = [
  { value: '1min', label: '1 minute' },
  { value: '5min', label: '5 minute' },
  { value: '15min', label: '15 minute' },
  { value: '30min', label: '30 minute' },
  { value: '60min', label: '60 minute' },
];

const outputsizeOptions: Array<{ value: IntradayOutputsize; label: string }> = [
  { value: 'compact', label: 'Recent window' },
  { value: 'full', label: 'Full session history' },
];

function formatTimestamp(value: string) {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function IntradayToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [interval, setInterval] = useState<IntradayInterval>('5min');
  const [outputsize, setOutputsize] = useState<IntradayOutputsize>('compact');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load a clean intraday table and daily context for a selected ticker.');
  const [errorMessage, setErrorMessage] = useState('');
  const [intradayCandles, setIntradayCandles] = useState<IntradayCandle[]>([]);
  const [dailyCandles, setDailyCandles] = useState<DailyCandle[]>([]);

  useEffect(() => {
    if (ticker.trim().length < 2) {
      setMatches([]);
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const nextMatches = await fetchTickerMatches(ticker.trim());
        setMatches(nextMatches);
      } catch {
        setMatches([]);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [ticker]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTicker = ticker.trim().toUpperCase();

    if (!normalizedTicker) {
      setStatus('error');
      setErrorMessage('Enter a ticker symbol before loading intraday data.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading intraday and daily context for ${normalizedTicker}.`);

    try {
      const [nextIntradayCandles, nextDailyCandles] = await Promise.all([
        fetchIntradayCandles(normalizedTicker, interval, outputsize),
        fetchDailyCandles(normalizedTicker),
      ]);

      setIntradayCandles(nextIntradayCandles);
      setDailyCandles(nextDailyCandles);
      setTicker(normalizedTicker);
      setMatches([]);
      setStatus('success');
      setMessage(`Loaded ${nextIntradayCandles.length} intraday candles for ${normalizedTicker}.`);
    } catch (error) {
      setIntradayCandles([]);
      setDailyCandles([]);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load intraday data.');
      setMessage('The intraday request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  const latestIntraday = intradayCandles[0];
  const previousIntraday = intradayCandles[1];
  const intradayChange = latestIntraday && previousIntraday
    ? latestIntraday.close - previousIntraday.close
    : 0;
  const latestDaily = dailyCandles[0];
  const previousDaily = dailyCandles[1];
  const dailyChange = latestDaily && previousDaily
    ? latestDaily.adjustedClose - previousDaily.adjustedClose
    : 0;

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="intraday-tool-title">
        <p className="eyebrow">Seventh live migration slice</p>
        <h1 id="intraday-tool-title">Intraday snapshot</h1>
        <p className="lead compact-lead">
          This React version replaces the chart-heavy legacy page with an accessible intraday tape, latest-candle summary,
          and daily reference table built from the hardened market-data routes.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="intraday-ticker">
                Ticker symbol
              </label>
              <input
                id="intraday-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="intraday-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="intraday-ticker-hint" className="field-help">
                Search by ticker. Suggestions appear as you type.
              </p>
              {matches.length > 0 ? (
                <ul className="suggestion-list" id={listId} role="listbox" aria-label="Ticker suggestions">
                  {matches.map((match) => (
                    <li key={`${match.symbol}-${match.name}`}>
                      <button
                        className="suggestion-button"
                        type="button"
                        onClick={() => handleMatchSelection(match)}
                      >
                        <span>{match.symbol}</span>
                        <span className="suggestion-name">{match.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="field-stack">
              <label className="field-label" htmlFor="intraday-interval">
                Interval
              </label>
              <select
                id="intraday-interval"
                className="search-input"
                value={interval}
                onChange={(event) => setInterval(event.target.value as IntradayInterval)}
              >
                {intervalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="field-help">The hardened intraday route validates the requested interval.</p>
            </div>
          </div>

          <div className="tool-form-grid">
            <div className="field-stack">
              <span className="field-label">Selected company</span>
              <div className="selected-company">{selectedCompany || 'No company selected yet'}</div>
            </div>

            <div className="field-stack">
              <label className="field-label" htmlFor="intraday-outputsize">
                Window
              </label>
              <select
                id="intraday-outputsize"
                className="search-input"
                value={outputsize}
                onChange={(event) => setOutputsize(event.target.value as IntradayOutputsize)}
              >
                {outputsizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading snapshot' : 'Load intraday snapshot'}
            </button>
            <a className="button button-secondary" href="/intraday/">
              Open legacy page
            </a>
          </div>
        </form>

        <p className="assistive-status" aria-live="polite">
          {message}
        </p>

        {status === 'error' && errorMessage ? (
          <div className="error-banner" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {latestIntraday ? (
          <div className="analysis-stack">
            <section className="hero-score-card" aria-labelledby="intraday-summary-title">
              <div>
                <p className="eyebrow">Latest intraday candle</p>
                <h2 id="intraday-summary-title">{ticker}</h2>
                <p className="lead compact-lead">
                  Latest update {formatTimestamp(latestIntraday.timestamp)} with {interval} candles from the hardened intraday route.
                </p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone ${intradayChange >= 0 ? 'score-tone-strong' : 'score-tone-fragile'}`}>
                  {intradayChange >= 0 ? 'Up vs prior candle' : 'Down vs prior candle'}
                </p>
                <p className="score-value">${latestIntraday.close.toFixed(2)}</p>
                <p className="meter-caption">Change {intradayChange >= 0 ? '+' : ''}{intradayChange.toFixed(2)}</p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Intraday context">
              <article className="detail-card">
                <dt>Open</dt>
                <dd>${latestIntraday.open.toFixed(2)}</dd>
              </article>
              <article className="detail-card">
                <dt>High</dt>
                <dd>${latestIntraday.high.toFixed(2)}</dd>
              </article>
              <article className="detail-card">
                <dt>Low</dt>
                <dd>${latestIntraday.low.toFixed(2)}</dd>
              </article>
              <article className="detail-card">
                <dt>Volume</dt>
                <dd>{latestIntraday.volume.toLocaleString()}</dd>
              </article>
              {latestDaily ? (
                <article className="detail-card detail-card-wide">
                  <dt>Latest daily context</dt>
                  <dd>
                    {latestDaily.date} adjusted close ${latestDaily.adjustedClose.toFixed(2)} ({dailyChange >= 0 ? '+' : ''}{dailyChange.toFixed(2)} vs prior day)
                  </dd>
                </article>
              ) : null}
            </section>

            <section className="content-panel nested-panel" aria-labelledby="intraday-table-title">
              <p className="eyebrow">Intraday tape</p>
              <h2 id="intraday-table-title">Most recent candles</h2>
              <div className="table-wrapper">
                <table className="metric-table">
                  <caption>Recent intraday candles returned by the validated market-data route.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Timestamp</th>
                      <th scope="col">Open</th>
                      <th scope="col">High</th>
                      <th scope="col">Low</th>
                      <th scope="col">Close</th>
                      <th scope="col">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intradayCandles.slice(0, 16).map((candle) => (
                      <tr key={candle.timestamp}>
                        <th scope="row">{formatTimestamp(candle.timestamp)}</th>
                        <td>${candle.open.toFixed(2)}</td>
                        <td>${candle.high.toFixed(2)}</td>
                        <td>${candle.low.toFixed(2)}</td>
                        <td>${candle.close.toFixed(2)}</td>
                        <td>{candle.volume.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="intraday-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="intraday-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy intraday page depended on dense chart controls and provider-shaped JSON. This replacement keeps the
          data public but presents it through validated inputs, keyboard-friendly controls, and plain tables.
        </p>
        <Link className="inline-link" to="/tools">
          Return to the migration catalog
        </Link>
      </section>
    </div>
  );
}