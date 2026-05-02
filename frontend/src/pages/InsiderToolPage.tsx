import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTickerMatches, type TickerMatch } from '../lib/fundamental-api';
import {
  fetchInsiderSentiment,
  fetchInsiderTransactions,
  type InsiderSentimentPoint,
  type InsiderTransaction,
} from '../lib/insider-api';
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

function formatMonthLabel(point: InsiderSentimentPoint) {
  return `${String(point.month).padStart(2, '0')}/${point.year}`;
}

function filterTransactions(
  transactions: InsiderTransaction[],
  periodMonths: number,
  lastPrice: number,
) {
  const lowerBound = lastPrice * 0.5;
  const upperBound = lastPrice * 1.5;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - periodMonths);

  return transactions
    .filter((transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      if (Number.isNaN(transactionDate.getTime()) || transactionDate < cutoff) {
        return false;
      }

      if (!transaction.sharePrice) {
        return false;
      }

      return transaction.sharePrice >= lowerBound && transaction.sharePrice <= upperBound;
    })
    .sort((left, right) => left.transactionDate.localeCompare(right.transactionDate));
}

export function InsiderToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load insider activity and MSPR trend data for a selected ticker.');
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState<StockSnapshot | null>(null);
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([]);
  const [sentimentPoints, setSentimentPoints] = useState<InsiderSentimentPoint[]>([]);

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
      setErrorMessage('Enter a ticker symbol before loading insider data.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading insider filings and MSPR trend data for ${normalizedTicker}.`);

    try {
      const nextSnapshot = await fetchStockSnapshot(normalizedTicker, timeframe);
      const [rawTransactions, nextSentimentPoints] = await Promise.all([
        fetchInsiderTransactions(normalizedTicker),
        fetchInsiderSentiment(normalizedTicker, nextSnapshot.timeframe.periodMonths),
      ]);

      const filteredTransactions = filterTransactions(
        rawTransactions,
        nextSnapshot.timeframe.periodMonths,
        nextSnapshot.priceWindow.latestClose,
      );

      setSnapshot(nextSnapshot);
      setTransactions(filteredTransactions);
      setSentimentPoints(nextSentimentPoints);
      setSelectedCompany(nextSnapshot.companyName);
      setTicker(nextSnapshot.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(
        `Loaded ${filteredTransactions.length} insider filings with an aggregate score of ${nextSnapshot.insider.aggregatedScore.toFixed(1)}.`,
      );
    } catch (error) {
      setSnapshot(null);
      setTransactions([]);
      setSentimentPoints([]);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load insider data.');
      setMessage('The insider request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  const totalBuyTransactions = transactions.filter((transaction) => transaction.type === 'A');
  const totalSellTransactions = transactions.filter((transaction) => transaction.type === 'D');

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="insider-tool-title">
        <p className="eyebrow">Ninth live migration slice</p>
        <h1 id="insider-tool-title">Insider activity</h1>
        <p className="lead compact-lead">
          This React version keeps the insider score on the backend stock snapshot, then pairs it with filtered filings and MSPR trend points from the hardened public routes.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="insider-ticker">
                Ticker symbol
              </label>
              <input
                id="insider-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="insider-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="insider-ticker-hint" className="field-help">
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
              <label className="field-label" htmlFor="insider-timeframe">
                Timeframe
              </label>
              <select
                id="insider-timeframe"
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
              {status === 'loading' ? 'Loading insider data' : 'Run insider view'}
            </button>
            <a className="button button-secondary" href="/insider/">
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
            <section className="hero-score-card" aria-labelledby="insider-summary-title">
              <div>
                <p className="eyebrow">Backend insider result</p>
                <h2 id="insider-summary-title">{snapshot.companyName}</h2>
                <p className="lead compact-lead">{snapshot.insider.summary}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${snapshot.insider.tone}`}>Insider sentiment profile</p>
                <p className="score-value">{snapshot.insider.aggregatedScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${snapshot.insider.aggregatedScore}%` }} />
                </div>
                <p className="meter-caption">Based on transaction balance, latest MSPR, and trend context.</p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Insider metrics">
              <article className="detail-card">
                <dt>Buys</dt>
                <dd>{snapshot.insider.totalBuys.toLocaleString()} shares</dd>
              </article>
              <article className="detail-card">
                <dt>Sells</dt>
                <dd>{snapshot.insider.totalSells.toLocaleString()} shares</dd>
              </article>
              <article className="detail-card">
                <dt>Transaction balance</dt>
                <dd>{snapshot.insider.transactionScore.toFixed(1)}</dd>
              </article>
              <article className="detail-card">
                <dt>Latest MSPR</dt>
                <dd>{snapshot.insider.finalMspr.toFixed(1)}</dd>
              </article>
              <article className="detail-card">
                <dt>Trend component</dt>
                <dd>{snapshot.insider.trendComponent.toFixed(1)}</dd>
              </article>
              <article className="detail-card">
                <dt>Filtered filings</dt>
                <dd>{snapshot.insider.entries}</dd>
              </article>
            </section>

            {sentimentPoints.length > 0 ? (
              <section className="content-panel nested-panel" aria-labelledby="insider-trend-title">
                <p className="eyebrow">MSPR trend</p>
                <h2 id="insider-trend-title">Monthly sentiment checkpoints</h2>
                <div className="table-wrapper">
                  <table className="metric-table">
                    <caption>Monthly insider sentiment points used to contextualize the backend score.</caption>
                    <thead>
                      <tr>
                        <th scope="col">Month</th>
                        <th scope="col">MSPR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentimentPoints.slice(-12).reverse().map((point) => (
                        <tr key={`${point.year}-${point.month}`}>
                          <th scope="row">{formatMonthLabel(point)}</th>
                          <td>{point.mspr.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {transactions.length > 0 ? (
              <section className="content-panel nested-panel" aria-labelledby="insider-filings-title">
                <p className="eyebrow">Recent filings</p>
                <h2 id="insider-filings-title">Filtered insider transactions</h2>
                <p>
                  {totalBuyTransactions.length} buy filing{totalBuyTransactions.length === 1 ? '' : 's'} and {totalSellTransactions.length} sell filing{totalSellTransactions.length === 1 ? '' : 's'} passed the legacy price-window filter.
                </p>
                <div className="table-wrapper">
                  <table className="metric-table">
                    <caption>Recent insider filings after price-range and timeframe filtering.</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Type</th>
                        <th scope="col">Shares</th>
                        <th scope="col">Price</th>
                        <th scope="col">Insider</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice().reverse().slice(0, 40).map((transaction, index) => (
                        <tr key={`${transaction.transactionDate}-${transaction.owner}-${index}`}>
                          <th scope="row">{transaction.transactionDate}</th>
                          <td>{transaction.type === 'A' ? 'Buy' : transaction.type === 'D' ? 'Sell' : transaction.type}</td>
                          <td>{transaction.shares.toLocaleString()}</td>
                          <td>${transaction.sharePrice.toFixed(2)}</td>
                          <td>{transaction.owner}</td>
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

      <section className="content-panel nested-panel" aria-labelledby="insider-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="insider-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy insider page mixed direct provider fetches, charting, and client-side score math. This version keeps the score backend-owned and only uses the raw routes for transparent supporting detail.
        </p>
        <Link className="inline-link" to="/tools/stocks">
          Open the combined stock snapshot
        </Link>
      </section>
    </div>
  );
}