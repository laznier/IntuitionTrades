import { Link } from 'react-router-dom';
import { tools } from '../data/tools';

const featuredTools = tools.slice(0, 4);

export function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero-panel" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow">Phase 1 Foundation</p>
          <h1 id="home-title">A safer, clearer front end for public market research</h1>
          <p className="lead">
            This React workspace starts the migration away from static page sprawl, Firebase
            identity, and Stripe-driven gating. The target is a public, accessible product with
            backend-protected proprietary logic and stronger API boundaries.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="button button-primary" to="/tools">
            Browse tool migration
          </Link>
          <Link className="button button-secondary" to="/about">
            Review architecture goals
          </Link>
        </div>
      </section>

      <section className="stat-grid" aria-label="Migration principles">
        <article className="stat-card">
          <h2>No accounts</h2>
          <p>Authentication, roles, anonymous usage tracking, and premium gating are being removed.</p>
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
          <p className="eyebrow">Now in scope</p>
          <h2 id="featured-tools-title">Priority tools for the first migration wave</h2>
        </div>
        <div className="tool-grid">
          {featuredTools.map((tool) => (
            <article key={tool.slug} className="tool-card">
              <p className="tool-category">{tool.category}</p>
              <h3>{tool.name}</h3>
              <p>{tool.summary}</p>
              <p className="tool-focus">{tool.migrationFocus}</p>
              <Link className="inline-link" to={`/tools/${tool.slug}`}>
                View migration notes
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}