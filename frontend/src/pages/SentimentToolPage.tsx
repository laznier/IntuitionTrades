import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTickerMatches, type TickerMatch } from '../lib/fundamental-api';
import {
  fetchSentimentSummary,
  type ScoreTone,
  type SentimentBucket,
  type SentimentSummary,
} from '../lib/sentiment-api';

type AsyncState = 'idle' | 'loading' | 'success' | 'error';

function toneLabel(tone: ScoreTone) {
  if (tone === 'strong') {
    return 'Constructive coverage';
  }

  if (tone === 'balanced') {
    return 'Mixed coverage';
  }

  return 'Cautious coverage';
}

function bucketLabel(bucket: SentimentBucket) {
  if (bucket === 'positive') {
    return 'Positive';
  }

  if (bucket === 'negative') {
    return 'Negative';
  }

  return 'Neutral';
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function SentimentToolPage() {
  const listId = useId();
  const [ticker, setTicker] = useState('AAPL');
  const [selectedCompany, setSelectedCompany] = useState('Apple Inc.');
  const [matches, setMatches] = useState<TickerMatch[]>([]);
  const [status, setStatus] = useState<AsyncState>('idle');
  const [message, setMessage] = useState('Load a backend sentiment summary that turns raw news articles into a readable public feed.');
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState<SentimentSummary | null>(null);

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
      setErrorMessage('Enter a ticker symbol before loading sentiment coverage.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setMessage(`Loading a backend sentiment summary for ${normalizedTicker}.`);

    try {
      const nextSummary = await fetchSentimentSummary(normalizedTicker);
      setSummary(nextSummary);
      setTicker(nextSummary.symbol);
      setMatches([]);
      setStatus('success');
      setMessage(
        `Loaded ${nextSummary.articleCount} sentiment articles with an average score of ${nextSummary.averageScore.toFixed(1)}.`,
      );
    } catch (error) {
      setSummary(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load sentiment coverage.');
      setMessage('The sentiment request failed.');
    }
  }

  function handleMatchSelection(match: TickerMatch) {
    setTicker(match.symbol);
    setSelectedCompany(match.name);
    setMatches([]);
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="sentiment-tool-title">
        <p className="eyebrow">Fourth live migration slice</p>
        <h1 id="sentiment-tool-title">Market sentiment</h1>
        <p className="lead compact-lead">
          This React version turns raw news sentiment articles into a backend-normalized report with
          article scoring, trend context, and an accessible reading surface.
        </p>

        <form className="tool-form" onSubmit={handleSubmit}>
          <div className="tool-form-grid">
            <div className="field-stack autocomplete-field">
              <label className="field-label" htmlFor="sentiment-ticker">
                Ticker symbol
              </label>
              <input
                id="sentiment-ticker"
                className="search-input"
                type="text"
                value={ticker}
                autoComplete="off"
                aria-describedby="sentiment-ticker-hint"
                aria-controls={listId}
                aria-expanded={matches.length > 0}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
              />
              <p id="sentiment-ticker-hint" className="field-help">
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
              {status === 'loading' ? 'Loading sentiment' : 'Load sentiment'}
            </button>
            <a className="button button-secondary" href="/sentiment/">
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
            <section className="hero-score-card" aria-labelledby="sentiment-summary-title">
              <div>
                <p className="eyebrow">Normalized coverage result</p>
                <h2 id="sentiment-summary-title">{summary.symbol}</h2>
                <p className="lead compact-lead">{summary.description}</p>
              </div>
              <div className="score-meter-card">
                <p className={`score-tone score-tone-${summary.tone}`}>{toneLabel(summary.tone)}</p>
                <p className="score-value">{summary.averageScore.toFixed(1)}</p>
                <div className="meter-track" aria-hidden="true">
                  <div className="meter-fill" style={{ width: `${summary.averageScore}%` }} />
                </div>
                <p className="meter-caption">
                  Average normalized article score from the current backend sentiment feed.
                </p>
              </div>
            </section>

            <section className="detail-grid" aria-label="Sentiment summary details">
              <article className="detail-card">
                <dt>Matched articles</dt>
                <dd>{summary.articleCount}</dd>
              </article>
              <article className="detail-card">
                <dt>Latest article</dt>
                <dd>{dateTimeFormatter.format(new Date(summary.latestPublishedAt))}</dd>
              </article>
              <article className="detail-card">
                <dt>Trend slope</dt>
                <dd>{summary.trendSlope.toFixed(2)}</dd>
              </article>
              <article className="detail-card">
                <dt>Coverage mix</dt>
                <dd>
                  {summary.positiveCount} positive · {summary.neutralCount} neutral · {summary.negativeCount} negative
                </dd>
              </article>
            </section>

            <section className="detail-grid" aria-label="Sentiment distribution">
              <article className="detail-card">
                <dt>Positive articles</dt>
                <dd>{summary.positiveCount}</dd>
              </article>
              <article className="detail-card">
                <dt>Neutral articles</dt>
                <dd>{summary.neutralCount}</dd>
              </article>
              <article className="detail-card">
                <dt>Negative articles</dt>
                <dd>{summary.negativeCount}</dd>
              </article>
              <article className="detail-card">
                <dt>Backend model</dt>
                <dd>Per-article ticker sentiment normalized to a 0-100 scale.</dd>
              </article>
            </section>

            <section className="content-panel nested-panel" aria-labelledby="sentiment-feed-title">
              <p className="eyebrow">Article feed</p>
              <h2 id="sentiment-feed-title">Recent matched articles</h2>
              <div className="article-list">
                {summary.articles.map((article) => (
                  <article key={article.id} className="article-card">
                    <div className="article-card-header">
                      <span className={`status-pill status-article-${article.bucket}`}>{bucketLabel(article.bucket)}</span>
                      <span className="field-help">{article.score.toFixed(1)}</span>
                    </div>
                    <h3>{article.headline}</h3>
                    <p>{article.summary}</p>
                    <p className="field-help">
                      {article.source} · {dateTimeFormatter.format(new Date(article.publishedAt))}
                    </p>
                    {article.url ? (
                      <a className="inline-link" href={article.url} target="_blank" rel="noreferrer">
                        Read source article
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </section>

      <section className="content-panel nested-panel" aria-labelledby="sentiment-migration-note-title">
        <p className="eyebrow">Migration note</p>
        <h2 id="sentiment-migration-note-title">Why this slice matters</h2>
        <p>
          The legacy sentiment page fetched raw feed data and built the article normalization logic in
          the browser. This replacement keeps the product public while shifting scoring and trend
          calculation behind a single backend response.
        </p>
        <Link className="inline-link" to="/tools">
          Return to the migration catalog
        </Link>
      </section>
    </div>
  );
}