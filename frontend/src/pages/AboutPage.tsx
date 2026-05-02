export function AboutPage() {
  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="about-title">
        <p className="eyebrow">Architecture direction</p>
        <h1 id="about-title">Modernization goals</h1>
        <div className="narrative-grid">
          <article className="narrative-card">
            <h2>Frontend</h2>
            <p>
              Replace hand-maintained HTML pages with a typed React app, shared navigation, reusable
              layouts, and route-level accessibility standards.
            </p>
          </article>
          <article className="narrative-card">
            <h2>Backend</h2>
            <p>
              Move proprietary scoring, aggregation, and market-data orchestration into protected
              server modules with validation, caching, and rate protection.
            </p>
          </article>
          <article className="narrative-card">
            <h2>Product policy</h2>
            <p>
              Remove login, premium, subscription, and payment flows. The new product is public
              research software, not an account-driven platform.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}