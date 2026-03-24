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
  const [loading, setLoading] = useState(true);
  const { format } = useCurrency();
  const { selectedPortfolioId } = usePortfolio();

  const load = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/watchlist/');
      const raw = response.data?.results || response.data || [];
      const lists = Array.isArray(raw) ? raw : [];
      const collected: any[] = [];

      for (const list of lists) {
        const embedded = [
          ...(Array.isArray(list.items) ? list.items : []),
          ...(Array.isArray(list.stocks) ? list.stocks : []),
        ];

        if (embedded.length) {
          embedded.forEach((item) => collected.push({ ...item, watchlist_id: list.id }));
          continue;
        }

        if (list.id) {
          try {
            const detail = await axios.get(`/api/watchlist/${list.id}/`);
            const detailItems = detail.data?.items || detail.data?.stocks || [];
            (Array.isArray(detailItems) ? detailItems : []).forEach((item) => collected.push({ ...item, watchlist_id: list.id }));
          } catch {
            continue;
          }
        }
      }

      setItems(collected);
    } catch {
      toast.error('Cannot connect to server');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (item: any) => {
    try {
      const stock = item.stock || item;
      await axios.delete('/api/watchlist/remove/', { data: { stock_symbol: stock.symbol, watchlist_id: item.watchlist_id } });
      toast.success('Removed from watchlist');
      await load();
    } catch {
      toast.error('Cannot connect to server');
    }
  };

  const addToPortfolio = async (item: any) => {
    if (!selectedPortfolioId) {
      toast.error('Please select a portfolio from Dashboard');
      return;
    }

    const stock = item.stock || item;
    try {
      await axios.post('/api/portfolio/', { stock_symbol: stock.symbol, quantity: 1, portfolio_id: selectedPortfolioId });
      toast.success('Added to Portfolio');
    } catch {
      toast.error('Cannot connect to server');
    }
  };

  return (
    <PageLayout title="Watchlist">
      <SectionHeader label="Saved Ideas" title="Watchlist" description="Review your watchlisted stocks and move them into the selected portfolio." />
      <div className="glass-card" style={{ padding: 18 }}>
        {loading ? (
          <div className="empty-state">Loading watchlist...</div>
        ) : !items.length ? (
          <div className="empty-state">Your watchlist is empty. Go to Stocks page to add stocks.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Company</th>
                  <th>Sector</th>
                  <th>Price</th>
                  <th>Change %</th>
                  <th>Sentiment</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const stock = item.stock || item;
                  const change = getChangePercent(stock);
                  return (
                    <tr key={`${stock.symbol}-${index}`}>
                      <td>{stock.symbol}</td>
                      <td>{getCompanyName(stock)}</td>
                      <td>{getSector(stock)}</td>
                      <td>{format(getPrice(stock))}</td>
                      <td style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {change >= 0 ? '+' : '-'} {Math.abs(change).toFixed(2)}%
                      </td>
                      <td><SentimentBadge sentiment={String(stock.sentiment || 'Neutral')} /></td>
                      <td>{String(item.created_at || item.date_added || '--').slice(0, 10)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => void remove(item)}>Remove</button>
                          <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => void addToPortfolio(item)}>Add to Portfolio</button>
                          <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => (window.location.href = `/stocks/${stock.symbol}`)}>View Details</button>
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
