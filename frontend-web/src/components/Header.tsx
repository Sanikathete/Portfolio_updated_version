import React, { useEffect, useState } from 'react';
import type { Currency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePortfolio } from '../context/PortfolioContext';
import axios from '../api/axios';

export const Header: React.FC = () => {
  const { isAuthenticated, logout, username } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { selectedPortfolioId, setSelectedPortfolioId, portfolios, setPortfolios } = usePortfolio();

  useEffect(() => {
    if (!isAuthenticated) return;
    axios.get('/api/portfolio/').then((response) => {
      const data = response.data?.results || response.data || [];
      const list = Array.isArray(data) ? data : [];
      setPortfolios(list);
      if (!selectedPortfolioId && list[0]?.id) {
        setSelectedPortfolioId(list[0].id);
      }
    }).catch(() => {});
  }, [isAuthenticated, selectedPortfolioId, setPortfolios, setSelectedPortfolioId]);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        background: 'linear-gradient(90deg, #08051a 0%, #0d0a22 50%, #08051a 100%)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 900,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--purple), var(--accent-gold))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          S
        </div>
        <div>
          <div className="label">Fintech Intelligence</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Stock<span style={{ color: 'var(--accent-gold)' }}>Sphere</span>
          </div>
        </div>
      </div>

      {isAuthenticated ? (
        <div style={{ flex: 1, overflow: 'hidden', margin: '0 24px', height: 26, position: 'relative' }}>
          <LiveTickerMini />
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isAuthenticated ? (
          <>
            {portfolios.length > 0 ? (
              <select
                className="select-field"
                value={selectedPortfolioId || ''}
                onChange={(event) => setSelectedPortfolioId(Number(event.target.value) || null)}
                style={{ fontSize: 11, padding: '4px 8px' }}
              >
                <option value="">Select Portfolio</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              className="select-field"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
              style={{ fontSize: 11, padding: '4px 8px' }}
            >
              {(['INR', 'USD', 'EUR'] as Currency[]).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11,
                color: 'var(--purple-light)',
              }}
            >
              User: {username}
            </div>

            <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 12px' }} onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <a href="/login" className="btn btn-outline" style={{ fontSize: 11 }}>
              Login
            </a>
            <a href="/register" className="btn btn-primary" style={{ fontSize: 11 }}>
              Register
            </a>
          </>
        )}
      </div>
    </header>
  );
};

const LiveTickerMini: React.FC = () => {
  const [stocks, setStocks] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/stocks/public-stocks/', {
      params: { limit: 20, include_change: 1, refresh: 1 },
    }).then((response) => {
      const data = response.data?.results || response.data || [];
      setStocks(Array.isArray(data) ? data.slice(0, 20) : []);
    }).catch(() => {});
  }, []);

  if (!stocks.length) return null;

  return (
    <div className="ticker-wrap" style={{ background: 'transparent', border: 'none', padding: 0 }}>
      <div className="ticker-track">
        {[...stocks, ...stocks].map((stock, index) => {
          const change = Number(stock.change_percent ?? stock.change ?? 0);
          return (
            <span key={`${stock.symbol}-${index}`} style={{ marginRight: 28, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{stock.symbol}</span>{' '}
              <span style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {change >= 0 ? '+' : '-'} {Math.abs(change).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
