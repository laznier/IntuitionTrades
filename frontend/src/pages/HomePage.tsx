import { Link } from 'react-router-dom';
import { tools } from '../data/tools';

const featuredTools = tools.slice(0, 4);

export function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero-panel" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">Live Product Surface</p>
          <h1 id="home-title">Accessible market research tools with backend-owned scoring</h1>
          <p className="lead">
            Intuition Trades now centers on public market research tools with hardened APIs,
            server-owned calculations, and an accessible React shell. Accounts, billing, and
            payment gating are retired.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="button button-primary" to="/tools">
            Open tool workspace
          </Link>
          <Link className="button button-secondary" to="/about">
            Read architecture notes
          </Link>
        </div>
      </section>

      <section className="stat-grid" aria-label="Migration principles">
        <article className="stat-card">
          <h2>No accounts</h2>
          <p>Authentication, roles, anonymous usage tracking, and premium gating have been removed.</p>
        </article>
        <article className="stat-card">
          <h2>Secure compute</h2>
          <p>Proprietary formulas move behind server-only modules so the client only receives results.</p>
        </article>
        <article className="stat-card">
          <h2>Accessible by default</h2>
          <p>Keyboard flow, focus handling, readable contrast, and chart alternatives are part of the baseline.</p>
        </article>
      </section>

      <section className="content-panel" aria-labelledby="featured-tools-title">
        <div className="section-heading">
          <p className="eyebrow">Featured tools</p>
          <h2 id="featured-tools-title">Start with the core public workflows</h2>
        </div>
        <div className="tool-grid">
          {featuredTools.map((tool) => (
            <article key={tool.slug} className="tool-card">
              <p className="tool-category">{tool.category}</p>
              <h3>{tool.name}</h3>
              <p>{tool.summary}</p>
              <p className="tool-focus">{tool.migrationFocus}</p>
              <Link className="inline-link" to={`/tools/${tool.slug}`}>
                Open tool
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}