import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/', icon: 'HM', label: 'Home' },
  { path: '/dashboard', icon: 'DB', label: 'Dashboard' },
  { path: '/stocks', icon: 'ST', label: 'Stocks' },
  { path: '/portfolio', icon: 'PF', label: 'Portfolio' },
  { path: '/watchlist', icon: 'WL', label: 'Watchlist' },
  { path: '/growth', icon: 'GR', label: 'Growth' },
  { path: '/ml-analysis', icon: 'ML', label: 'ML Analysis' },
  { path: '/compare', icon: 'CP', label: 'Compare' },
  { path: '/gold-silver', icon: 'GS', label: 'Gold and Silver' },
  { path: '/crypto', icon: 'CR', label: 'Crypto' },
  { path: '/news', icon: 'NW', label: 'News' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { username } = useAuth();

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 44,
        bottom: 0,
        width: 200,
        background: 'linear-gradient(180deg, #0d0b1e 0%, #08051a 100%)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 800,
        overflowY: 'auto',
      }}
    >
      <nav style={{ padding: '12px 0', flex: 1 }}>
        {NAV.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                textDecoration: 'none',
                fontSize: 12,
                color: isActive ? 'var(--purple-light)' : 'var(--text-muted)',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.04) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '2px solid var(--purple)' : '2px solid transparent',
                boxShadow: isActive ? 'inset 0 0 20px rgba(124,58,237,0.08)' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(event) => {
                if (!isActive) {
                  event.currentTarget.style.color = 'var(--purple-light)';
                  event.currentTarget.style.background = 'rgba(124,58,237,0.06)';
                }
              }}
              onMouseLeave={(event) => {
                if (!isActive) {
                  event.currentTarget.style.color = 'var(--text-muted)';
                  event.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 11, width: 18, textAlign: 'center', fontWeight: 700 }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive ? (
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--purple)',
                    boxShadow: '0 0 8px var(--purple)',
                  }}
                />
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {username ? (
        <div
          style={{
            margin: 12,
            padding: 12,
            borderRadius: 10,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="label" style={{ marginBottom: 4 }}>Logged In As</div>
          <div style={{ fontSize: 12, color: 'var(--purple-light)', fontWeight: 600 }}>{username}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <span className="pulse-dot" style={{ background: 'var(--green)' }} />
            <span style={{ fontSize: 10, color: 'var(--green)' }}>Online</span>
          </div>
        </div>
      ) : null}
    </aside>
  );
};
