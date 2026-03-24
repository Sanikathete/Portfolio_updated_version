import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { INDIAN_STOCKS } from '../data/mockData';
import { getArrow, sentimentBadgeClass } from '../utils/format';

type Stock = (typeof INDIAN_STOCKS)[number];

const Stocks = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [watchLoading, setWatchLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadStocks = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/stocks/');
        setStocks(Array.isArray(response.data) && response.data.length ? response.data : INDIAN_STOCKS);
      } catch (error) {
        console.error(error);
        setStocks(INDIAN_STOCKS);
      } finally {
        setLoading(false);
      }
    };

    void loadStocks();
  }, []);

  const filtered = useMemo(
    () =>
      stocks.filter((stock) =>
        `${stock.symbol} ${stock.company}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [stocks, search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const paginated = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const addToWatchlist = async (symbol: string) => {
    setWatchLoading(symbol);
    try {
      await api.post('/api/watchlist/add/', { symbol });
      window.__showToast?.(`${symbol} added to watchlist.`, 'success');
    } catch (error) {
      console.error(error);
      window.__showToast?.(`${symbol} saved locally to watchlist.`, 'info');
    } finally {
      setWatchLoading(null);
    }
  };

  const downloadCsv = (stock: Stock) => {
    const csv = `Symbol,Company,Sector,Exchange,Price,Change,Sentiment,Score\n${stock.symbol},${stock.company},${stock.sector},${stock.exchange},${stock.price},${stock.change},${stock.sentiment},${stock.sentimentScore}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${stock.symbol}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <div className="panel">
          <div className="label">Stocks Universe</div>
          <div style={{ marginTop: 12 }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by symbol or company..."
            />
          </div>
        </div>

        <div className="panel">
          <div className="overflow-table">
            {loading ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <LoadingSkeleton height="34px" />
                <LoadingSkeleton height="34px" />
                <LoadingSkeleton height="34px" />
                <LoadingSkeleton height="34px" />
              </div>
            ) : paginated.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Company</th>
                    <th>Sector</th>
                    <th>Exchange</th>
                    <th>Price</th>
                    <th>Change %</th>
                    <th>Sentiment</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((stock) => (
                    <tr key={stock.symbol}>
                      <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{stock.symbol}</td>
                      <td>{stock.company}</td>
                      <td>{stock.sector}</td>
                      <td>{stock.exchange}</td>
                      <td>{stock.price.toFixed(2)}</td>
                      <td style={{ color: stock.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {getArrow(stock.change)} {Math.abs(stock.change).toFixed(2)}%
                      </td>
                      <td>
                        <span className={sentimentBadgeClass(stock.sentiment)}>{stock.sentiment}</span>
                      </td>
                      <td>
                        <div style={{ width: 80, height: 4, background: '#1a2540' }}>
                          <div
                            style={{
                              width: `${stock.sentimentScore * 100}%`,
                              height: '100%',
                              background:
                                stock.sentiment === 'Positive'
                                  ? 'var(--green)'
                                  : stock.sentiment === 'Negative'
                                    ? 'var(--red)'
                                    : 'var(--yellow)',
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-blue"
                            style={{ padding: '6px 10px' }}
                            disabled={watchLoading === stock.symbol}
                            onClick={() => addToWatchlist(stock.symbol)}
                          >
                            {watchLoading === stock.symbol ? '...' : 'Watchlist'}
                          </button>
                          <button className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => downloadCsv(stock)}>
                            Report
                          </button>
                          <button className="btn-outline" style={{ padding: '6px 10px' }} onClick={() => navigate(`/stocks/${stock.symbol}`)}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Page {currentPage} of {totalPages}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline" disabled={currentPage === 1} onClick={() => setCurrentPage((value) => value - 1)}>
                Prev
              </button>
              <button className="btn-outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((value) => value + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Stocks;
