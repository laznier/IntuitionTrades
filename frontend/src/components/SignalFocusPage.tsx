import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FundamentalCategory } from '../lib/fundamental-api';
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
    return 'Strong footing';
  }

  if (score >= 45) {
    return 'Mixed profile';
  }

  return 'Fragile profile';
}

type SignalFocusPageProps = {
  eyebrow: string;
  title: string;
  lead: string;
  signalId: string;
  signalLabel: string;
  signalDescription: string;
  legacyPath: string;
};

export function SignalFocusPage({
  eyebrow,
  title,
  lead,
  signalId,
  signalLabel,
  signalDescription,
  legacyPath,
}: SignalFocusPageProps) {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<StockTimeframe>('medium');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState(`Load a backend ${signalLabel} summary for a selected ticker.`);
  const [errorMessage, setErrorMessage] = useState('');
  const [snapshot, setSnapshot] = useState<StockSnapshot | null>(null);
  const [signal, setSignal] = useState<FundamentalCategory | null>(null);

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
      setErrorMessage('Enter a ticker symbol before loading the signal.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading a backend ${signalLabel} summary for ${normalizedTicker}.`);

    try {
      const nextSnapshot = await fetchStockSnapshot(normalizedTicker, timeframe);
      const nextSignal = nextSnapshot.technical.signals.find((candidate) => candidate.id === signalId) ?? null;

      if (!nextSignal) {
        throw new Error(`No ${signalLabel} data was available for this symbol.`);
      }

      setSnapshot(nextSnapshot);
      setSignal(nextSignal);
      setSelectedCompany(nextSnapshot.companyName);
      setTicker(nextSnapshot.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(`Loaded ${nextSnapshot.companyName} with a ${signalLabel} score of ${nextSignal.score.toFixed(1)}.`);
    } catch (error) {
      setSnapshot(null);
      setSignal(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the indicator summary.');
      setMessage('The indicator request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby={`${signalId}-tool-title`}>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id={`${signalId}-tool-title`}>{title}</h1>
        <p className="lead compact-lead">{lead}</p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor={`${signalId}-ticker`}>
                Ticker symbol
              </label>
              <input
                id={`${signalId}-ticker`}
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby={`${signalId}-ticker-hint`}
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id={`${signalId}-ticker-hint`} className="field-help">
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
              <label className="field-label" htmlFor={`${signalId}-timeframe`}>
                Timeframe
              </label>
              <select
                id={`${signalId}-timeframe`}
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
              <p className="field-help">The backend uses this timeframe to build the signal context.</p>
            </div>
          </div>

          <div className="field-stack">
            <span className="field-label">Selected company</span>
            <div className="selected-company">{selectedCompany || 'No company selected yet'}</div>
          </div>

          <div className="tool-actions">
            <button className="button button-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Loading signal' : `Run ${signalLabel}`}
            </button>
            <a className="button button-secondary" href={legacyPath}>
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

        {snapshot && signal ? (
          <div className="analysis-stack">
            <section className="hero-score-card" aria-labelledby={`${signalId}-summary-title`}>
              <div>
                <p className="eyebrow">Server-owned signal</p>
                <h2 id={`${signalId}-summary-title`}>{snapshot.companyName}</h2>
                <p className="lead compact-lead">{signalDescription}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${snapshot.technical.tone}`}>{toneLabel(signal.score)}</p>
                <p className="score-value">{signal.score.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${signal.score}%` }} />
                </div>
                <p className="meter-caption">{signal.summary}</p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Signal context">
              <article className="detail-card">
                <dt>Overall technical score</dt>
                <dd>{snapshot.technical.aggregatedScore.toFixed(1)}</dd>
              </article>
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
            </section>

            <section className="content-panel nested-panel" aria-labelledby={`${signalId}-comparison-title`}>
              <p className="eyebrow">Technical context</p>
              <h2 id={`${signalId}-comparison-title`}>Five-signal comparison</h2>
              <div className="category-grid">
                {snapshot.technical.signals.map((candidate) => (
                  <article key={candidate.id} className="category-card">
                    <div className="category-card-header">
                      <h3>{candidate.label}</h3>
                      <span className="category-score">{candidate.score.toFixed(1)}</span>
                    </div>
                    <div className="meter-track small-track" aria-hidden="true">
                      <div className="meter-fill" style={{ width: `${candidate.score}%` }} />
                    </div>
                    <p>{candidate.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby={`${signalId}-migration-note-title`}>
        <p className="eyebrow">Migration note</p>
        <h2 id={`${signalId}-migration-note-title`}>Why this slice matters</h2>
        <p>
          The legacy page computed indicator math directly in the browser. This React replacement reuses
          the backend stock snapshot so the client only renders the selected signal and its context.
        </p>
        <Link className="inline-link" to="/tools/technical">
          Open the full technical view
        </Link>
      </section>
    </div>
  );
}