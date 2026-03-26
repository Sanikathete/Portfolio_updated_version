import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [ticker, setTicker] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/stocks/public-stocks/', {
      params: { limit: 20, include_change: 1, refresh: 1 },
    }).then((response) => {
      const data = response.data?.results || response.data || [];
      setTicker(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="page-enter" style={{ paddingTop: 44, minHeight: '100vh' }}>
      <div className="ticker-wrap">
        <div className="ticker-track">
          {[...ticker, ...ticker].map((item, index) => {
            const change = Number(item.change_percent || 0);
            return (
              <span key={`${item.symbol}-${index}`} style={{ marginRight: 28, fontSize: 11 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.symbol}</span>{' '}
                <span style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {change >= 0 ? 'UP' : 'DN'} {Math.abs(change).toFixed(2)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
        <div className="glass-card hover-lift" style={{ padding: 28 }}>
          <div style={{ fontSize: 10, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            AI-Powered Market Operating System
          </div>
          <h1 style={{ fontSize: 42, lineHeight: 1.05, fontWeight: 800, marginBottom: 16 }}>
            Build, track, and forecast your market edge with <span className="gradient-text">StockSphere</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.8, maxWidth: 720 }}>
            One frontend for stocks, portfolios, forecasts, gold, silver, crypto, and AI-assisted research. Live data,
            connected prediction curves, currency-aware pricing, and a persistent assistant widget are all integrated into
            the same workspace.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <Link to="/login" className="btn btn-primary">Login</Link>
            <Link to="/register" className="btn btn-gold">Create Account</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginTop: 28 }} className="stagger-children">
            {[
              ['388+', 'Tracked stocks'],
              ['4', 'Currencies'],
              ['11', 'Protected workspaces'],
            ].map(([value, label]) => (
              <div key={label} className="stat-card">
                <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
                <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div className="glass-card border-glow-anim" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, color: 'var(--purple-light)', marginBottom: 8 }}>Workspace Modules</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {['Dashboard', 'Stocks', 'Portfolio', 'Watchlist', 'Growth', 'ML Analysis', 'Compare', 'Gold & Silver', 'Crypto', 'News', 'AI Widget'].map((name) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span>{name}</span>
                  <span className="badge badge-purple">Live</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 22 }}>
            <div style={{ fontSize: 11, color: 'var(--accent-gold)', marginBottom: 8 }}>What Is Included</div>
            <ul style={{ display: 'grid', gap: 10, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
              <li>Portfolio-aware forecasts with connected historical and predicted lines</li>
              <li>Global currency conversion across tables, charts, and stat cards</li>
              <li>Watchlist actions, news deep links, and AI chat on every protected page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
