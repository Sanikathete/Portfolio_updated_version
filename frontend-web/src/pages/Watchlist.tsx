import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';
import { useCurrency } from '../context/CurrencyContext';
import { usePortfolio } from '../context/PortfolioContext';
import { getCompanyName, getSector, getPrice, getChangePercent } from '../utils/pageUtils';

const Watchlist: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const { format } = useCurrency();
  const { activePortfolioId } = usePortfolio();

  const load = async () => {
    try {
      const res = await axios.get('/api/watchlist/');
      const data = res.data?.results || res.data?.items || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Unable to load watchlist.');
    }
  };

  useEffect(() => { void load(); }, [activePortfolioId]);

  const remove = async (stockSymbol: string) => {
    try {
      await axios.delete('/api/watchlist/remove/', { data: { stock_symbol: stockSymbol } });
      toast.success('Removed from watchlist');
      await load();
    } catch {
      toast.error('Unable to remove watchlist item.');
    }
  };

  const addToPortfolio = async (stockSymbol: string) => {
    if (!activePortfolioId) return toast.error('Select a portfolio in the header first.');
    try {
      await axios.post('/api/portfolio/', { stock_symbol: stockSymbol, quantity: 1, portfolio_id: activePortfolioId });
      toast.success('Added to portfolio');
    } catch {
      toast.error('Unable to add to portfolio.');
    }
  };

  return (
    <PageLayout title="Watchlist">
      <SectionHeader label="Saved Ideas" title="Watchlist" description="Monitor symbols before moving them into the active portfolio." />
      <div className="glass-card" style={{ padding: 18 }}>
        {!items.length ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>☆ Your watchlist is empty.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th><th>Company</th><th>Sector</th><th>Price</th><th>Change%</th><th>Sentiment</th><th>Date Added</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const stock = item.stock || item;
                  return (
                    <tr key={stock.symbol}>
                      <td>{stock.symbol}</td>
                      <td>{getCompanyName(stock)}</td>
                      <td>{getSector(stock)}</td>
                      <td>{format(getPrice(stock))}</td>
                      <td style={{ color: getChangePercent(stock) >= 0 ? 'var(--green)' : 'var(--red)' }}>{getChangePercent(stock) >= 0 ? '▲' : '▼'} {Math.abs(getChangePercent(stock)).toFixed(2)}%</td>
                      <td><SentimentBadge sentiment={String(stock.sentiment || 'Neutral')} /></td>
                      <td>{String(item.created_at || item.date_added || '—').slice(0, 10)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => remove(stock.symbol)}>Remove</button>
                          <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => addToPortfolio(stock.symbol)}>Add to Portfolio</button>
                          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => (window.location.href = `/stocks/${stock.symbol}`)}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Watchlist;
