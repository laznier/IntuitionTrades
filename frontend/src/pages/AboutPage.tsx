export function AboutPage() {
  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="about-title">
        <p className="eyebrow">Architecture notes</p>
        <h1 id="about-title">How the platform is structured now</h1>
        <div className="narrative-grid">
          <article className="narrative-card">
            <h2>Frontend</h2>
            <p>
              The primary interface is a typed React app with shared navigation, reusable layouts,
              and route-level accessibility standards.
            </p>
          </article>
          <article className="narrative-card">
            <h2>Backend</h2>
            <p>
              Proprietary scoring, aggregation, and market-data orchestration run behind protected
              server modules with validation, caching, and rate protection.
            </p>
          </article>
          <article className="narrative-card">
            <h2>Product policy</h2>
            <p>
              The product is public research software with no login, premium, subscription, or
              payment flow.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}