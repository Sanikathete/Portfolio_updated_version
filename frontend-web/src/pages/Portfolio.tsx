import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';
import { RatingBadge } from '../components/RatingBadge';
import { usePortfolio } from '../context/PortfolioContext';
import { getRating, getCompanyName, getPrice } from '../utils/pageUtils';
import { seededNumber } from '../utils/forecastHelpers';

const Portfolio: React.FC = () => {
  const { selectedPortfolioId } = usePortfolio();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!selectedPortfolioId) {
        setRows([]);
        return;
      }

      try {
        const response = await axios.get(`/api/portfolio/${selectedPortfolioId}/`);
        const items = response.data?.items || response.data || [];
        const list = Array.isArray(items) ? items : [];

        const enriched = list.map((item: any) => {
          const stock = item.stock || item;
          const currentPrice = getPrice(stock);
          const random = seededNumber(stock.symbol);
          const threeMonthPercent = Number((5 + random() * 20).toFixed(1));
          const oneYearPercent = Number((10 + random() * 35).toFixed(1));
          const price5yAgo = currentPrice / (0.8 + random() * 1.2);
          const performance5y = ((currentPrice - price5yAgo) / price5yAgo) * 100;
          return {
            stock,
            forecast3m: threeMonthPercent,
            forecast1y: oneYearPercent,
            perf5y: performance5y,
          };
        });

        setRows(enriched);
      } catch {
        toast.error('Cannot connect to server');
      }
    };

    void load();
  }, [selectedPortfolioId]);

  return (
    <PageLayout title="Portfolio">
      <SectionHeader label="Portfolio Intelligence" title="Portfolio" description="Forecast and five-year performance values are seeded from the selected portfolio so they stay stable across refreshes." />
      <div className="glass-card" style={{ padding: 18 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stock Name</th>
                <th>Ticker</th>
                <th>Rating</th>
                <th>Sentiment</th>
                <th>3M Forecast</th>
                <th>1Y Forecast</th>
                <th>5Y Performance</th>
                <th>Actions</th>
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
                    <td style={{ color: 'var(--green)' }}>+ {row.forecast3m.toFixed(1)}%</td>
                    <td style={{ color: 'var(--green)' }}>+ {row.forecast1y.toFixed(1)}%</td>
                    <td style={{ color: row.perf5y >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {row.perf5y >= 0 ? '+' : '-'} {Math.abs(row.perf5y).toFixed(1)}%
                    </td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => (window.location.href = `/portfolio/stock/${stock.symbol}`)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Please select a portfolio from Dashboard</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
};

export default Portfolio;
