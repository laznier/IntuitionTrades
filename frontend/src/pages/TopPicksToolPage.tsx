import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTopPicks, type TopPickResult } from '../lib/scanner-api';
import type { StockTimeframe } from '../lib/stock-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

const timeframeOptions: Array<{ value: StockTimeframe; label: string }> = [
  { value: 'short', label: 'Short term' },
  { value: 'medium', label: 'Medium term' },
  { value: 'long', label: 'Long term' },
];

const presets = {
  'Mega-cap AI': ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL'],
  'Quality leaders': ['LLY', 'V', 'MA', 'COST', 'JPM', 'BRK.B'],
  'Industrial mix': ['CAT', 'DE', 'GE', 'ETN', 'PH', 'RTX'],
} as const;

function parseSymbols(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((candidate) => candidate.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

export function TopPicksToolPage() {
  const [symbolText, setSymbolText] = useState(presets['Mega-cap AI'].join(', '));
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Rank a capped shortlist through the backend stock snapshot model.');
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState<TopPickResult[]>([]);
  const [failures, setFailures] = useState<string[]>([]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbols = parseSymbols(symbolText);
    if (symbols.length === 0) {
      setStatus('error');
      setErrorMessage('Enter at least one valid ticker symbol.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Ranking ${symbols.length} ticker${symbols.length === 1 ? '' : 's'} through the backend model.`);

    try {
      const response = await fetchTopPicks(symbols, timeframe);
      setResults(response.results);
      setFailures(response.failures);
      setStatus('success');
      setMessage(`Ranked ${response.processedCount} symbol${response.processedCount === 1 ? '' : 's'} using the server-owned combined score.`);
    } catch (error) {
      setResults([]);
      setFailures([]);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to rank the shortlist.');
      setMessage('The top-picks request failed.');
    }
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="top-picks-tool-title">
        <p className="eyebrow">Eleventh live migration slice</p>
        <h1 id="top-picks-tool-title">Top picks workspace</h1>
        <p className="lead compact-lead">
          This public-first replacement drops the old index-wide scanner. Instead, it ranks a capped shortlist through the backend stock snapshot model so proprietary weighting stays server-side and provider usage stays bounded.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="field-stack">
            <label className="field-label" htmlFor="top-picks-symbols">
              Shortlist symbols
            </label>
            <textarea
              id="top-picks-symbols"
              className="search-input"
              rows={4}
              value={symbolText}
              onChange={(event) => setSymbolText(event.target.value.toUpperCase())}
            />
            <p className="field-help">Provide up to 8 comma-separated symbols. The scanner does not run full index sweeps anymore.</p>
          </div>

          <div className="tool-form-grid">
            <div className="field-stack">
              <label className="field-label" htmlFor="top-picks-timeframe">
                Timeframe
              </label>
              <select
                id="top-picks-timeframe"
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
            </div>

            <div className="field-stack">
              <span className="field-label">Quick presets</span>
              <div className="tool-actions">
                {Object.entries(presets).map(([label, symbols]) => (
                  <button
                    key={label}
                    className="button button-secondary"
                    type="button"
                    onClick={() => setSymbolText(symbols.join(', '))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Ranking shortlist' : 'Rank shortlist'}
            </button>
            <a className="button button-secondary" href="/top5/">
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

        {results.length > 0 ? (
          <div className="analysis-stack">
            <section className="content-panel nested-panel" aria-labelledby="top-picks-results-title">
              <p className="eyebrow">Ranked shortlist</p>
              <h2 id="top-picks-results-title">Combined score results</h2>
              <div className="category-grid">
                {results.map((result) => (
                  <article key={result.symbol} className="category-card">
                    <div className="category-card-header">
                      <h3>{result.symbol}</h3>
                      <span className="category-score">{result.combinedScore.toFixed(1)}</span>
                    </div>
                    <p>{result.companyName}</p>
                    <p>{result.regime.label} regime weighting</p>
                    <p>Latest close ${result.latestClose.toFixed(2)} with window change {result.changePercent.toFixed(1)}%.</p>
                    <ul className="plain-list">
                      {result.leadingSignals.map((signal) => (
                        <li key={`${result.symbol}-${signal.id}`}>
                          {signal.label}: {signal.score.toFixed(1)} at {Math.round(signal.weight * 100)}% weight
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {failures.length > 0 ? (
          <div className="callout">
            <h2>Partial failures</h2>
            <p>{failures.join(' ')}</p>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="top-picks-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="top-picks-migration-note-title">Why this slice matters</h2>
        <p>
          The retired scanner iterated across whole indexes from the browser. This version keeps the combined ranking model on the backend and limits scans to user-selected shortlists.
        </p>
        <Link className="inline-link" to="/tools/stocks">
          Open the single-symbol stock snapshot
        </Link>
      </section>
    </div>
  );
}