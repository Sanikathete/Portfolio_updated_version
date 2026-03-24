import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Stocks', path: '/stocks' },
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Watchlist', path: '/watchlist' },
  { label: 'Growth', path: '/growth' },
  { label: 'ML Analysis', path: '/ml-analysis' },
  { label: 'Compare', path: '/compare' },
  { label: 'Gold Silver', path: '/gold-silver' },
  { label: 'Crypto', path: '/crypto' },
  { label: 'News', path: '/news' },
  { label: 'AI Chat', path: '/chat' },
];

const Sidebar = () => (
  <aside
    style={{
      position: 'fixed',
      left: 0,
      top: 44,
      width: 200,
      height: 'calc(100vh - 44px)',
      background: 'var(--bg-panel)',
      borderRight: '0.5px solid var(--border)',
      overflowY: 'auto',
      zIndex: 99,
    }}
  >
    <nav style={{ padding: '12px 0' }}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          style={({ isActive }) => ({
            display: 'block',
            padding: '10px 16px',
            fontSize: 12,
            color: isActive ? '#7eb8f7' : '#64748b',
            background: isActive ? '#1a2d50' : 'transparent',
            borderLeft: isActive ? '2px solid #7eb8f7' : '2px solid transparent',
            boxShadow: isActive ? 'inset 2px 0 8px rgba(126,184,247,0.25)' : 'none',
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  </aside>
);

export default Sidebar;
