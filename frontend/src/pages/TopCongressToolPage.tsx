import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTopCongressTrades, type CongressTrade } from '../lib/congress-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

function compareTradeDates(left: CongressTrade, right: CongressTrade) {
  return String(right.transactionDate || '').localeCompare(String(left.transactionDate || ''));
}

export function TopCongressToolPage() {
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load the latest congressional trading feed from the hardened bulk endpoint.');
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [trades, setTrades] = useState<CongressTrade[]>([]);

  useEffect(() => {
    void loadTrades();
  }, []);

  async function loadTrades() {
    setStatus('loading');
    setErrorMessage('');
    setMessage('Loading the bulk congressional trading feed.');

    try {
      const nextTrades = (await fetchTopCongressTrades()).sort(compareTradeDates);
      setTrades(nextTrades);
      setStatus('success');
      setMessage(`Loaded ${nextTrades.length} congressional trade records from the public bulk feed.`);
    } catch (error) {
      setTrades([]);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the congressional trading feed.');
      setMessage('The congressional feed request failed.');
    }
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTrades = trades.filter((trade) => {
    if (!normalizedQuery) {
      return true;
    }

    return [trade.ticker, trade.member, trade.transaction, trade.description]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="top-congress-tool-title">
        <p className="eyebrow">Public congressional feed</p>
        <h1 id="top-congress-tool-title">Top Congress picks</h1>
        <p className="lead compact-lead">
          This React tool exposes a public, searchable congressional trade feed backed by the hardened bulk Quiver route.
        </p>

        <div className="tool-actions">
          <button className="button button-primary" type="button" onClick={() => void loadTrades()} disabled={status === 'loading'}>
            {status === 'loading' ? 'Refreshing feed' : 'Refresh feed'}
          </button>
          <a className="button button-secondary" href="/topcongress/">
            Open legacy page
          </a>
        </div>

        <label className="field-label" htmlFor="top-congress-search">
          Filter the feed
        </label>
        <input
          id="top-congress-search"
          className="search-input"
          type="search"
          value={query}
          placeholder="Search by ticker, member, or transaction"
          onChange={(event) => setQuery(event.target.value)}
        />

        <p className="assistive-status" aria-live="polite">
          {message}
        </p>

        {status === 'error' && errorMessage ? (
          <div className="error-banner" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {filteredTrades.length > 0 ? (
          <div className="analysis-stack">
            <section className="detail-grid" aria-label="Congress feed context">
              <article className="detail-card">
                <dt>Records shown</dt>
                <dd>{filteredTrades.length}</dd>
              </article>
              <article className="detail-card">
                <dt>Latest filing</dt>
                <dd>{filteredTrades[0]?.transactionDate || 'Unavailable'}</dd>
              </article>
              <article className="detail-card detail-card-wide">
                <dt>Coverage</dt>
                <dd>
                  The feed is sortable and searchable without login, billing, or usage gating.
                </dd>
              </article>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="top-congress-table-title">
              <p className="eyebrow">Recent activity</p>
              <h2 id="top-congress-table-title">Congressional trading feed</h2>
              <div className="table-wrapper">
                <table className="metric-table">
                  <caption>Recent congressional trades returned by the hardened bulk route.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Ticker</th>
                      <th scope="col">Member</th>
                      <th scope="col">Transaction</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.slice(0, 60).map((trade, index) => (
                      <tr key={`${trade.ticker}-${trade.member}-${trade.transactionDate}-${index}`}>
                        <th scope="row">{trade.transactionDate || 'Unavailable'}</th>
                        <td>{trade.ticker}</td>
                        <td>{trade.member}</td>
                        <td>{trade.transaction}</td>
                        <td>{trade.amountText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="top-congress-migration-note-title">
        <p className="eyebrow">Design note</p>
        <h2 id="top-congress-migration-note-title">Why this workflow is different</h2>
        <p>
          The old top-congress page carried account-era framing. This version keeps the tool public and exposes the bulk feed through a simpler searchable table.
        </p>
        <Link className="inline-link" to="/tools/congress">
          Open the per-ticker Congress view
        </Link>
      </section>
    </div>
  );
}