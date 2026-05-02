import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { tools } from '../data/tools';

export function ToolsPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredTools = tools.filter((tool) => {
    if (!normalizedQuery) {
      return true;
    }

    return [tool.name, tool.category, tool.summary, tool.migrationFocus]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="tool-catalog-title">
        <div className="section-heading">
          <p className="eyebrow">Tool inventory</p>
          <h1 id="tool-catalog-title">Migration catalog</h1>
          <p className="lead compact-lead">
            Each card maps a current public tool to its migration path. Until a React replacement is
            complete, the legacy page remains reachable.
          </p>
        </div>

        <label className="field-label" htmlFor="tool-search">
          Search the catalog
        </label>
        <input
          id="tool-search"
          className="search-input"
          type="search"
          name="tool-search"
          placeholder="Filter by name, category, or migration focus"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <p className="results-count" aria-live="polite">
          {filteredTools.length} tool{filteredTools.length === 1 ? '' : 's'} shown
        </p>

        <div className="tool-grid">
          {filteredTools.map((tool) => (
            <article key={tool.slug} className="tool-card tool-card-detailed">
              <div className="tool-card-header">
                <p className="tool-category">{tool.category}</p>
                <span className={`status-pill status-${tool.status}`}>{tool.status.replace('-', ' ')}</span>
              </div>
              <h2>{tool.name}</h2>
              <p>{tool.summary}</p>
              <p className="tool-focus">{tool.migrationFocus}</p>
              <div className="tool-actions">
                <Link className="inline-link" to={`/tools/${tool.slug}`}>
                  Migration detail
                </Link>
                <a className="inline-link muted-link" href={tool.legacyPath}>
                  Open legacy tool
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}