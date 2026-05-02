import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Overview' },
  { to: '/tools', label: 'Tool Catalog' },
  { to: '/about', label: 'Architecture' },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand-block" aria-label="Intuition Trades Modernization">
          <p className="eyebrow">Migration Workspace</p>
          <NavLink className="brand-link" to="/">
            Intuition Trades
          </NavLink>
          <p className="brand-summary">
            Public-first market tools, hardened APIs, and an accessible React shell with no
            accounts or payments.
          </p>
        </div>
        <nav aria-label="Primary">
          <ul className="nav-list">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink
                  className={({ isActive }) =>
                    isActive ? 'nav-link nav-link-active' : 'nav-link'
                  }
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main-content" className="site-main" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <p>React migration foundation. Legacy pages remain available while tools are moved behind a modern shell.</p>
      </footer>
    </div>
  );
}