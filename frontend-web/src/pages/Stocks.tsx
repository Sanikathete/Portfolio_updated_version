import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { RatingBadge } from '../components/RatingBadge';
import { SentimentBadge } from '../components/SentimentBadge';
import { useCurrency } from '../context/CurrencyContext';
import { usePortfolio } from '../context/PortfolioContext';
import { getRating, getSentimentLabel } from '../utils/pageUtils';

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

const STOCKS_ENDPOINT = '/api/api/stocks/public-stocks/';
const WATCHLIST_ENDPOINT = '/api/api/watchlist/watchlist/';
const WATCHLIST_ADD_ENDPOINT = '/api/api/watchlist/watchlist/add';
const PORTFOLIO_ENDPOINT = '/api/api/portfolio/';
const SERVICE_USERNAME = 'testteacher';
const SERVICE_PASSWORD = 'teacher@123';
const NIFTY_SECTORS = [
  'All',
  'Nifty Auto',
  'Nifty Bank',
  'Nifty Commodities',
  'Nifty CPSE',
  'Nifty Energy',
  'Nifty FMCG',
  'Nifty IT',
  'Nifty Media',
  'Nifty Metal',
  'Nifty MNC',
  'Nifty Pharma',
  'Nifty PSE',
  'Nifty PSU Bank',
  'Nifty Realty',
];

const niftySectorToDbSectors: Record<string, string[]> = {
  'Nifty Auto': ['Automobile and Auto Components'],
  'Nifty Bank': ['Financial Services'],
  'Nifty Commodities': ['Metals & Mining', 'Chemicals', 'Oil Gas & Consumable Fuels'],
  'Nifty CPSE': ['Power', 'Capital Goods'],
  'Nifty Energy': ['Oil Gas & Consumable Fuels', 'Power'],
  'Nifty FMCG': ['Fast Moving Consumer Goods'],
  'Nifty IT': ['Information Technology'],
  'Nifty Media': ['Consumer Services'],
  'Nifty Metal': ['Metals & Mining'],
  'Nifty MNC': ['Consumer Durables', 'Consumer Services'],
  'Nifty Pharma': ['Healthcare'],
  'Nifty PSE': ['Power', 'Capital Goods'],
  'Nifty PSU Bank': ['Financial Services'],
  'Nifty Realty': ['Realty', 'Construction', 'Construction Materials'],
};

const Stocks: React.FC = () => {
  const navigate = useNavigate();
  const { formatFromCurrency } = useCurrency();
  const { selectedPortfolioId } = usePortfolio();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlistedSymbols, setWatchlistedSymbols] = useState<Set<string>>(new Set());
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [analyzingSymbol, setAnalyzingSymbol] = useState<string | null>(null);
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
          withCredentials: true,
        });

        const data = Array.isArray(response.data) ? response.data : [];
        setStocks(data);
      } catch {
        setError('Unable to load NSE stocks right now. Please try again shortly.');
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };

    void loadStocks();
  }, []);

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        const watchlistResponse = await axios.get(WATCHLIST_ENDPOINT, {
          withCredentials: true,
        });

        const watchlistItems = Array.isArray(watchlistResponse.data?.items) ? watchlistResponse.data.items : [];
        const symbols = watchlistItems
          .map((item: any) => item?.stock?.symbol || item?.stock_symbol || item?.symbol)
          .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0);

        setWatchlistedSymbols(new Set(symbols));
      } catch {
        setWatchlistedSymbols(new Set());
      }
    };

    void loadWatchlist();
  }, []);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        await axios.get(PORTFOLIO_ENDPOINT, {
          withCredentials: true,
        });
      } catch {
        // Silent by design: portfolio may require login
      }
    };

    void loadPortfolio();
  }, []);

  const filteredStocks = useMemo(() => {
    let result = stocks;

    if (selectedSector !== 'All') {
      const dbSectors = niftySectorToDbSectors[selectedSector] || [];
      result = result.filter((stock) => {
        const sector = (stock.sector || '').toLowerCase();
        return dbSectors.some((s) => sector.includes(s.toLowerCase()));
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (stock) =>
          stock.symbol?.toLowerCase().includes(q) ||
          stock.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [stocks, selectedSector, search]);

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

  const addToSelectedPortfolio = async (symbol: string) => {
    if (!selectedPortfolioId) {
      toast.error('Please select a portfolio first.');
      return;
    }

    setAnalyzingSymbol(symbol);
    try {
      await axios.post(`/api/portfolio/${selectedPortfolioId}/add_stock/`, {
        stock_symbol: symbol,
        quantity: 1,
      });
      toast.success(`${symbol} added to the selected portfolio.`);
    } catch {
      toast.error(`Failed to add ${symbol} to the selected portfolio.`);
    } finally {
      setAnalyzingSymbol(null);
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
              gridTemplateColumns: 'minmax(220px, 1fr) minmax(220px, 1fr) auto',
              gap: 12,
              alignItems: 'center',
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
              {NIFTY_SECTORS.map((sector) => (
                <option key={sector} value={sector}>
                  {sector === 'All' ? 'All Sectors' : sector}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/portfolio/recommend')}
              style={{ whiteSpace: 'nowrap', justifySelf: 'end' }}
            >
              Recommend
            </button>
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
                  <div style={{ display: 'grid', gap: 8 }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <RatingBadge rating={getRating(stock)} />
                      <SentimentBadge sentiment={getSentimentLabel(stock)} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Price</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatFromCurrency(Number(stock.current_price || 0), stock.currency)}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => void addToWatchlist(stock.symbol)}
                    disabled={watchlistedSymbols.has(stock.symbol) || addingSymbol === stock.symbol}
                    style={{
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
                  <button
                    type="button"
                    onClick={() => void addToSelectedPortfolio(stock.symbol)}
                    disabled={analyzingSymbol === stock.symbol}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(126, 184, 247, 0.28)',
                      background: 'rgba(126, 184, 247, 0.12)',
                      color: 'var(--accent-blue)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: analyzingSymbol === stock.symbol ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {analyzingSymbol === stock.symbol ? 'Adding to Portfolio...' : 'Add Stock to Portfolio'}
                  </button>
                </div>
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
