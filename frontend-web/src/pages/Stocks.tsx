import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';
import { RatingBadge } from '../components/RatingBadge';
import { SkeletonTable } from '../components/SkeletonTable';
import { useCurrency } from '../context/CurrencyContext';
import { getCompanyName, getExchange, getPrice, getSector, getChangePercent, getRating, getSentimentScore } from '../utils/pageUtils';

const sectorFilters = ['All', 'Nifty IT', 'Nifty Bank', 'Nifty Auto', 'Nifty FMCG', 'Nifty Pharma', 'Nifty Metal', 'Nifty Realty', 'Nifty Energy', 'USA Tech', 'USA Healthcare', 'Crypto'];

const Stocks: React.FC = () => {
  const { format } = useCurrency();
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    const fetchAllStocks = async () => {
      setLoading(true);
      try {
        let allStocks: any[] = [];
        let offset = 0;
        const limit = 100;
        while (true) {
          const res = await axios.get(`/api/stocks/?limit=${limit}&offset=${offset}`);
          const data = res.data?.results || res.data || [];
          const arr = Array.isArray(data) ? data : [];
          allStocks = [...allStocks, ...arr];
          if (arr.length < limit) break;
          offset += limit;
          if (offset > 500) break;
        }
        setStocks(allStocks);
      } catch {
        toast.error('Unable to load stocks.');
      } finally {
        setLoading(false);
      }
    };
    void fetchAllStocks();
  }, []);

  const filtered = useMemo(() => stocks.filter((stock) => {
    const matchesSearch = `${stock.symbol} ${getCompanyName(stock)}`.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (sector === 'All') return true;
    const normalized = `${getSector(stock)} ${getExchange(stock)} ${stock.symbol}`.toLowerCase();
    return normalized.includes(sector.replace('Nifty ', '').toLowerCase()) || normalized.includes(sector.toLowerCase());
  }), [stocks, search, sector]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [search, sector]);

  const addToWatchlist = async (symbol: string) => {
    try {
      let response;
      try {
        response = await axios.post('/api/watchlist/', { stock_symbol: symbol });
      } catch (error) {
        response = await axios.post('/api/watchlist/', { ticker: symbol });
      }
      console.log('watchlist add response', response.status, response.data);
      if (response.status === 200 || response.status === 201) toast.success('Stock added to watchlist!');
      else toast.error('Failed to add stock. Please try again.');
    } catch (error: any) {
      console.error('watchlist add error', error?.response?.status, error?.response?.data);
      toast.error('Failed to add stock. Please try again.');
    }
  };

  return (
    <PageLayout title="Stocks">
      <SectionHeader label="Market Universe" title="Stocks" description={`Loaded ${stocks.length} stocks from the backend. Search and sector filtering are applied client-side.`} />
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="input-field" placeholder="Search by symbol or company..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 340 }} />
            {sectorFilters.map((name) => (
              <button key={name} className={sector === name ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '6px 12px' }} onClick={() => setSector(name)}>
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          {loading ? <SkeletonTable rows={10} cols={10} /> : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Symbol</th><th>Company</th><th>Sector</th><th>Exchange</th><th>Price</th><th>Change %</th><th>Sentiment</th><th>Rating</th><th>Score</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((stock) => {
                      const rating = getRating(stock);
                      const change = getChangePercent(stock);
                      const score = Math.min(100, Math.max(0, getSentimentScore(stock) * 100));
                      return (
                        <tr key={stock.symbol}>
                          <td>{stock.symbol}</td>
                          <td>{getCompanyName(stock)}</td>
                          <td>{getSector(stock)}</td>
                          <td>{getExchange(stock)}</td>
                          <td>{format(getPrice(stock))}</td>
                          <td style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%</td>
                          <td><SentimentBadge sentiment={String(stock.sentiment || 'Neutral')} /></td>
                          <td><RatingBadge rating={rating} /></td>
                          <td><div style={{ width: 80, height: 6, background: 'var(--bg-panel)', borderRadius: 999 }}><div style={{ width: `${score}%`, height: '100%', background: 'linear-gradient(90deg, var(--purple), var(--accent-gold))', borderRadius: 999 }} /></div></td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => addToWatchlist(stock.symbol)}>★ Watchlist</button>
                              <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={() => window.print()}>↓ PDF</button>
                              <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => (window.location.href = `/stocks/${stock.symbol}`)}>→ View</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!visible.length ? <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No stocks match the current filters.</td></tr> : null}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((num) => (
                  <button key={num} className={page === num ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '6px 10px' }} onClick={() => setPage(num)}>{num}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Stocks;
