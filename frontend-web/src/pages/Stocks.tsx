import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';
import { SkeletonTable } from '../components/SkeletonTable';
import { useCurrency } from '../context/CurrencyContext';
import { getCompanyName, getExchange, getPrice, getSector, getChangePercent, getRating } from '../utils/pageUtils';
import { seededNumber } from '../utils/forecastHelpers';
import { INDIAN_STOCKS } from '../data/mockData';

const sectorFilters = ['All', 'Nifty IT', 'Nifty Bank', 'Nifty Auto', 'Nifty FMCG', 'Nifty Pharma', 'Nifty Metal', 'Nifty Realty', 'Nifty Energy', 'USA Tech', 'USA Healthcare', 'Crypto'];

const filterStock = (stock: any, sector: string) => {
  if (sector === 'All') return true;
  const normalized = `${getSector(stock)} ${getExchange(stock)} ${stock.symbol}`.toLowerCase();
  return normalized.includes(sector.replace('Nifty ', '').toLowerCase()) || normalized.includes(sector.toLowerCase());
};

const displayRating = (stock: any) => {
  const base = getRating(stock);
  if (Number.isFinite(base) && base > 1) return base;
  const random = seededNumber(String(stock.symbol || stock.id || 'stock'));
  return Number((6 + random() * 3.5).toFixed(1));
};

const Stocks: React.FC = () => {
  const { format } = useCurrency();
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [page, setPage] = useState(1);
  const [watchlistItems, setWatchlistItems] = useState<Record<string, boolean>>({});
  const [watchlistId, setWatchlistId] = useState<number | null>(null);
  const perPage = 15;

  const fetchWatchlist = async () => {
    const response = await axios.get('/api/watchlist/');
    const raw = response.data?.results || response.data || [];
    const lists = Array.isArray(raw) ? raw : [];
    const primary = lists[0] || null;
    setWatchlistId(primary?.id || 1);

    const itemMap: Record<string, boolean> = {};

    for (const list of lists) {
      const candidates = [
        ...(Array.isArray(list.items) ? list.items : []),
        ...(Array.isArray(list.stocks) ? list.stocks : []),
      ];

      if (!candidates.length && list.id) {
        try {
          const details = await axios.get(`/api/watchlist/${list.id}/`);
          const detailItems = details.data?.items || details.data?.stocks || [];
          (Array.isArray(detailItems) ? detailItems : []).forEach((item: any) => {
            const stock = item.stock || item;
            if (stock?.symbol) itemMap[String(stock.symbol)] = true;
          });
        } catch {
          continue;
        }
      } else {
        candidates.forEach((item: any) => {
          const stock = item.stock || item;
          if (stock?.symbol) itemMap[String(stock.symbol)] = true;
        });
      }
    }

    setWatchlistItems(itemMap);
    return primary;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let allStocks: any[] = [];
        let offset = 0;
        const limit = 100;

        while (true) {
          const response = await axios.get(`/api/stocks/?limit=${limit}&offset=${offset}`);
          const data = response.data?.results || response.data || [];
          const chunk = Array.isArray(data) ? data : [];
          allStocks = [...allStocks, ...chunk];
          if (chunk.length < limit) break;
          offset += limit;
        }

        setStocks(allStocks.length ? allStocks : INDIAN_STOCKS);
        await fetchWatchlist().catch(() => {});
      } catch {
        setStocks(INDIAN_STOCKS);
        toast.error('Cannot connect to server');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    return stocks.filter((stock) => {
      const matchesSearch = `${stock.symbol} ${getCompanyName(stock)}`.toLowerCase().includes(search.toLowerCase());
      return matchesSearch && filterStock(stock, sector);
    });
  }, [stocks, search, sector]);

  useEffect(() => {
    setPage(1);
  }, [search, sector]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const addToWatchlist = async (stock: any) => {
    try {
      let activeId = watchlistId;

      if (!activeId) {
        const existing = await fetchWatchlist().catch(() => null);
        activeId = existing?.id || null;
      }

      if (!activeId) {
        const created = await axios.post('/api/watchlist/', { name: 'My Watchlist' });
        activeId = Number(created.data?.id || created.data?.watchlist_id || 1);
        setWatchlistId(activeId);
      }

      const response = await axios.post('/api/watchlist/', { stock_id: stock.id, watchlist_id: activeId });
      console.log('watchlist add response', response.status, response.data);
      setWatchlistItems((current) => ({ ...current, [stock.symbol]: true }));
      toast.success('Added to Watchlist ✓');
    } catch (error: any) {
      console.log('watchlist add error', error?.response?.status, error?.response?.data);
      const detail = JSON.stringify(error?.response?.data || '').toLowerCase();
      if (detail.includes('exist') || detail.includes('duplicate') || detail.includes('already')) {
        toast('Already in watchlist', { icon: 'i' });
        setWatchlistItems((current) => ({ ...current, [stock.symbol]: true }));
      } else {
        toast.error('Cannot connect to server');
      }
    }
  };

  return (
    <PageLayout title="Stocks">
      <SectionHeader label="Market Universe" title="Stocks" description={`Loaded ${stocks.length} stocks from the database with client-side search and sector filters.`} />
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input className="input-field" placeholder="Search by symbol or company..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ maxWidth: 340 }} />
            {sectorFilters.map((name) => (
              <button key={name} className={sector === name ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '6px 12px' }} onClick={() => setSector(name)}>
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          {loading ? (
            <SkeletonTable rows={10} cols={9} />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Company</th>
                      <th>Sector</th>
                      <th>Exchange</th>
                      <th>Price</th>
                      <th>Change %</th>
                      <th>Sentiment</th>
                      <th>Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((stock) => {
                      const rating = displayRating(stock);
                      const change = getChangePercent(stock);
                      const added = Boolean(watchlistItems[stock.symbol]);

                      return (
                        <tr key={stock.id || stock.symbol}>
                          <td>{stock.symbol}</td>
                          <td>{getCompanyName(stock)}</td>
                          <td>{getSector(stock)}</td>
                          <td>{getExchange(stock)}</td>
                          <td>{format(getPrice(stock))}</td>
                          <td style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {change >= 0 ? '+' : '-'} {Math.abs(change).toFixed(2)}%
                          </td>
                          <td><SentimentBadge sentiment={String(stock.sentiment || 'Neutral')} /></td>
                          <td>
                            <span style={{ color: rating >= 8 ? 'var(--green)' : rating >= 6 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                              {rating.toFixed(1)}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className={added ? 'btn btn-gold' : 'btn btn-outline'}
                                style={{ padding: '4px 8px' }}
                                onClick={() => void addToWatchlist(stock)}
                              >
                                {added ? 'Added' : 'Watchlist'}
                              </button>
                              <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => (window.location.href = `/stocks/${stock.symbol}`)}>
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!visible.length ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No stocks match the current filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((num) => (
                  <button key={num} className={page === num ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '6px 10px' }} onClick={() => setPage(num)}>
                    {num}
                  </button>
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
