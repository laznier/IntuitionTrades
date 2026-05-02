import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTickerMatches, type TickerMatch } from '../lib/fundamental-api';
import { fetchAnalystSummary, type AnalystSummary, type ScoreTone } from '../lib/analyst-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  signDisplay: 'always',
});

function toneLabel(tone: ScoreTone) {
  if (tone === 'strong') {
    return 'Bullish analyst setup';
  }

  if (tone === 'balanced') {
    return 'Mixed analyst setup';
  }

  return 'Weak analyst setup';
}

export function AnalystToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load a backend analyst summary without exposing the scoring formula in the browser.');
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState<AnalystSummary | null>(null);

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
      setErrorMessage('Enter a ticker symbol before running the analyst summary.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading a backend analyst summary for ${normalizedTicker}.`);

    try {
      const nextSummary = await fetchAnalystSummary(normalizedTicker);
      setSummary(nextSummary);
      setSelectedCompany(nextSummary.companyName);
      setTicker(nextSummary.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(
        `Loaded ${nextSummary.companyName} with an analyst score of ${nextSummary.combinedScore.toFixed(1)}.`,
      );
    } catch (error) {
      setSummary(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the analyst summary.');
      setMessage('The analyst summary request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="analyst-tool-title">
        <p className="eyebrow">Third live migration slice</p>
        <h1 id="analyst-tool-title">Analyst score</h1>
        <p className="lead compact-lead">
          This React version replaces the legacy client-side formula with a backend summary that
          combines analyst recommendation breadth and target-price premium into one public report.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="analyst-ticker">
                Ticker symbol
              </label>
              <input
                id="analyst-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="analyst-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="analyst-ticker-hint" className="field-help">
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
              {status === 'loading' ? 'Loading analyst score' : 'Run analyst score'}
            </button>
            <a className="button button-secondary" href="/analyst/">
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
            <section className="hero-score-card" aria-labelledby="analyst-summary-title">
              <div>
                <p className="eyebrow">Combined analyst result</p>
                <h2 id="analyst-summary-title">{summary.companyName}</h2>
                <p className="lead compact-lead">{summary.description}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${summary.tone}`}>{toneLabel(summary.tone)}</p>
                <p className="score-value">{summary.combinedScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${summary.combinedScore}%` }} />
                </div>
                <p className="meter-caption">
                  Equal-weight blend of recommendation breadth and target-price premium.
                </p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Analyst context">
              <article className="detail-card">
                <dt>Current price</dt>
                <dd>{currencyFormatter.format(summary.currentPrice)}</dd>
              </article>
              <article className="detail-card">
                <dt>Analyst target</dt>
                <dd>{currencyFormatter.format(summary.targetPrice)}</dd>
              </article>
              <article className="detail-card">
                <dt>Implied premium</dt>
                <dd>{percentFormatter.format(summary.impliedPremiumPercent)}%</dd>
              </article>
              <article className="detail-card">
                <dt>Coverage</dt>
                <dd>
                  {summary.ratings.total} ratings · {summary.source.exchange} · {summary.source.currency}
                </dd>
              </article>
            </section>

            <aside className="callout" aria-labelledby="analyst-model-title">
              <p className="eyebrow">Backend-owned formula</p>
              <h2 id="analyst-model-title">How the analyst score is framed</h2>
              <p>
                Recommendation counts are normalized into a consensus score. The target-price gap is
                then pushed through a logistic curve so extreme upside estimates do not dominate the
                combined result.
              </p>
            </aside>

            <section className="detail-grid" aria-label="Analyst component scores">
              <article className="detail-card">
                <dt>Recommendation score</dt>
                <dd>{summary.recommendationScore.toFixed(1)}</dd>
              </article>
              <article className="detail-card">
                <dt>Target premium score</dt>
                <dd>{summary.targetPremiumScore.toFixed(1)}</dd>
              </article>
              <article className="detail-card detail-card-wide">
                <dt>Latest pricing day</dt>
                <dd>{summary.source.latestTradingDay}</dd>
              </article>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="ratings-table-title">
              <p className="eyebrow">Rating breakdown</p>
              <h2 id="ratings-table-title">Analyst recommendation counts</h2>
              <div className="table-wrapper">
                <table className="metric-table">
                  <caption>Breakdown of analyst recommendation counts used in the backend score.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Rating</th>
                      <th scope="col">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Strong buy</th>
                      <td>{summary.ratings.strongBuy}</td>
                    </tr>
                    <tr>
                      <th scope="row">Buy</th>
                      <td>{summary.ratings.buy}</td>
                    </tr>
                    <tr>
                      <th scope="row">Hold</th>
                      <td>{summary.ratings.hold}</td>
                    </tr>
                    <tr>
                      <th scope="row">Sell</th>
                      <td>{summary.ratings.sell}</td>
                    </tr>
                    <tr>
                      <th scope="row">Strong sell</th>
                      <td>{summary.ratings.strongSell}</td>
                    </tr>
                    <tr>
                      <th scope="row">Total coverage</th>
                      <td>{summary.ratings.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="analyst-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="analyst-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy analyst page fetched raw overview and price history data directly in the
          browser. This replacement keeps the experience public while shifting the scoring logic and
          provider orchestration behind a single backend contract.
        </p>
        <Link className="inline-link" to="/tools">
          Return to the migration catalog
        </Link>
      </section>
    </div>
  );
}