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

export function RiskToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load a backend risk-and-reward report for a selected ticker.');
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
      setErrorMessage('Enter a ticker symbol before loading the risk report.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading a backend risk-and-reward report for ${normalizedTicker}.`);

    try {
      const nextSnapshot = await fetchStockSnapshot(normalizedTicker, timeframe);
      setSnapshot(nextSnapshot);
      setSelectedCompany(nextSnapshot.companyName);
      setTicker(nextSnapshot.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(
        `Loaded ${nextSnapshot.companyName} with a risk score of ${nextSnapshot.risk.aggregatedScore.toFixed(1)}.`,
      );
    } catch (error) {
      setSnapshot(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the risk report.');
      setMessage('The risk report request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="risk-tool-title">
        <p className="eyebrow">Sixth live migration slice</p>
        <h1 id="risk-tool-title">Risk and reward</h1>
        <p className="lead compact-lead">
          This React version uses the backend risk model from the stock snapshot route so the browser no longer owns
          the simulation math or options-derived volatility handling.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="risk-ticker">
                Ticker symbol
              </label>
              <input
                id="risk-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="risk-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="risk-ticker-hint" className="field-help">
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
              <label className="field-label" htmlFor="risk-timeframe">
                Timeframe
              </label>
              <select
                id="risk-timeframe"
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
              <p className="field-help">The selected timeframe controls the simulation horizon.</p>
            </div>
          </div>

          <div className="field-stack">
            <span className="field-label">Selected company</span>
            <div className="selected-company">{selectedCompany || 'No company selected yet'}</div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading risk report' : 'Run risk report'}
            </button>
            <a className="button button-secondary" href="/risk/">
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
            <section className="hero-score-card" aria-labelledby="risk-summary-title">
              <div>
                <p className="eyebrow">Backend risk result</p>
                <h2 id="risk-summary-title">{snapshot.companyName}</h2>
                <p className="lead compact-lead">{snapshot.risk.summary}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${snapshot.risk.tone}`}>Risk and reward profile</p>
                <p className="score-value">{snapshot.risk.aggregatedScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${snapshot.risk.aggregatedScore}%` }} />
                </div>
                <p className="meter-caption">{snapshot.risk.simulationCount} seeded simulations.</p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Risk metrics">
              <article className="detail-card">
                <dt>Current price</dt>
                <dd>${snapshot.risk.currentPrice.toFixed(2)}</dd>
              </article>
              <article className="detail-card">
                <dt>Median simulated price</dt>
                <dd>${snapshot.risk.medianPrice.toFixed(2)}</dd>
              </article>
              <article className="detail-card">
                <dt>Probability above current</dt>
                <dd>{snapshot.risk.probabilityAboveCurrent.toFixed(1)}%</dd>
              </article>
              <article className="detail-card">
                <dt>Annual volatility</dt>
                <dd>{(snapshot.risk.annualVolatility * 100).toFixed(1)}%</dd>
              </article>
              <article className="detail-card">
                <dt>Value at risk</dt>
                <dd>{snapshot.risk.varPct.toFixed(1)}%</dd>
              </article>
              <article className="detail-card">
                <dt>Conditional value at risk</dt>
                <dd>{snapshot.risk.cvarPct.toFixed(1)}%</dd>
              </article>
              <article className="detail-card detail-card-wide">
                <dt>Volatility source</dt>
                <dd>
                  {snapshot.risk.impliedVolatility === null
                    ? 'Historical volatility fallback was used because no option IV was returned.'
                    : `Option IV was available at ${(snapshot.risk.impliedVolatility * 100).toFixed(1)}%.`}
                </dd>
              </article>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="risk-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="risk-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy risk page combined charting, option-chain handling, and model logic in the browser. This React
          version exposes only the backend risk report so the core model stays server-owned.
        </p>
        <Link className="inline-link" to="/tools/stocks">
          Open the combined stock snapshot
        </Link>
      </section>
    </div>
  );
}