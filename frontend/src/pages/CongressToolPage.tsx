import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTickerMatches, type TickerMatch } from '../lib/fundamental-api';
import { fetchCongressTrades, type CongressTrade } from '../lib/congress-api';
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

function filterTrades(trades: CongressTrade[], periodMonths: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - periodMonths);

  return trades
    .filter((trade) => {
      const transactionDate = new Date(trade.transactionDate);
      return !Number.isNaN(transactionDate.getTime()) && transactionDate >= cutoff;
    })
    .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate));
}

export function CongressToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load congressional trade activity for a selected ticker.');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState<StockSnapshot | null>(null);
  const [trades, setTrades] = useState<CongressTrade[]>([]);

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
      setErrorMessage('Enter a ticker symbol before loading congressional activity.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading congressional trade activity for ${normalizedTicker}.`);

    try {
      const nextSnapshot = await fetchStockSnapshot(normalizedTicker, timeframe);
      const rawTrades = await fetchCongressTrades(normalizedTicker);
      const filteredTrades = filterTrades(rawTrades, nextSnapshot.timeframe.periodMonths);

      setSnapshot(nextSnapshot);
      setTrades(filteredTrades);
      setSelectedCompany(nextSnapshot.companyName);
      setTicker(nextSnapshot.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(
        `Loaded ${filteredTrades.length} congressional filings with an aggregate score of ${nextSnapshot.congress.aggregatedScore.toFixed(1)}.`,
      );
    } catch (error) {
      setSnapshot(null);
      setTrades([]);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load congressional activity.');
      setMessage('The congressional activity request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  const buyTrades = trades.filter((trade) => /purchase/i.test(trade.transaction));
  const sellTrades = trades.filter((trade) => /sale/i.test(trade.transaction));

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="congress-tool-title">
        <p className="eyebrow">Tenth live migration slice</p>
        <h1 id="congress-tool-title">Congress trading</h1>
        <p className="lead compact-lead">
          This React version keeps the congressional score on the backend stock snapshot while exposing the underlying public filings as an accessible per-ticker activity table.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="congress-ticker">
                Ticker symbol
              </label>
              <input
                id="congress-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="congress-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="congress-ticker-hint" className="field-help">
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
              <label className="field-label" htmlFor="congress-timeframe">
                Timeframe
              </label>
              <select
                id="congress-timeframe"
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
          </div>

          <div className="field-stack">
            <span className="field-label">Selected company</span>
            <div className="selected-company">{selectedCompany || 'No company selected yet'}</div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading Congress data' : 'Run Congress view'}
            </button>
            <a className="button button-secondary" href="/congress/">
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
            <section className="hero-score-card" aria-labelledby="congress-summary-title">
              <div>
                <p className="eyebrow">Backend Congress result</p>
                <h2 id="congress-summary-title">{snapshot.companyName}</h2>
                <p className="lead compact-lead">{snapshot.congress.summary}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${snapshot.congress.tone}`}>Congress conviction profile</p>
                <p className="score-value">{snapshot.congress.aggregatedScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${snapshot.congress.aggregatedScore}%` }} />
                </div>
                <p className="meter-caption">Built from net buying dollars and unique buyer versus seller balance.</p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Congress metrics">
              <article className="detail-card">
                <dt>Total purchase amount</dt>
                <dd>${snapshot.congress.totalPurchase.toLocaleString()}</dd>
              </article>
              <article className="detail-card">
                <dt>Total sale amount</dt>
                <dd>${snapshot.congress.totalSale.toLocaleString()}</dd>
              </article>
              <article className="detail-card">
                <dt>Unique buyers</dt>
                <dd>{snapshot.congress.uniqueBuyCount}</dd>
              </article>
              <article className="detail-card">
                <dt>Unique sellers</dt>
                <dd>{snapshot.congress.uniqueSellCount}</dd>
              </article>
              <article className="detail-card">
                <dt>Purchase filings</dt>
                <dd>{buyTrades.length}</dd>
              </article>
              <article className="detail-card">
                <dt>Sale filings</dt>
                <dd>{sellTrades.length}</dd>
              </article>
            </section>

            {trades.length > 0 ? (
              <section className="content-panel nested-panel" aria-labelledby="congress-filings-title">
                <p className="eyebrow">Recent filings</p>
                <h2 id="congress-filings-title">Congressional trade activity</h2>
                <div className="table-wrapper">
                  <table className="metric-table">
                    <caption>Recent per-ticker congressional trades returned by the hardened route.</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Member</th>
                        <th scope="col">Transaction</th>
                        <th scope="col">Amount</th>
                        <th scope="col">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 40).map((trade, index) => (
                        <tr key={`${trade.member}-${trade.transactionDate}-${index}`}>
                          <th scope="row">{trade.transactionDate || 'Unavailable'}</th>
                          <td>{trade.member}</td>
                          <td>{trade.transaction}</td>
                          <td>{trade.amountText}</td>
                          <td>{trade.description || trade.ticker}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="congress-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="congress-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy Congress page computed totals entirely in the browser and exposed provider-shaped fields directly. This version keeps the score behind the server contract and normalizes the raw public filings for readability.
        </p>
        <Link className="inline-link" to="/tools/topcongress">
          Open the public bulk feed
        </Link>
      </section>
    </div>
  );
}