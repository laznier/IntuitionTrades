import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchSupportScan, type SupportScanResult } from '../lib/scanner-api';
import type { StockTimeframe } from '../lib/stock-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

const timeframeOptions: Array<{ value: StockTimeframe; label: string }> = [
  { value: 'short', label: 'Short term' },
  { value: 'medium', label: 'Medium term' },
  { value: 'long', label: 'Long term' },
];

const presets = {
  'AI leaders': ['AAPL', 'MSFT', 'NVDA', 'AMD', 'META', 'GOOGL'],
  'Industrial leaders': ['CAT', 'DE', 'GE', 'ETN', 'PH', 'RTX'],
  'Consumer quality': ['COST', 'WMT', 'MCD', 'SBUX', 'HD', 'LOW'],
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

export function SupportToolPage() {
  const [symbolText, setSymbolText] = useState(presets['AI leaders'].join(', '));
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Scan a shortlist for nearby support zones through the backend support model.');
  const [errorMessage, setErrorMessage] = useState('');
  const [results, setResults] = useState<SupportScanResult[]>([]);
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
    setMessage(`Scanning ${symbols.length} ticker${symbols.length === 1 ? '' : 's'} for nearby support zones.`);

    try {
      const response = await fetchSupportScan(symbols, timeframe);
      setResults(response.results);
      setFailures(response.failures);
      setStatus('success');
      setMessage(`Scored ${response.processedCount} symbol${response.processedCount === 1 ? '' : 's'} for support proximity.`);
    } catch (error) {
      setResults([]);
      setFailures([]);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to run the support scan.');
      setMessage('The support scan request failed.');
    }
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="support-tool-title">
        <p className="eyebrow">Twelfth live migration slice</p>
        <h1 id="support-tool-title">Support bounce scanner</h1>
        <p className="lead compact-lead">
          This public-first replacement keeps the legacy support algorithm on the backend, but it scans only submitted shortlists instead of looping through whole indexes in the browser.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="field-stack">
            <label className="field-label" htmlFor="support-symbols">
              Shortlist symbols
            </label>
            <textarea
              id="support-symbols"
              className="search-input"
              rows={4}
              value={symbolText}
              onChange={(event) => setSymbolText(event.target.value.toUpperCase())}
            />
            <p className="field-help">Provide up to 8 comma-separated symbols. The legacy all-index scan has been retired.</p>
          </div>

          <div className="tool-form-grid">
            <div className="field-stack">
              <label className="field-label" htmlFor="support-timeframe">
                Timeframe
              </label>
              <select
                id="support-timeframe"
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
              {status === 'loading' ? 'Scanning shortlist' : 'Scan shortlist'}
            </button>
            <a className="button button-secondary" href="/support/">
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
          <section className="content-panel nested-panel" aria-labelledby="support-results-title">
            <p className="eyebrow">Support candidates</p>
            <h2 id="support-results-title">Nearest support zones</h2>
            <div className="table-wrapper">
              <table className="metric-table">
                <caption>Support scan results for the submitted shortlist.</caption>
                <thead>
                  <tr>
                    <th scope="col">Ticker</th>
                    <th scope="col">Score</th>
                    <th scope="col">Latest close</th>
                    <th scope="col">Support</th>
                    <th scope="col">Touches</th>
                    <th scope="col">Distance</th>
                    <th scope="col">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.symbol}>
                      <th scope="row">{result.symbol}</th>
                      <td>{result.score}</td>
                      <td>${result.latestClose.toFixed(2)}</td>
                      <td>{result.supportPrice === null ? 'None' : `$${result.supportPrice.toFixed(2)}`}</td>
                      <td>{result.touches}</td>
                      <td>{result.distancePct === null ? 'N/A' : `${result.distancePct.toFixed(1)}%`}</td>
                      <td>{result.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {failures.length > 0 ? (
          <div className="callout">
            <h2>Partial failures</h2>
            <p>{failures.join(' ')}</p>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="support-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="support-migration-note-title">Why this slice matters</h2>
        <p>
          The old support scanner was an index crawler with client-side chart loops. This version keeps the support scoring behind a backend route and limits scans to deliberate public shortlists.
        </p>
        <Link className="inline-link" to="/tools/technical">
          Open the technical analysis view
        </Link>
      </section>
    </div>
  );
}