import { Link, useParams } from 'react-router-dom';
import { getToolBySlug } from '../data/tools';

export function ToolDetailPage() {
  const { toolSlug } = useParams();
  const tool = toolSlug ? getToolBySlug(toolSlug) : undefined;

  if (!tool) {
    return (
      <section className="content-panel" aria-labelledby="tool-not-found-title">
        <p className="eyebrow">Unknown tool</p>
        <h1 id="tool-not-found-title">This tool entry does not exist</h1>
        <p>The catalog entry was not found. Use the tool index to continue.</p>
        <Link className="button button-primary" to="/tools">
          Back to tool catalog
        </Link>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="content-panel" aria-labelledby="tool-detail-title">
        <p className="eyebrow">{tool.category}</p>
        <h1 id="tool-detail-title">{tool.name}</h1>
        <p className="lead compact-lead">{tool.summary}</p>

        <dl className="detail-grid">
          <div className="detail-card">
            <dt>Status</dt>
            <dd>{tool.status.replace('-', ' ')}</dd>
          </div>
          <div className="detail-card">
            <dt>Legacy route</dt>
            <dd>{tool.legacyPath}</dd>
          </div>
          <div className="detail-card detail-card-wide">
            <dt>Current design focus</dt>
            <dd>{tool.migrationFocus}</dd>
          </div>
        </dl>

        <div className="callout">
          <h2>How this tool is framed</h2>
          <p>
            The React version avoids client-side proprietary formulas and keeps loading, error, and
            accessibility behavior consistent across the public tool workspace.
          </p>
        </div>

        <div className="tool-actions">
          <a className="button button-primary" href={tool.legacyPath}>
            Open legacy fallback
          </a>
          <Link className="button button-secondary" to="/tools">
            Return to catalog
          </Link>
        </div>
      </section>
    </div>
  );
}