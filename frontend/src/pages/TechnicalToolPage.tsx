import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTickerMatches, type TickerMatch } from '../lib/fundamental-api';
import {
  fetchStockSnapshot,
  type StockSnapshot,
  type StockTimeframe,
} from '../lib/stock-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

const timeframeOptions: Array<{ value: StockTimeframe; label: string }> = [
  { value: 'short', label: 'Short term' },
  { value: 'medium', label: 'Medium term' },
  { value: 'long', label: 'Long term' },
];

function toneLabel(score: number) {
  if (score >= 70) {
    return 'Strong technical footing';
  }

  if (score >= 45) {
    return 'Mixed technical footing';
  }

  return 'Weak technical footing';
}

export function TechnicalToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load a backend technical summary for a selected ticker.');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState<StockSnapshot | null>(null);

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
      setErrorMessage('Enter a ticker symbol before running the technical summary.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading a backend technical summary for ${normalizedTicker}.`);

    try {
      const nextSnapshot = await fetchStockSnapshot(normalizedTicker, timeframe);
      setSnapshot(nextSnapshot);
      setSelectedCompany(nextSnapshot.companyName);
      setTicker(nextSnapshot.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(
        `Loaded ${nextSnapshot.companyName} with a technical score of ${nextSnapshot.technical.aggregatedScore.toFixed(1)}.`,
      );
    } catch (error) {
      setSnapshot(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the technical summary.');
      setMessage('The technical summary request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="technical-tool-title">
        <p className="eyebrow">Fifth live migration slice</p>
        <h1 id="technical-tool-title">Technical analysis</h1>
        <p className="lead compact-lead">
          This React version keeps the signal math behind the backend stock snapshot and turns the legacy
          chart-heavy page into an accessible narrative and table-based technical report.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="technical-ticker">
                Ticker symbol
              </label>
              <input
                id="technical-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="technical-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="technical-ticker-hint" className="field-help">
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
              <label className="field-label" htmlFor="technical-timeframe">
                Timeframe
              </label>
              <select
                id="technical-timeframe"
                className="search-input"
                value={timeframe}
                onChange={(event) => setTimeframe(event.target.value as StockTimeframe)}
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="field-help">The selected timeframe controls the backend technical window.</p>
            </div>
          </div>

          <div className="field-stack">
            <span className="field-label">Selected company</span>
            <div className="selected-company">{selectedCompany || 'No company selected yet'}</div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading technicals' : 'Run technical analysis'}
            </button>
            <a className="button button-secondary" href="/technical/">
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

        {snapshot ? (
          <div className="analysis-stack">
            <section className="hero-score-card" aria-labelledby="technical-summary-title">
              <div>
                <p className="eyebrow">Backend technical result</p>
                <h2 id="technical-summary-title">{snapshot.companyName}</h2>
                <p className="lead compact-lead">
                  The technical score blends RSI, Bollinger Bands, MACD, weighted moving average, and
                  Ichimoku into a single summary for the selected timeframe.
                </p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${snapshot.technical.tone}`}>
                  {toneLabel(snapshot.technical.aggregatedScore)}
                </p>
                <p className="score-value">{snapshot.technical.aggregatedScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${snapshot.technical.aggregatedScore}%` }} />
                </div>
                <p className="meter-caption">
                  Price window {snapshot.priceWindow.startDate} to {snapshot.priceWindow.endDate}.
                </p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Technical context">
              <article className="detail-card">
                <dt>Timeframe</dt>
                <dd>{snapshot.timeframe.label}</dd>
              </article>
              <article className="detail-card">
                <dt>Latest close</dt>
                <dd>${snapshot.priceWindow.latestClose.toFixed(2)}</dd>
              </article>
              <article className="detail-card">
                <dt>Window change</dt>
                <dd>{snapshot.priceWindow.changePercent.toFixed(1)}%</dd>
              </article>
              <article className="detail-card">
                <dt>Trading days</dt>
                <dd>{snapshot.priceWindow.tradingDays}</dd>
              </article>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="technical-signals-title">
              <p className="eyebrow">Signal stack</p>
              <h2 id="technical-signals-title">Five technical signals</h2>
              <div className="category-grid">
                {snapshot.technical.signals.map((signal) => (
                  <article key={signal.id} className="category-card">
                    <div className="category-card-header">
                      <h3>{signal.label}</h3>
                      <span className="category-score">{signal.score.toFixed(1)}</span>
                    </div>
                    <div className="meter-track small-track" aria-hidden="true">
                      <div className="meter-fill" style={{ width: `${signal.score}%` }} />
                    </div>
                    <p>{signal.summary}</p>
                    {signal.id === 'macd' ? (
                      <Link className="inline-link" to="/tools/macd">
                        Open MACD view
                      </Link>
                    ) : null}
                    {signal.id === 'ichimoku' ? (
                      <Link className="inline-link" to="/tools/ichimoku">
                        Open Ichimoku view
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="technical-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="technical-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy technical page mixed chart rendering, indicator calculation, and UI control logic in the
          browser. This replacement makes the indicator scores backend-owned and presents the results in a more
          accessible reading flow.
        </p>
        <Link className="inline-link" to="/tools">
          Return to the migration catalog
        </Link>
      </section>
    </div>
  );
}