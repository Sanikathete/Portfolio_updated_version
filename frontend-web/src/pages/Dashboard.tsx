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

const sectorColors = ['#7eb8f7','#f39c12','#2ecc71','#e74c3c','#a78bfa','#1abc9c','#f0b429'];
const marketSectors: Record<string, string[]> = {
  India: ['Nifty IT', 'Nifty Bank', 'Nifty Auto', 'Nifty FMCG', 'Nifty Pharma', 'Nifty Metal'],
  USA: ['USA Tech', 'USA Healthcare'],
  Global: ['Global'],
};

const Dashboard: React.FC = () => {
  const { activePortfolioId, setActivePortfolioId } = usePortfolio();
  const { format } = useCurrency();
  const [holdings, setHoldings] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', sector: '', country: 'India', marketSector: 'Nifty IT', stockSymbol: '', quantity: 1 });

  const fetchPortfolios = async () => {
    const res = await axios.get('/api/portfolio/list/');
    const list = Array.isArray(res.data) ? res.data : [];
    if (!activePortfolioId && list[0]?.id) setActivePortfolioId(list[0].id);
  };

  const fetchAllStocks = async () => {
    const res = await axios.get('/api/stocks/?limit=400&offset=0');
    const data = res.data?.results || res.data || [];
    setStocks(Array.isArray(data) ? data : []);
  };

  const fetchHoldings = async (portfolioId: number | null) => {
    if (!portfolioId) {
      setHoldings([]);
      return;
    }
    const res = await axios.get(`/api/portfolio/?portfolio_id=${portfolioId}`);
    const data = res.data?.items || res.data?.results || res.data || [];
    setHoldings(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchPortfolios(), fetchAllStocks()]);
      } catch {
        toast.error('Unable to load dashboard metadata.');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    void fetchHoldings(activePortfolioId).catch(() => toast.error('Unable to load portfolio holdings.'));
  }, [activePortfolioId]);

  useEffect(() => {
    const options = marketSectors[form.country];
    setForm((current) => ({ ...current, marketSector: options[0] }));
  }, [form.country]);

  const filteredStocks = useMemo(() => stocks.filter((stock) => {
    if (form.marketSector === 'Global') return true;
    const sector = String(stock.sector || '').toLowerCase();
    return sector.includes(form.marketSector.replace('Nifty ', '').replace('USA ', '').toLowerCase());
  }), [stocks, form.marketSector]);

  useEffect(() => {
    if (!form.stockSymbol && filteredStocks[0]?.symbol) {
      setForm((current) => ({ ...current, stockSymbol: filteredStocks[0].symbol }));
    }
  }, [filteredStocks, form.stockSymbol]);

  const normalizedHoldings = holdings.map((item) => {
    const stock = item.stock || item;
    const currentPrice = getPrice(stock);
    const buyPrice = Number(item.buy_price ?? item.buyPrice ?? currentPrice);
    const quantity = Number(item.quantity ?? 0);
    const discount = Number(stock.discount_percent ?? stock.discount ?? 0);
    const pe = Number(stock.pe_ratio ?? stock.pe ?? 18);
    return {
      symbol: stock.symbol,
      company: getCompanyName(stock),
      quantity,
      buyPrice,
      currentPrice,
      pe,
      discount,
      pnl: (currentPrice - buyPrice) * quantity,
      value: currentPrice * quantity,
      sector: getSector(stock),
    };
  });

  const totalValue = normalizedHoldings.reduce((sum, item) => sum + item.value, 0);
  const topPick = [...normalizedHoldings].sort((a, b) => b.discount - a.discount)[0]?.symbol || '—';
  const avgDiscount = normalizedHoldings.length ? normalizedHoldings.reduce((sum, item) => sum + item.discount, 0) / normalizedHoldings.length : 0;
  const undervalued = normalizedHoldings.filter((item) => item.discount > 0).length;

  const pieData = Object.values(normalizedHoldings.reduce((acc: Record<string, { name: string; value: number }>, item) => {
    const key = item.sector || 'Other';
    if (!acc[key]) acc[key] = { name: key, value: 0 };
    acc[key].value += item.value;
    return acc;
  }, {}));

  const createPortfolio = async () => {
    setCreating(true);
    try {
      await axios.post('/api/portfolio/create/', { name: form.name, sector: form.sector });
      await fetchPortfolios();
      toast.success('Portfolio created');
      setForm((current) => ({ ...current, name: '', sector: '' }));
    } catch {
      toast.error('Unable to create portfolio.');
    } finally {
      setCreating(false);
    }
  };

  const addStock = async () => {
    if (!activePortfolioId) return toast.error('Select a portfolio first.');
    setAdding(true);
    try {
      await axios.post('/api/portfolio/', { stock_symbol: form.stockSymbol, quantity: form.quantity, portfolio_id: activePortfolioId });
      await fetchHoldings(activePortfolioId);
      toast.success('Stock added to portfolio');
    } catch {
      toast.error('Unable to add stock to portfolio.');
    } finally {
      setAdding(false);
    }
  };

  const removeStock = async (symbol: string) => {
    if (!activePortfolioId) return;
    try {
      await axios.delete('/api/portfolio/remove/', { data: { portfolio_id: activePortfolioId, symbol } });
      await fetchHoldings(activePortfolioId);
      toast.success(`${symbol} removed`);
    } catch {
      toast.error('Unable to remove holding.');
    }
  };

  return (
    <PageLayout title="Dashboard">
      <SectionHeader label="Portfolio Command" title="Dashboard" description="Active portfolio analytics, builder flow, and position monitoring update when the header selector changes." />
      <div style={{ display: 'grid', gap: 18 }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }} className="stagger-children">
            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>01 Create</div>
              <input className="input-field" placeholder="Portfolio name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
              <input className="input-field" placeholder="Optional sector" value={form.sector} onChange={(e) => setForm((c) => ({ ...c, sector: e.target.value }))} style={{ marginTop: 10 }} />
              <button className="btn btn-primary" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={createPortfolio} disabled={creating}>{creating ? 'Creating...' : 'Create Portfolio'}</button>
            </div>
            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>02 Market</div>
              <select className="select-field" value={form.country} onChange={(e) => setForm((c) => ({ ...c, country: e.target.value }))} style={{ width: '100%' }}>
                {Object.keys(marketSectors).map((name) => <option key={name}>{name}</option>)}
              </select>
              <select className="select-field" value={form.marketSector} onChange={(e) => setForm((c) => ({ ...c, marketSector: e.target.value }))} style={{ width: '100%', marginTop: 10 }}>
                {marketSectors[form.country].map((name) => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>03 Stock</div>
              <select className="select-field" value={form.stockSymbol} onChange={(e) => setForm((c) => ({ ...c, stockSymbol: e.target.value }))} style={{ width: '100%' }}>
                {filteredStocks.map((stock) => <option key={stock.symbol} value={stock.symbol}>{stock.symbol} — {getCompanyName(stock)}</option>)}
              </select>
            </div>
            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>04 Quantity</div>
              <input className="input-field" type="number" min={1} value={form.quantity} onChange={(e) => setForm((c) => ({ ...c, quantity: Number(e.target.value) || 1 }))} />
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 10, lineHeight: 1.7 }}>
                Portfolio: {activePortfolioId || '—'}<br />
                Market: {form.country}<br />
                Sector: {form.marketSector}
              </div>
            </div>
            <div className="glass-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-gold)', marginBottom: 8 }}>05 Execute</div>
              <button className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={addStock} disabled={adding}>{adding ? 'Adding...' : 'Add Stock'}</button>
              <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => (window.location.href = '/growth')}>Open Growth</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Holdings Count" value={normalizedHoldings.length} dotColor="var(--purple)" />
          <StatCard label="Average Discount" value={avgDiscount} dotColor="var(--accent-gold)" subtext="Across active holdings" />
          <StatCard label="Undervalued Count" value={undervalued} dotColor="var(--green)" />
          <StatCard label="Top Pick" value={topPick} dotColor="var(--blue-light)" />
        </div>

        <div className="glass-card" style={{ padding: 18 }}>
          <SectionHeader label="Holdings" title="Live Portfolio Positions" description="Position value, discount, and P&L are converted using the active currency." />
          {loading ? <SkeletonTable rows={6} cols={10} /> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th><th>Company</th><th>Qty</th><th>Buy Price</th><th>Current Price</th><th>P/E</th><th>Discount %</th><th>P&amp;L</th><th>Position Value</th><th>Actions</th>
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
                      <td><button className="btn btn-danger" style={{ padding: '4px 10px' }} onClick={() => removeStock(item.symbol)}>Remove</button></td>
                    </tr>
                  ))}
                  {!normalizedHoldings.length ? <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No holdings in the active portfolio.</td></tr> : null}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Total portfolio value: <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{format(totalValue)}</span></div>
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
