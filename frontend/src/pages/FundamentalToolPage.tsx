import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchFundamentalSummary,
  fetchTickerMatches,
  type FundamentalSummary,
  type TickerMatch,
} from '../lib/fundamental-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

function toneLabel(tone: FundamentalSummary['tone']) {
  if (tone === 'strong') {
    return 'Strong footing';
  }

  if (tone === 'balanced') {
    return 'Mixed profile';
  }

  return 'Fragile profile';
}

export function FundamentalToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Enter a ticker symbol to retrieve a server-computed summary.');
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState<FundamentalSummary | null>(null);

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
      setErrorMessage('Enter a ticker symbol before running the analysis.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading a backend summary for ${normalizedTicker}.`);

    try {
      const nextSummary = await fetchFundamentalSummary(normalizedTicker);
      setSummary(nextSummary);
      setSelectedCompany(nextSummary.companyName);
      setTicker(nextSummary.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(`Loaded ${nextSummary.companyName} with an aggregate score of ${nextSummary.aggregatedScore.toFixed(1)}.`);
    } catch (error) {
      setSummary(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the analysis.');
      setMessage('The analysis request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="fundamental-tool-title">
        <p className="eyebrow">First live migration slice</p>
        <h1 id="fundamental-tool-title">Fundamental analysis</h1>
        <p className="lead compact-lead">
          This React version keeps the tool public and moves the category scoring to a backend-only
          endpoint so the browser no longer carries the calculation logic.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="fundamental-ticker">
                Ticker symbol
              </label>
              <input
                id="fundamental-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="fundamental-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="fundamental-hint" className="field-help">
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
              <span className="field-label">Selected company</span>
              <div className="selected-company">{selectedCompany || 'No company selected yet'}</div>
            </div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading analysis' : 'Run analysis'}
            </button>
            <a className="button button-secondary" href="/fundamental/">
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

        {summary ? (
          <div className="analysis-stack">
            <section className="hero-score-card" aria-labelledby="score-summary-title">
              <div>
                <p className="eyebrow">Aggregate result</p>
                <h2 id="score-summary-title">{summary.companyName}</h2>
                <p className="lead compact-lead">{summary.description}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${summary.tone}`}>{toneLabel(summary.tone)}</p>
                <p className="score-value">{summary.aggregatedScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div
                    className="meter-fill"
                    style={{ width: `${summary.aggregatedScore}%` }}
                  />
                </div>
                <p className="meter-caption">Aggregate fundamental score from five backend-computed categories.</p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Company profile details">
              <article className="detail-card">
                <dt>Sector</dt>
                <dd>{summary.sector}</dd>
              </article>
              <article className="detail-card">
                <dt>Industry</dt>
                <dd>{summary.industry}</dd>
              </article>
              <article className="detail-card">
                <dt>Exchange</dt>
                <dd>
                  {summary.exchange} · {summary.currency}
                </dd>
              </article>
              <article className="detail-card">
                <dt>Market cap</dt>
                <dd>{summary.marketCap}</dd>
              </article>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="category-title">
              <p className="eyebrow">Category breakdown</p>
              <h2 id="category-title">Five category scores</h2>
              <div className="category-grid">
                {summary.categoryScores.map((category) => (
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

            <section className="content-panel nested-panel" aria-labelledby="metrics-title">
              <p className="eyebrow">Selected raw metrics</p>
              <h2 id="metrics-title">Reference table</h2>
              <div className="table-wrapper">
                <table className="metric-table">
                  <caption>Backend-selected metrics used as quick reference for the current company overview.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.rawMetrics.map((metric) => (
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

      <section className="content-panel nested-panel" aria-labelledby="migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="migration-note-title">Why this slice matters</h2>
        <p>
          The legacy fundamental page loads scoring logic and multiple UI behaviors directly into the
          browser. This replacement starts moving that logic into the backend while preserving a
          public tool flow and using a more accessible interface.
        </p>
        <Link className="inline-link" to="/tools">
          Return to the migration catalog
        </Link>
      </section>
    </div>
  );
}