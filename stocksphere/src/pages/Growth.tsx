import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { MOCK_PORTFOLIO, generateChartData } from '../data/mockData';
import { chartGridProps, chartLegendStyle, chartTooltipStyle, chartXAxisProps, chartYAxisProps } from '../utils/chart';
import { riskBadgeClass } from '../utils/format';

const riskRows = MOCK_PORTFOLIO.map((stock, index) => ({
  ticker: stock.symbol,
  cluster: `Cluster ${index % 3 + 1}`,
  volatility: `${(12 + index * 1.8).toFixed(1)}%`,
  sharpe: (1.1 + index * 0.12).toFixed(2),
  drawdown: `${(-6 - index * 1.2).toFixed(1)}%`,
  cagr: `${(10 + index * 1.4).toFixed(1)}%`,
  risk: index % 3 === 0 ? 'Low Risk' : index % 3 === 1 ? 'Medium Risk' : 'High Risk',
}));

const pieColors = ['#7eb8f7', '#2ecc71', '#f39c12', '#a855f7', '#0ed2f7', '#e74c3c'];

const Growth = () => {
  const [currency, setCurrency] = useState('INR');
  const [portfolio, setPortfolio] = useState('My Portfolio');
  const [timePeriod, setTimePeriod] = useState('6M');
  const [clusterPage, setClusterPage] = useState(0);

  useEffect(() => {
    const hydrate = async () => {
      try {
        await api.get('/api/portfolio/');
      } catch (error) {
        console.error(error);
      }
    };

    void hydrate();
  }, []);

  const growthSeries = useMemo(() => {
    const actual = generateChartData(90, 100, 16);
    return actual.map((item, index) => ({
      date: item.date,
      actual: item.value + index * 0.7,
      prediction: index >= 54 ? item.value + index * 0.95 : null,
    }));
  }, [timePeriod]);

  const sectorData = [
    { name: 'IT', value: 34 },
    { name: 'Banking', value: 18 },
    { name: 'Energy', value: 14 },
    { name: 'Auto', value: 12 },
    { name: 'Pharma', value: 10 },
    { name: 'FMCG', value: 12 },
  ];

  const discountData = MOCK_PORTFOLIO.map((stock) => ({ name: stock.symbol, value: stock.discount }));
  const growthLeaders = MOCK_PORTFOLIO.map((stock, index) => ({ name: stock.symbol, value: 8 + index * 3.2 }));

  const scatterData = Array.from({ length: 15 }, (_, index) => ({
    x: 10 + index * 4,
    y: 15 + ((index * 7) % 40),
    z: 80,
    symbol: `${MOCK_PORTFOLIO[index % MOCK_PORTFOLIO.length].symbol}${index}`,
    cluster: index % 3,
  }));

  const visibleRows = riskRows.slice(clusterPage, clusterPage + 3);

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <section className="panel">
          <div className="page-title">Growth</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Portfolio growth forecasting, clustering, and sector allocation intelligence.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
            <select value={portfolio} onChange={(event) => setPortfolio(event.target.value)}>
              <option>My Portfolio</option>
              <option>Tech Stocks</option>
              <option>Banking</option>
            </select>
            <select value={timePeriod} onChange={(event) => setTimePeriod(event.target.value)}>
              <option>1M</option>
              <option>3M</option>
              <option>6M</option>
              <option>1Y</option>
            </select>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="Portfolio Return" value="14.8%" dotColor="var(--accent-blue)" />
          <StatCard title="Projected Value" value="18.7%" dotColor="var(--green)" />
          <StatCard title="Discount Edge" value="7.46%" dotColor="var(--yellow)" />
          <StatCard title="Risk Adjusted" value="1.34" dotColor="var(--purple)" />
        </section>

        <section className="panel">
          <div className="label">Portfolio Growth</div>
          <div style={{ width: '100%', height: 320, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={growthSeries}>
                <defs>
                  <linearGradient id="growth-actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ed2f7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0ed2f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="growth-prediction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f39c12" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f39c12" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="date" hide />
                <YAxis {...chartYAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend verticalAlign="top" align="right" wrapperStyle={chartLegendStyle} />
                <Area type="monotone" dataKey="actual" stroke="#0ed2f7" fill="url(#growth-actual)" name="Actual" />
                <Area type="monotone" dataKey="prediction" stroke="#f39c12" fill="url(#growth-prediction)" strokeDasharray="5 5" name="Prediction" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">Sector-Wise Distribution</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={50} outerRadius={80}>
                    {sectorData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend verticalAlign="bottom" wrapperStyle={chartLegendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel">
            <div className="label">Top Discount Opportunities</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={discountData}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="name" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" fill="#1a6bff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">Top Growth Stocks</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={growthLeaders}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="name" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="value" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel">
            <div className="label">Risk Categories</div>
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {riskRows.map((row) => (
                <div key={row.ticker} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{row.ticker}</span>
                  <span className={riskBadgeClass(row.risk)}>{row.risk}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">PCA Scatter Plot</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis type="number" dataKey="x" name="PCA 1" {...chartXAxisProps} />
                  <YAxis type="number" dataKey="y" name="PCA 2" {...chartYAxisProps} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={chartTooltipStyle} formatter={(_, __, data) => [data?.payload?.symbol ?? '', 'Ticker']} />
                  {[0, 1, 2].map((cluster) => (
                    <Scatter
                      key={cluster}
                      data={scatterData.filter((item) => item.cluster === cluster)}
                      fill={cluster === 0 ? '#7eb8f7' : cluster === 1 ? '#2ecc71' : '#a855f7'}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <div className="label">Cluster Metrics</div>
            <div className="overflow-table" style={{ marginTop: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Cluster</th>
                    <th>Volatility</th>
                    <th>Sharpe</th>
                    <th>Drawdown</th>
                    <th>CAGR</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.ticker}>
                      <td>{row.ticker}</td>
                      <td>{row.cluster}</td>
                      <td>{row.volatility}</td>
                      <td>{row.sharpe}</td>
                      <td>{row.drawdown}</td>
                      <td>{row.cagr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn-outline" disabled={clusterPage === 0} onClick={() => setClusterPage((value) => Math.max(0, value - 1))}>←</button>
              <button className="btn-outline" disabled={clusterPage >= riskRows.length - 3} onClick={() => setClusterPage((value) => Math.min(riskRows.length - 3, value + 1))}>→</button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Growth;
