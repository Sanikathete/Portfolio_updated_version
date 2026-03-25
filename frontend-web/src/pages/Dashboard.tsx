import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { SkeletonTable } from '../components/SkeletonTable';
import { usePortfolio } from '../context/PortfolioContext';
import { useCurrency } from '../context/CurrencyContext';
import { getCompanyName, getPrice, getSector } from '../utils/pageUtils';
import { INDIAN_STOCKS } from '../data/mockData';

const sectorColors = ['#7eb8f7', '#f39c12', '#2ecc71', '#e74c3c', '#a78bfa', '#1abc9c', '#f0b429'];
const marketSectors: Record<string, string[]> = {
  India: [
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
  ],
  USA: ['Technology', 'Healthcare', 'Financials', 'Energy', 'Consumer'],
  Global: ['All Sectors'],
};

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

const Dashboard: React.FC = () => {
  const { selectedPortfolioId, setSelectedPortfolioId, portfolios, setPortfolios } = usePortfolio();
  const { format } = useCurrency();
  const [holdings, setHoldings] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sector: '',
    country: 'India',
    marketSector: 'Nifty Auto',
    stockSymbol: '',
    quantity: 1,
  });

  const fetchPortfolios = async () => {
    const response = await axios.get('/api/portfolio/');
    const data = response.data?.results || response.data || [];
    const list = Array.isArray(data) ? data : [];
    setPortfolios(list);
    if ((!selectedPortfolioId || !list.some((item) => item.id === selectedPortfolioId)) && list[0]?.id) {
      setSelectedPortfolioId(list[0].id);
    }
    return list;
  };

  const fetchStocks = async () => {
    const all: any[] = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const response = await axios.get(`/api/stocks/?limit=${limit}&offset=${offset}`);
      const data = response.data?.results || response.data || [];
      const page = Array.isArray(data) ? data : [];
      all.push(...page);
      if (page.length < limit) break;
      offset += limit;
    }
    setStocks(all.length ? all : INDIAN_STOCKS);
    if (!form.stockSymbol && all[0]?.symbol) {
      setForm((current) => ({ ...current, stockSymbol: all[0].symbol }));
    }
  };

  const fetchHoldings = async (portfolioId: number | null) => {
    if (!portfolioId) {
      setHoldings([]);
      return;
    }

    const response = await axios.get(`/api/portfolio/${portfolioId}/`);
    const data = response.data?.items || response.data?.results || response.data || [];
    setHoldings(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchPortfolios(), fetchStocks()]);
      } catch {
        setStocks(INDIAN_STOCKS);
        toast.error('Cannot connect to server');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    void fetchHoldings(selectedPortfolioId).catch(() => toast.error('Cannot connect to server'));
  }, [selectedPortfolioId]);

  useEffect(() => {
    const nextSector = marketSectors[form.country]?.[0] || 'All Sectors';
    setForm((current) => ({ ...current, marketSector: nextSector }));
  }, [form.country]);

  const filteredStocks = useMemo(() => {
    if (form.country !== 'India' || form.marketSector === 'All Sectors') return stocks;

    const dbSectors = niftySectorToDbSectors[form.marketSector];
    if (!dbSectors) return stocks;

    const filtered = stocks.filter((stock) => {
      const sector = (stock.sector || '').toLowerCase();
      return dbSectors.some((s) => sector.includes(s.toLowerCase()));
    });

    return filtered.length ? filtered : stocks;
  }, [stocks, form.marketSector, form.country]);

  useEffect(() => {
    if (!form.stockSymbol && filteredStocks[0]?.symbol) {
      setForm((current) => ({ ...current, stockSymbol: filteredStocks[0].symbol }));
    }
  }, [filteredStocks, form.stockSymbol]);

  const normalizedHoldings = useMemo(() => {
    return holdings.map((item) => {
      const stock = item.stock || item;
      const currentPrice = getPrice(stock);
      const buyPrice = Number(item.buy_price ?? item.buyPrice ?? currentPrice);
      const quantity = Number(item.quantity ?? 0);
      const discount = buyPrice ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;

      return {
        symbol: stock.symbol,
        company: getCompanyName(stock),
        quantity,
        buyPrice,
        currentPrice,
        pe: Number(stock.pe_ratio ?? stock.pe ?? 18),
        discount,
        pnl: (currentPrice - buyPrice) * quantity,
        value: currentPrice * quantity,
        sector: getSector(stock),
      };
    });
  }, [holdings]);

  const totalValue = normalizedHoldings.reduce((sum, item) => sum + item.value, 0);
  const avgDiscount = normalizedHoldings.length ? normalizedHoldings.reduce((sum, item) => sum + item.discount, 0) / normalizedHoldings.length : 0;
  const topPick = [...normalizedHoldings].sort((a, b) => b.value - a.value)[0]?.symbol || '--';
  const pieData = Object.values(normalizedHoldings.reduce((acc: Record<string, { name: string; value: number }>, item) => {
    if (!acc[item.sector]) acc[item.sector] = { name: item.sector, value: 0 };
    acc[item.sector].value += item.value;
    return acc;
  }, {}));

  const createPortfolio = async () => {
    setCreating(true);
    try {
      await axios.post('/api/portfolio/', { name: form.name || 'My Portfolio', sector: form.sector });
      const list = await fetchPortfolios();
      const newest = list[list.length - 1];
      if (newest?.id) setSelectedPortfolioId(newest.id);
      toast.success('Portfolio created');
      setForm((current) => ({ ...current, name: '', sector: '' }));
    } catch {
      try {
        await axios.post('/api/portfolio/', { name: form.name || 'My Portfolio', sector: form.sector });
        const list = await fetchPortfolios();
        const newest = list[list.length - 1];
        if (newest?.id) setSelectedPortfolioId(newest.id);
        toast.success('Portfolio created');
      } catch {
        toast.error('Cannot connect to server');
      }
    } finally {
      setCreating(false);
    }
  };

  const addStock = async () => {
    if (!selectedPortfolioId) {
      toast.error('Please select a portfolio from Dashboard');
      return;
    }

    setAdding(true);
    try {
      await axios.post('/api/portfolio/', {
        stock_symbol: form.stockSymbol,
        quantity: form.quantity,
        portfolio_id: selectedPortfolioId,
      });
      await fetchHoldings(selectedPortfolioId);
      toast.success('Stock added');
    } catch {
      toast.error('Cannot connect to server');
    } finally {
      setAdding(false);
    }
  };

  return (
    <PageLayout title="Dashboard">
      <SectionHeader label="Portfolio Command" title="Dashboard" description="Dashboard data now follows the selected portfolio from shared context and local storage." />
      <div style={{ display: 'grid', gap: 18 }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <select className="select-field" value={selectedPortfolioId || ''} onChange={(event) => setSelectedPortfolioId(Number(event.target.value) || null)}>
              <option value="">Select Portfolio</option>
              {portfolios.map((portfolio) => (
                <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>01 Create Portfolio</div>
              <input className="input-field" placeholder="Portfolio name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <input className="input-field" placeholder="Sector" value={form.sector} onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))} style={{ marginTop: 10 }} />
              <button className="btn btn-primary" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => void createPortfolio()} disabled={creating}>
                {creating ? 'Creating...' : 'Create Portfolio'}
              </button>
            </div>

            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>02 Country</div>
              <select className="select-field" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} style={{ width: '100%' }}>
                {Object.keys(marketSectors).map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>03 Sector</div>
              <select className="select-field" value={form.marketSector} onChange={(event) => setForm((current) => ({ ...current, marketSector: event.target.value, stockSymbol: '' }))} style={{ width: '100%' }}>
                {marketSectors[form.country].map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>04 Select Stock</div>
              <select className="select-field" value={form.stockSymbol} onChange={(event) => setForm((current) => ({ ...current, stockSymbol: event.target.value }))} style={{ width: '100%' }}>
                {filteredStocks.map((stock) => (
                  <option key={stock.id || stock.symbol} value={stock.symbol}>{stock.symbol} - {getCompanyName(stock)}</option>
                ))}
              </select>
            </div>

            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>05 Quantity and Add</div>
              <input className="input-field" type="number" min={1} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) || 1 }))} />
              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.7, marginTop: 10 }}>
                Portfolio: {selectedPortfolioId || '--'}<br />
                Country: {form.country}<br />
                Sector: {form.marketSector}<br />
                Ticker: {form.stockSymbol || '--'}
              </div>
              <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => void addStock()} disabled={adding}>
                {adding ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Holdings Count" value={normalizedHoldings.length} dotColor="var(--purple)" />
          <StatCard label="Average Discount" value={avgDiscount} dotColor="var(--accent-gold)" />
          <StatCard label="Undervalued Count" value={normalizedHoldings.filter((item) => item.discount > 0).length} dotColor="var(--green)" />
          <StatCard label="Top Pick" value={topPick} dotColor="var(--blue-light)" />
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          <SectionHeader label="Holdings" title="Live Portfolio Positions" description="All price values are converted through the selected currency context." />
          {loading ? (
            <SkeletonTable rows={6} cols={9} />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Company</th>
                    <th>Qty</th>
                    <th>Buy Price</th>
                    <th>Current Price</th>
                    <th>P/E</th>
                    <th>Discount %</th>
                    <th>P&amp;L</th>
                    <th>Position Value</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedHoldings.map((item) => (
                    <tr key={item.symbol}>
                      <td>{item.symbol}</td>
                      <td>{item.company}</td>
                      <td>{item.quantity}</td>
                      <td>{format(item.buyPrice)}</td>
                      <td>{format(item.currentPrice)}</td>
                      <td>{item.pe.toFixed(1)}</td>
                      <td style={{ color: item.discount >= 0 ? 'var(--green)' : 'var(--red)' }}>{item.discount.toFixed(2)}%</td>
                      <td style={{ color: item.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{format(item.pnl)}</td>
                      <td>{format(item.value)}</td>
                    </tr>
                  ))}
                  {!normalizedHoldings.length ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No holdings in the selected portfolio.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
            Total portfolio value: <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{format(totalValue)}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Sector Allocation</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92}>
                  {pieData.map((entry, index) => <Cell key={entry.name} fill={sectorColors[index % sectorColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top Discount Opportunities</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...normalizedHoldings].sort((a, b) => b.discount - a.discount).slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="symbol" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="discount" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top Growth Stocks</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...normalizedHoldings].sort((a, b) => b.pnl - a.pnl).slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="symbol" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="pnl" fill="#f0b429" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
