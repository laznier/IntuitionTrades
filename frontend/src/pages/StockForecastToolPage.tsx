import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchTickerMatches,
  type TickerMatch,
} from '../lib/fundamental-api';
import {
  fetchStockSnapshot,
  type ScoreTone,
  type StockSnapshot,
  type StockTimeframe,
} from '../lib/stock-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

const timeframeOptions: Array<{ value: StockTimeframe; label: string }> = [
  { value: 'short', label: 'Short term' },
  { value: 'medium', label: 'Medium term' },
  { value: 'long', label: 'Long term' },
];

function toneLabel(tone: ScoreTone) {
  if (tone === 'strong') {
    return 'Strong footing';
  }

  if (tone === 'balanced') {
    return 'Mixed profile';
  }

  return 'Fragile profile';
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  signDisplay: 'always',
});

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

function formatCompactCurrency(value: number) {
  return `$${compactNumberFormatter.format(value)}`;
}

function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value);
}

export function StockForecastToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState(
    'Load a server-computed stock snapshot with technical and fundamental signals.',
  );
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
      setErrorMessage('Enter a ticker symbol before running the snapshot.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading a backend stock snapshot for ${normalizedTicker}.`);

    try {
      const nextSnapshot = await fetchStockSnapshot(normalizedTicker, timeframe);
      setSnapshot(nextSnapshot);
      setSelectedCompany(nextSnapshot.companyName);
      setTicker(nextSnapshot.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(
        `Loaded ${nextSnapshot.companyName} with a combined score of ${nextSnapshot.combinedScore.toFixed(1)}.`,
      );
    } catch (error) {
      setSnapshot(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the stock snapshot.');
      setMessage('The stock snapshot request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="stock-tool-title">
        <p className="eyebrow">Second live migration slice</p>
        <h1 id="stock-tool-title">Stock forecast snapshot</h1>
        <p className="lead compact-lead">
          This React version moves the full six-signal stock score behind a backend-only contract.
          The browser now receives a consolidated snapshot instead of owning the decision logic.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="stock-ticker">
                Ticker symbol
              </label>
              <input
                id="stock-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="stock-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="stock-ticker-hint" className="field-help">
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
              <label className="field-label" htmlFor="stock-timeframe">
                Investment timeframe
              </label>
              <select
                id="stock-timeframe"
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
              <p className="field-help">
                Timeframe controls the historical window used for the backend technical summary.
              </p>
            </div>
          </div>

          <div className="field-stack">
            <span className="field-label">Selected company</span>
            <div className="selected-company">{selectedCompany || 'No company selected yet'}</div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading snapshot' : 'Run snapshot'}
            </button>
            <a className="button button-secondary" href="/stocks/">
              Open legacy simulator
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
            <section className="hero-score-card" aria-labelledby="stock-summary-title">
              <div>
                <p className="eyebrow">Combined result</p>
                <h2 id="stock-summary-title">{snapshot.companyName}</h2>
                <p className="lead compact-lead">{snapshot.description}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${snapshot.tone}`}>{toneLabel(snapshot.tone)}</p>
                <p className="score-value">{snapshot.combinedScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${snapshot.combinedScore}%` }} />
                </div>
                <p className="meter-caption">
                  Regime-weighted aggregate across risk, technical, sentiment, insider,
                  fundamental, and congress signals.
                </p>
              </div>
            </section>

            <aside className="callout" aria-labelledby="scope-note-title">
              <p className="eyebrow">Server-owned model</p>
              <h2 id="scope-note-title">Detected market regime: {snapshot.regime.label}</h2>
              <p>
                {snapshot.regime.summary} The backend applies a regime scale of {snapshot.regime.scale.toFixed(1)} when
                converting weighted signals into the final stock score.
              </p>
            </aside>

            <section className="detail-grid" aria-label="Snapshot context">
              <article className="detail-card">
                <dt>Timeframe</dt>
                <dd>
                  {snapshot.timeframe.label} · {snapshot.timeframe.periodMonths} month window
                </dd>
              </article>
              <article className="detail-card">
                <dt>Price window</dt>
                <dd>
                  {snapshot.priceWindow.startDate} to {snapshot.priceWindow.endDate}
                </dd>
              </article>
              <article className="detail-card">
                <dt>Latest close</dt>
                <dd>{currencyFormatter.format(snapshot.priceWindow.latestClose)}</dd>
              </article>
              <article className="detail-card">
                <dt>Window change</dt>
                <dd>{percentFormatter.format(snapshot.priceWindow.changePercent)}%</dd>
              </article>
              <article className="detail-card">
                <dt>Technical score</dt>
                <dd>
                  {snapshot.technical.aggregatedScore.toFixed(1)} · {toneLabel(snapshot.technical.tone)}
                </dd>
              </article>
              <article className="detail-card">
                <dt>Fundamental score</dt>
                <dd>
                  {snapshot.fundamental.aggregatedScore.toFixed(1)} · {toneLabel(snapshot.fundamental.tone)}
                </dd>
              </article>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="signal-mix-title">
              <p className="eyebrow">Weighted signal mix</p>
              <h2 id="signal-mix-title">Six backend signals</h2>
              <div className="category-grid">
                {snapshot.signalScores.map((signal) => (
                  <article key={signal.id} className="category-card">
                    <div className="category-card-header">
                      <h3>{signal.label}</h3>
                      <span className="category-score">{signal.score.toFixed(1)}</span>
                    </div>
                    <div className="meter-track small-track" aria-hidden="true">
                      <div className="meter-fill" style={{ width: `${signal.score}%` }} />
                    </div>
                    <p>{signal.summary}</p>
                    <p className="field-help">
                      Weight {(signal.weight * 100).toFixed(0)}% · weighted contribution{' '}
                      {signal.weightedContribution.toFixed(1)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="risk-summary-title">
              <p className="eyebrow">Risk model</p>
              <h2 id="risk-summary-title">Risk and reward snapshot</h2>
              <p>{snapshot.risk.summary}</p>
              <div className="detail-grid">
                <article className="detail-card">
                  <dt>Risk score</dt>
                  <dd>
                    {snapshot.risk.aggregatedScore.toFixed(1)} · {toneLabel(snapshot.risk.tone)}
                  </dd>
                </article>
                <article className="detail-card">
                  <dt>Median simulated price</dt>
                  <dd>{currencyFormatter.format(snapshot.risk.medianPrice)}</dd>
                </article>
                <article className="detail-card">
                  <dt>Probability above current</dt>
                  <dd>{snapshot.risk.probabilityAboveCurrent.toFixed(1)}%</dd>
                </article>
                <article className="detail-card">
                  <dt>VaR / CVaR</dt>
                  <dd>
                    {snapshot.risk.varPct.toFixed(1)}% / {snapshot.risk.cvarPct.toFixed(1)}%
                  </dd>
                </article>
                <article className="detail-card">
                  <dt>Annual volatility</dt>
                  <dd>{(snapshot.risk.annualVolatility * 100).toFixed(1)}%</dd>
                </article>
                <article className="detail-card">
                  <dt>Implied volatility source</dt>
                  <dd>
                    {snapshot.risk.impliedVolatility === null
                      ? 'Fallback to historical volatility'
                      : `${(snapshot.risk.impliedVolatility * 100).toFixed(1)}% option IV`}
                  </dd>
                </article>
              </div>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="flow-signals-title">
              <p className="eyebrow">Flow signals</p>
              <h2 id="flow-signals-title">Sentiment, insider, and congress context</h2>
              <div className="category-grid">
                <article className="category-card">
                  <div className="category-card-header">
                    <h3>Sentiment</h3>
                    <span className="category-score">{snapshot.sentiment.aggregatedScore.toFixed(1)}</span>
                  </div>
                  <div className="meter-track small-track" aria-hidden="true">
                    <div className="meter-fill" style={{ width: `${snapshot.sentiment.aggregatedScore}%` }} />
                  </div>
                  <p>{snapshot.sentiment.summary}</p>
                  <p className="field-help">
                    {snapshot.sentiment.articleCount} articles · {snapshot.sentiment.dataPoints} time buckets · avg{' '}
                    {snapshot.sentiment.averageScore.toFixed(1)}
                  </p>
                </article>
                <article className="category-card">
                  <div className="category-card-header">
                    <h3>Insider</h3>
                    <span className="category-score">{snapshot.insider.aggregatedScore.toFixed(1)}</span>
                  </div>
                  <div className="meter-track small-track" aria-hidden="true">
                    <div className="meter-fill" style={{ width: `${snapshot.insider.aggregatedScore}%` }} />
                  </div>
                  <p>{snapshot.insider.summary}</p>
                  <p className="field-help">
                    Buys {formatCompactNumber(snapshot.insider.totalBuys)} · sells{' '}
                    {formatCompactNumber(snapshot.insider.totalSells)} · MSPR {snapshot.insider.finalMspr.toFixed(1)}
                  </p>
                </article>
                <article className="category-card">
                  <div className="category-card-header">
                    <h3>Congress</h3>
                    <span className="category-score">{snapshot.congress.aggregatedScore.toFixed(1)}</span>
                  </div>
                  <div className="meter-track small-track" aria-hidden="true">
                    <div className="meter-fill" style={{ width: `${snapshot.congress.aggregatedScore}%` }} />
                  </div>
                  <p>{snapshot.congress.summary}</p>
                  <p className="field-help">
                    Purchases {formatCompactCurrency(snapshot.congress.totalPurchase)} · sales{' '}
                    {formatCompactCurrency(snapshot.congress.totalSale)}
                  </p>
                </article>
              </div>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="technical-breakdown-title">
              <p className="eyebrow">Technical breakdown</p>
              <h2 id="technical-breakdown-title">Five technical signals</h2>
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
                  </article>
                ))}
              </div>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="stock-fundamental-title">
              <p className="eyebrow">Fundamental breakdown</p>
              <h2 id="stock-fundamental-title">Five company quality categories</h2>
              <div className="category-grid">
                {snapshot.fundamental.categoryScores.map((category) => (
                  <article key={category.id} className="category-card">
                    <div className="category-card-header">
                      <h3>{category.label}</h3>
                      <span className="category-score">{category.score.toFixed(1)}</span>
                    </div>
                    <div className="meter-track small-track" aria-hidden="true">
                      <div className="meter-fill" style={{ width: `${category.score}%` }} />
                    </div>
                    <p>{category.summary}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="stock-metrics-title">
              <p className="eyebrow">Reference metrics</p>
              <h2 id="stock-metrics-title">Company overview</h2>
              <div className="table-wrapper">
                <table className="metric-table">
                  <caption>
                    Raw company metrics returned by the backend summary for the selected symbol.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.fundamental.rawMetrics.map((metric) => (
                      <tr key={metric.label}>
                        <th scope="row">{metric.label}</th>
                        <td>{metric.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="stock-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="stock-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy stock simulator exposed scoring logic, simulation math, and multiple data-source
          calls directly in the browser. This replacement moves the six-factor score into the backend
          and leaves the legacy page as an optional deep-dive view rather than the authoritative model.
        </p>
        <Link className="inline-link" to="/tools">
          Return to the migration catalog
        </Link>
      </section>
    </div>
  );
}