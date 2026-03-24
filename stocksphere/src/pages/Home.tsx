import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STOCKS } from '../data/mockData';
import { getArrow } from '../utils/format';

const platformFeatures = [
  'Home',
  'Dashboard',
  'Stocks',
  'Portfolio',
  'Watchlist',
  'Growth',
  'ML Analysis',
  'Compare',
  'Gold Silver',
  'Crypto',
  'News',
  'AI Chat',
];

const Home = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [stocks, setStocks] = useState(INDIAN_STOCKS);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        const response = await api.get('/api/stocks/');
        setStocks(Array.isArray(response.data) && response.data.length ? response.data : INDIAN_STOCKS);
      } catch (error) {
        console.error(error);
        setStocks(INDIAN_STOCKS);
      }
    };

    void loadStocks();
  }, []);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const loopedStocks = [...stocks, ...stocks];

  return (
    <>
      <Header />
      <div
        className="fade-in"
        style={{
          minHeight: '100vh',
          paddingTop: 44,
          display: 'grid',
          gridTemplateColumns: '240px minmax(0, 1fr) 200px',
          gap: 24,
          paddingInline: 24,
          alignItems: 'stretch',
        }}
      >
        <aside className="panel" style={{ marginBlock: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px' }}>
            <div className="label">Live NSE Stocks</div>
          </div>
          <div style={{ overflow: 'hidden', height: 'calc(100vh - 140px)' }}>
            <div style={{ animation: 'scrollUp 20s linear infinite' }}>
              {loopedStocks.map((stock, index) => (
                <div
                  key={`${stock.symbol}-${index}`}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', gap: 8 }}
                >
                  <span style={{ color: 'var(--accent-blue)', fontSize: 11, fontWeight: 700 }}>{stock.symbol}</span>
                  <span style={{ fontSize: 10, color: stock.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {stock.price.toFixed(2)} {getArrow(stock.change)} {Math.abs(stock.change).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBlock: 24,
          }}
        >
          <div style={{ maxWidth: 720, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent-blue)' }}>StockSphere</div>
            <div style={{ fontSize: 16, color: 'var(--text-muted)', marginTop: 12 }}>
              AI-Powered Stock Intelligence Platform
            </div>
            <p style={{ marginTop: 18, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              Track Indian equities, build sector-aware portfolios, compare asset classes, and surface machine-learning
              signals across stocks, commodities, crypto, sentiment, and multi-agent market research workflows.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 28 }}>
              <button className="btn-blue" style={{ padding: '14px 28px' }} onClick={() => navigate('/login')}>
                Login
              </button>
              <button className="btn-outline" style={{ padding: '14px 28px' }} onClick={() => navigate('/register')}>
                Register
              </button>
            </div>
            <div
              className="panel"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 28,
                padding: '10px 14px',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--green)',
                  animation: 'pulse 1.3s infinite',
                }}
              />
              <span style={{ fontSize: 12 }}>⚡ Powered by ML + LangGraph AI</span>
            </div>
          </div>
        </section>

        <aside className="panel" style={{ marginBlock: 24 }}>
          <div className="label">Platform Features</div>
          <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
            {platformFeatures.map((feature) => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{feature}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
};

export default Home;
