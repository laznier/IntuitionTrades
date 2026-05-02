import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="content-panel" aria-labelledby="not-found-title">
      <p className="eyebrow">Not found</p>
      <h1 id="not-found-title">This route is not part of the public tool workspace</h1>
      <p>Use the overview or tool catalog to continue exploring the active product surface.</p>
      <Link className="button button-primary" to="/">
        Return home
      </Link>
    </section>
  );
}