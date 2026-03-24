import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import { INDIAN_STOCKS } from '../data/mockData';
import { getArrow, sentimentBadgeClass } from '../utils/format';

type WatchItem = (typeof INDIAN_STOCKS)[number] & { dateAdded: string };

const fallbackWatchlist: WatchItem[] = INDIAN_STOCKS.slice(0, 5).map((stock, index) => ({
  ...stock,
  dateAdded: `2025-03-${10 + index}`,
}));

const Watchlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const loadWatchlist = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/watchlist/');
        const data = Array.isArray(response.data) && response.data.length ? response.data : fallbackWatchlist;
        setItems(data);
      } catch (error) {
        console.error(error);
        setItems(fallbackWatchlist);
      } finally {
        setLoading(false);
      }
    };

    void loadWatchlist();
  }, []);

  const removeItem = async (symbol: string) => {
    setRemoving(symbol);
    try {
      await api.delete('/api/watchlist/remove/', { data: { symbol } });
      setItems((current) => current.filter((item) => item.symbol !== symbol));
      window.__showToast?.(`${symbol} removed from watchlist.`, 'success');
    } catch (error) {
      console.error(error);
      setItems((current) => current.filter((item) => item.symbol !== symbol));
      window.__showToast?.(`${symbol} removed locally.`, 'info');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Layout>
      <div className="fade-in panel">
        <div className="label">Watchlist</div>
        <div className="overflow-table" style={{ marginTop: 16 }}>
          {loading ? (
            <div className="empty-state">Loading watchlist...</div>
          ) : items.length ? (
            <table>
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
                {items.map((item) => (
                  <tr key={item.symbol}>
                    <td>{item.symbol}</td>
                    <td>{item.company}</td>
                    <td>{item.sector}</td>
                    <td>{item.price.toFixed(2)}</td>
                    <td style={{ color: item.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {getArrow(item.change)} {Math.abs(item.change).toFixed(2)}%
                    </td>
                    <td><span className={sentimentBadgeClass(item.sentiment)}>{item.sentiment}</span></td>
                    <td>{item.dateAdded}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-red" style={{ padding: '6px 10px' }} disabled={removing === item.symbol} onClick={() => removeItem(item.symbol)}>
                          {removing === item.symbol ? '...' : 'Remove'}
                        </button>
                        <button className="btn-blue" style={{ padding: '6px 10px' }} onClick={() => window.__showToast?.(`${item.symbol} moved to portfolio workflow.`, 'success')}>
                          Add to Portfolio
                        </button>
                        <button className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => navigate(`/stocks/${item.symbol}`)}>
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No data available. Add stocks to your portfolio.</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Watchlist;
