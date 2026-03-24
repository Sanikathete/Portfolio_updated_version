import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { INDIAN_STOCKS, MOCK_PORTFOLIO, generateChartData } from '../data/mockData';
import { chartGridProps, chartLegendStyle, chartTooltipStyle, chartXAxisProps, chartYAxisProps, renderNoData } from '../utils/chart';
import { formatCurrency } from '../utils/format';
import { useAuth } from '../context/AuthContext';

const sectorMap = {
  India: ['Nifty Auto', 'Nifty Bank', 'Nifty IT', 'Nifty Pharma', 'Nifty FMCG', 'Nifty Metal'],
  USA: ['Technology', 'Healthcare', 'Financials', 'Energy', 'Consumer'],
  Global: ['All Sectors'],
} as const;

const growthTabs = ['1M', '3M', '6M', '1Y'] as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [portfolioTabs, setPortfolioTabs] = useState<string[]>(['My Portfolio', 'Tech Stocks', 'Banking']);
  const [activeTab, setActiveTab] = useState('My Portfolio');
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioSector, setPortfolioSector] = useState('');
  const [country, setCountry] = useState<'India' | 'USA' | 'Global'>('India');
  const [sector, setSector] = useState<(typeof sectorMap)['India'][number] | (typeof sectorMap)['USA'][number] | 'All Sectors'>('Nifty IT');
  const [selectedTicker, setSelectedTicker] = useState('TCS');
  const [quantity, setQuantity] = useState(10);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [growthTab, setGrowthTab] = useState<(typeof growthTabs)[number]>('3M');

  useEffect(() => {
    const loadPortfolioTabs = async () => {
      setLoadingTabs(true);
      try {
        const response = await api.get('/api/portfolio/');
        const incoming = Array.isArray(response.data)
          ? response.data.map((item: { name?: string } | string) => (typeof item === 'string' ? item : item.name ?? 'Portfolio'))
          : [];
        setPortfolioTabs(incoming.length ? incoming : ['My Portfolio', 'Tech Stocks', 'Banking']);
        setActiveTab((incoming[0] as string) || 'My Portfolio');
      } catch (error) {
        console.error(error);
        setPortfolioTabs(['My Portfolio', 'Tech Stocks', 'Banking']);
      } finally {
        setLoadingTabs(false);
      }
    };

    void loadPortfolioTabs();
  }, []);

  const sectorOptions = sectorMap[country];

  useEffect(() => {
    setSector(sectorOptions[0]);
  }, [sectorOptions]);

  const filteredStocks = useMemo(() => {
    if (country !== 'India') return INDIAN_STOCKS;
    const sectorLookup: Record<string, string> = {
      'Nifty IT': 'IT',
      'Nifty Bank': 'Banking',
      'Nifty Auto': 'Auto',
      'Nifty Pharma': 'Pharma',
      'Nifty FMCG': 'FMCG',
      'Nifty Metal': 'Energy',
    };
    return INDIAN_STOCKS.filter((stock) => stock.sector === sectorLookup[sector]);
  }, [country, sector]);

  useEffect(() => {
    if (filteredStocks.length) {
      setSelectedTicker(filteredStocks[0].symbol);
    }
  }, [filteredStocks]);

  const avgDiscount = MOCK_PORTFOLIO.reduce((sum, stock) => sum + stock.discount, 0) / MOCK_PORTFOLIO.length;
  const undervalued = MOCK_PORTFOLIO.filter((stock) => stock.discount > 5).length;
  const topPick = [...MOCK_PORTFOLIO].sort((a, b) => b.discount - a.discount)[0]?.symbol ?? 'N/A';
  const totalPortfolioValue = MOCK_PORTFOLIO.reduce((sum, stock) => sum + stock.currentPrice * stock.quantity, 0);

  const discountData = MOCK_PORTFOLIO.map((stock) => ({ name: stock.symbol, discount: stock.discount }));
  const growthData = generateChartData(
    growthTab === '1M' ? 6 : growthTab === '3M' ? 8 : growthTab === '6M' ? 10 : 12,
    15,
    5,
  ).map((item, index) => ({ name: item.date, growth: item.value + index * 1.6 }));

  const createPortfolio = async () => {
    setLoadingCreate(true);
    try {
      await api.post('/api/portfolio/create/', { name: portfolioName, sector: portfolioSector });
      const next = portfolioName || 'New Portfolio';
      setPortfolioTabs((current) => [...current, next]);
      setActiveTab(next);
      window.__showToast?.('Portfolio created successfully.', 'success');
    } catch (error) {
      console.error(error);
      const next = portfolioName || 'New Portfolio';
      setPortfolioTabs((current) => (current.includes(next) ? current : [...current, next]));
      setActiveTab(next);
      window.__showToast?.('Using local portfolio data while the API is unavailable.', 'info');
    } finally {
      setLoadingCreate(false);
    }
  };

  const addStock = async () => {
    setLoadingAdd(true);
    try {
      await api.post('/api/portfolio/add-stock/', {
        portfolio: activeTab,
        country,
        sector,
        symbol: selectedTicker,
        quantity,
      });
      window.__showToast?.(`${selectedTicker} added to ${activeTab}.`, 'success');
    } catch (error) {
      console.error(error);
      window.__showToast?.(`Saved ${selectedTicker} locally for ${activeTab}.`, 'info');
    } finally {
      setLoadingAdd(false);
    }
  };

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 20 }}>
        <section className="panel">
          <div className="page-title">Welcome, {user?.username || 'Trader'}!</div>
          <div className="label" style={{ marginTop: 8 }}>
            Portfolio Workspace
          </div>
          <div style={{ display: 'flex', gap: 18, overflowX: 'auto', marginTop: 18, paddingBottom: 6 }}>
            {loadingTabs
              ? ['...', '...', '...'].map((item, index) => (
                  <div key={`${item}-${index}`} style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Loading...
                  </div>
                ))
              : portfolioTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'transparent',
                      color: tab === activeTab ? 'var(--accent-blue)' : 'var(--text-muted)',
                      borderBottom: tab === activeTab ? '2px solid var(--accent-blue)' : '2px solid transparent',
                      borderRadius: 0,
                      paddingInline: 0,
                    }}
                  >
                    {tab}
                  </button>
                ))}
          </div>
        </section>

        <section className="panel">
          <div className="label">Build Portfolio</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
              gap: 16,
              marginTop: 16,
            }}
          >
            <div className="panel" style={{ padding: 14 }}>
              <span className="badge badge-blue">Step 1</span>
              <div style={{ marginTop: 10, marginBottom: 10 }}>Portfolio Setup</div>
              <input value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} placeholder="Portfolio name" />
              <div style={{ marginTop: 10 }}>
                <input value={portfolioSector} onChange={(event) => setPortfolioSector(event.target.value)} placeholder="Optional sector" />
              </div>
              <button className="btn-blue" disabled={loadingCreate} style={{ width: '100%', marginTop: 12 }} onClick={createPortfolio}>
                {loadingCreate ? 'Creating...' : 'Create Portfolio'}
              </button>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <span className="badge badge-blue">Step 2</span>
              <div style={{ marginTop: 10, marginBottom: 10 }}>Market Focus</div>
              <select value={country} onChange={(event) => setCountry(event.target.value as 'India' | 'USA' | 'Global')}>
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="Global">Global</option>
              </select>
              <div style={{ marginTop: 10 }}>
                <select value={sector} onChange={(event) => setSector(event.target.value as typeof sector)}>
                  {sectorOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <span className="badge badge-blue">Step 3</span>
              <div style={{ marginTop: 10, marginBottom: 10 }}>Select Stock</div>
              <select value={selectedTicker} onChange={(event) => setSelectedTicker(event.target.value)}>
                {filteredStocks.map((stock) => (
                  <option key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} - {stock.company}
                  </option>
                ))}
              </select>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <span className="badge badge-blue">Step 4</span>
              <div style={{ marginTop: 10, marginBottom: 10 }}>Allocation</div>
              <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                <div className="label">Active Portfolio: {activeTab}</div>
                <div className="label">Country: {country}</div>
                <div className="label">Sector: {sector}</div>
                <div className="label">Selected Ticker: {selectedTicker}</div>
              </div>
            </div>

            <div className="panel" style={{ padding: 14 }}>
              <span className="badge badge-blue">Step 5</span>
              <div style={{ marginTop: 10, marginBottom: 10 }}>Execute</div>
              <button className="btn-blue" disabled={loadingAdd} style={{ width: '100%' }} onClick={addStock}>
                {loadingAdd ? 'Adding...' : 'Add Stock'}
              </button>
              <button className="btn-outline" style={{ width: '100%', marginTop: 10 }} onClick={() => navigate('/growth')}>
                Open Growth Analytics
              </button>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="Holdings Count" value={MOCK_PORTFOLIO.length} dotColor="var(--accent-blue)" />
          <StatCard title="Avg Discount %" value={Number(avgDiscount.toFixed(2))} dotColor="var(--green)" />
          <StatCard title="Undervalued Stocks" value={undervalued} dotColor="var(--yellow)" />
          <StatCard title="Top Pick" value={topPick} dotColor="var(--purple)" />
        </section>

        <section className="panel">
          <div className="label">Live Holdings</div>
          <div className="overflow-table" style={{ marginTop: 14 }}>
            {MOCK_PORTFOLIO.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Company</th>
                    <th>Quantity</th>
                    <th>Buy Price</th>
                    <th>Current Price</th>
                    <th>P/E</th>
                    <th>Discount %</th>
                    <th>Profit/Loss</th>
                    <th>Position Value</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PORTFOLIO.map((stock) => {
                    const pnl = (stock.currentPrice - stock.buyPrice) * stock.quantity;
                    const discountColor = stock.discount > 10 ? 'var(--green)' : stock.discount > 0 ? 'var(--yellow)' : 'var(--red)';
                    return (
                      <tr key={stock.symbol}>
                        <td>{stock.symbol}</td>
                        <td>{stock.company}</td>
                        <td>{stock.quantity}</td>
                        <td>{formatCurrency(stock.buyPrice)}</td>
                        <td>{formatCurrency(stock.currentPrice)}</td>
                        <td>{stock.pe}</td>
                        <td style={{ color: discountColor }}>{stock.discount.toFixed(2)}%</td>
                        <td style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(pnl)}</td>
                        <td>{formatCurrency(stock.currentPrice * stock.quantity)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-blue" style={{ padding: '6px 10px' }} onClick={() => navigate(`/portfolio/${stock.symbol}`)}>
                              View
                            </button>
                            <button className="btn-red" style={{ padding: '6px 10px' }} onClick={() => window.__showToast?.(`${stock.symbol} removal queued.`, 'info')}>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={8} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      Total Portfolio Value
                    </td>
                    <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{formatCurrency(totalPortfolioValue)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            ) : (
              renderNoData()
            )}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">Top Discount Opportunities</div>
            <div style={{ width: '100%', height: 300, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={discountData}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="name" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="discount" fill="#1a6bff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="label">Top Growth Stocks</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {growthTabs.map((item) => (
                  <button
                    key={item}
                    className={item === growthTab ? 'btn-blue' : 'btn-outline'}
                    style={{ padding: '4px 10px' }}
                    onClick={() => setGrowthTab(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: '100%', height: 300, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={growthData}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="name" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={chartLegendStyle} />
                  <Bar dataKey="growth" fill="#2ecc71" radius={[4, 4, 0, 0]} name="Growth %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Dashboard;
