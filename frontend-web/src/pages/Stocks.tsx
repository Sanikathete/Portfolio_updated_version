import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';

interface Stock {
  id: number;
  symbol: string;
  name: string;
  current_price: string;
  currency: string;
  exchange: string;
  sector: string;
  updated_at: string;
}

const STOCKS_ENDPOINT = 'http://135.235.193.71:8001/data/stocks';
const WATCHLIST_ENDPOINT = 'http://135.235.193.71:8000/watchlist/';
const WATCHLIST_ADD_ENDPOINT = 'http://135.235.193.71:8000/watchlist/add';
const SERVICE_USERNAME = 'testteacher';
const SERVICE_PASSWORD = 'teacher@123';

const Stocks: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [watchlistedSymbols, setWatchlistedSymbols] = useState<Set<string>>(new Set());
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');

  useEffect(() => {
    const loadStocks = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get<Stock[]>(STOCKS_ENDPOINT, {
          params: {
            username: SERVICE_USERNAME,
            password: SERVICE_PASSWORD,
          },
        });

        const data = Array.isArray(response.data) ? response.data : [];
        setStocks(data);
        setFilteredStocks(data);

        const watchlistResponse = await axios.get(WATCHLIST_ENDPOINT, {
          params: {
            username: SERVICE_USERNAME,
            password: SERVICE_PASSWORD,
          },
        });

        const watchlistItems = Array.isArray(watchlistResponse.data?.items) ? watchlistResponse.data.items : [];
        const symbols = watchlistItems
          .map((item: any) => item?.stock?.symbol || item?.stock_symbol || item?.symbol)
          .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);

        setWatchlistedSymbols(new Set(symbols));
      } catch {
        setError('Unable to load NSE stocks right now. Please try again shortly.');
        setStocks([]);
        setFilteredStocks([]);
        setWatchlistedSymbols(new Set());
      } finally {
        setLoading(false);
      }
    };

    void loadStocks();
  }, []);

  useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const nextFilteredStocks = stocks.filter((stock) => {
      const matchesSearch =
        !normalizedSearch ||
        stock.symbol.toLowerCase().includes(normalizedSearch) ||
        stock.name.toLowerCase().includes(normalizedSearch);

      const matchesSector = selectedSector === 'All' || stock.sector === selectedSector;

      return matchesSearch && matchesSector;
    });

    setFilteredStocks(nextFilteredStocks);
  }, [stocks, search, selectedSector]);

  const sectors = useMemo(() => {
    return Array.from(
      new Set(
        stocks
          .map((stock) => stock.sector)
          .filter((sector) => Boolean(sector))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [stocks]);

  const addToWatchlist = async (symbol: string) => {
    setAddingSymbol(symbol);

    try {
      await axios.post(
        WATCHLIST_ADD_ENDPOINT,
        null,
        {
          params: {
            username: SERVICE_USERNAME,
            password: SERVICE_PASSWORD,
            stock_symbol: symbol,
          },
        }
      );

      setWatchlistedSymbols((current) => {
        const next = new Set(current);
        next.add(symbol);
        return next;
      });
    } catch {
      window.alert(`Failed to add ${symbol} to watchlist.`);
    } finally {
      setAddingSymbol(null);
    }
  };

  return (
    <PageLayout title="NSE Stocks">
      <SectionHeader
        label="Market Directory"
        title="NSE Stocks"
        description="Browse the live StockSphere equity universe, search by company or ticker, and narrow the list by sector."
      />

      <div style={{ display: 'grid', gap: 18 }}>
        <div
          className="glass-card"
          style={{
            padding: 18,
            display: 'grid',
            gap: 14,
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <input
              className="input-field"
              type="text"
              placeholder="Search by name or symbol..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              className="select-field"
              value={selectedSector}
              onChange={(event) => setSelectedSector(event.target.value)}
            >
              <option value="All">All Sectors</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            Showing {filteredStocks.length} of {stocks.length} stocks
          </div>
        </div>

        {loading ? (
          <div className="glass-card" style={{ padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
            Loading stocks...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="glass-card" style={{ padding: 24, color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {filteredStocks.map((stock) => (
              <article
                key={stock.id}
                className="glass-card"
                style={{
                  padding: 18,
                  border: '1px solid var(--border)',
                  display: 'grid',
                  gap: 14,
                  minHeight: 180,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                      {stock.symbol}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 6 }}>
                      {stock.name}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'rgba(126, 184, 247, 0.12)',
                      border: '1px solid rgba(126, 184, 247, 0.22)',
                      color: 'var(--accent-blue)',
                      fontSize: 10,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stock.exchange}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      width: 'fit-content',
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'rgba(167, 139, 250, 0.12)',
                      border: '1px solid rgba(167, 139, 250, 0.2)',
                      color: 'var(--purple)',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {stock.sector}
                  </span>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Price</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stock.currency === 'INR' ? `₹${stock.current_price}` : `${stock.currency} ${stock.current_price}`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void addToWatchlist(stock.symbol)}
                  disabled={watchlistedSymbols.has(stock.symbol) || addingSymbol === stock.symbol}
                  style={{
                    marginTop: 'auto',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: watchlistedSymbols.has(stock.symbol) ? '1px solid rgba(46, 204, 113, 0.28)' : '1px solid var(--border)',
                    background: watchlistedSymbols.has(stock.symbol) ? 'rgba(46, 204, 113, 0.14)' : 'transparent',
                    color: watchlistedSymbols.has(stock.symbol) ? 'var(--green)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: watchlistedSymbols.has(stock.symbol) || addingSymbol === stock.symbol ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {addingSymbol === stock.symbol ? 'Adding...' : watchlistedSymbols.has(stock.symbol) ? '✓ Watchlisted' : '+ Watchlist'}
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && !error && !filteredStocks.length ? (
          <div className="glass-card" style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
            No stocks match your current search and sector filters.
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
};

export default Stocks;
