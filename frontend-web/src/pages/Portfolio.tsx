import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';
import { RatingBadge } from '../components/RatingBadge';
import { usePortfolio } from '../context/PortfolioContext';
import { getRating, getCompanyName } from '../utils/pageUtils';

const Portfolio: React.FC = () => {
  const { activePortfolioId } = usePortfolio();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!activePortfolioId) return setRows([]);
      try {
        const res = await axios.get(`/api/portfolio/?portfolio_id=${activePortfolioId}`);
        const items = res.data?.items || res.data || [];
        const arr = Array.isArray(items) ? items : [];
        const enriched = await Promise.all(arr.map(async (item) => {
          const stock = item.stock || item;
          let forecast3m = 0;
          let forecast1y = 0;
          let perf5y = 0;
          try {
            const [f3, f1, perf] = await Promise.all([
              axios.get(`/api/portfolio/forecast/?symbol=${stock.symbol}&period=3m`),
              axios.get(`/api/portfolio/forecast/?symbol=${stock.symbol}&period=1y`),
              axios.get(`/api/stocks/${stock.symbol}/performance/?period=5y`),
            ]);
            forecast3m = Number(f3.data?.forecast_percent ?? f3.data?.value ?? 0);
            forecast1y = Number(f1.data?.forecast_percent ?? f1.data?.value ?? 0);
            perf5y = Number(perf.data?.performance_percent ?? perf.data?.value ?? 0);
          } catch {}
          return { ...item, stock, forecast3m, forecast1y, perf5y };
        }));
        setRows(enriched);
      } catch {
        toast.error('Unable to load portfolio analytics.');
      }
    };
    void load();
  }, [activePortfolioId]);

  return (
    <PageLayout title="Portfolio">
      <SectionHeader label="Portfolio Intelligence" title="Portfolio" description="Forecasts and five-year performance refresh against the selected portfolio in the header." />
      <div className="glass-card" style={{ padding: 18 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stock Name</th><th>Ticker</th><th>Rating</th><th>Sentiment</th><th>3M Forecast</th><th>1Y Forecast</th><th>5Y Performance</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const stock = row.stock;
                const rating = getRating(stock);
                return (
                  <tr key={stock.symbol}>
                    <td>{getCompanyName(stock)}</td>
                    <td>{stock.symbol}</td>
                    <td><RatingBadge rating={rating} /></td>
                    <td><SentimentBadge sentiment={String(stock.sentiment || 'Neutral')} /></td>
                    <td style={{ color: row.forecast3m >= 0 ? 'var(--green)' : 'var(--red)' }}>{row.forecast3m >= 0 ? '↑' : '↓'} {row.forecast3m.toFixed(1)}%</td>
                    <td style={{ color: row.forecast1y >= 0 ? 'var(--green)' : 'var(--red)' }}>{row.forecast1y >= 0 ? '↑' : '↓'} {row.forecast1y.toFixed(1)}%</td>
                    <td style={{ color: row.perf5y >= 0 ? 'var(--green)' : 'var(--red)' }}>{row.perf5y >= 0 ? '↑' : '↓'} {row.perf5y.toFixed(1)}%</td>
                    <td><button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => (window.location.href = `/portfolio/stock/${stock.symbol}`)}>View Details</button></td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No portfolio analytics available.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default Portfolio;
