import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'Home' },
  { to: '/tools', label: 'Tools' },
  { to: '/about', label: 'Architecture' },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="brand-block" aria-label="Intuition Trades">
          <p className="eyebrow">Public Research Platform</p>
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
        <p>Accessible public market research tools with backend-owned scoring and legacy fallbacks only where compatibility still matters.</p>
      </footer>
    </div>
  );
}