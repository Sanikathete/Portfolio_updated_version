import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { MOCK_PORTFOLIO } from '../data/mockData';
import { chartGridProps, chartLegendStyle, chartTooltipStyle, chartXAxisProps, chartYAxisProps } from '../utils/chart';

const compareUniverse = [
  ...MOCK_PORTFOLIO.map((item, index) => ({
    name: item.symbol,
    type: 'Stock',
    currentPrice: item.currentPrice,
    performance: 8 + index * 2.3,
    pe: item.pe,
    benefitScore: 68 + index * 5,
    marketReturn: 10 + index * 2,
    linearReturn: 11 + index * 1.7,
    arimaReturn: 12 + index * 1.9,
    peScore: Math.max(4, 10 - index),
  })),
  { name: 'Gold', type: 'Commodity', currentPrice: 7150, performance: 12.6, pe: 0, benefitScore: 74, marketReturn: 9, linearReturn: 10.2, arimaReturn: 11.4, peScore: 5 },
  { name: 'Silver', type: 'Commodity', currentPrice: 86.4, performance: 15.2, pe: 0, benefitScore: 79, marketReturn: 11, linearReturn: 12.8, arimaReturn: 13.6, peScore: 5 },
  { name: 'Bitcoin', type: 'Crypto', currentPrice: 68420, performance: 22.4, pe: 0, benefitScore: 84, marketReturn: 14, linearReturn: 17.5, arimaReturn: 18.9, peScore: 6 },
];

const Compare = () => {
  const [stockA, setStockA] = useState(compareUniverse[0].name);
  const [stockB, setStockB] = useState(compareUniverse[1].name);

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

  const assetA = compareUniverse.find((item) => item.name === stockA) ?? compareUniverse[0];
  const assetB = compareUniverse.find((item) => item.name === stockB) ?? compareUniverse[1];

  const radarData = [
    { metric: 'Benefit Score', A: assetA.benefitScore / 10, B: assetB.benefitScore / 10 },
    { metric: 'Market Return', A: assetA.marketReturn, B: assetB.marketReturn },
    { metric: 'Linear Return', A: assetA.linearReturn, B: assetB.linearReturn },
    { metric: 'ARIMA Return', A: assetA.arimaReturn, B: assetB.arimaReturn },
    { metric: 'PE Score', A: assetA.peScore, B: assetB.peScore },
  ];

  const ranking = useMemo(() => [...compareUniverse].sort((a, b) => b.benefitScore - a.benefitScore), []);

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <section className="panel">
          <div className="page-title">Compare Opportunities</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Benchmark stocks, commodities, and crypto against common benefit and forecast factors.
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="Most Beneficial" value={ranking[0].name} dotColor="var(--accent-blue)" />
          <StatCard title="Best Benefit Score" value={ranking[0].benefitScore} dotColor="var(--green)" />
          <StatCard title="Best ARIMA Return %" value={`${ranking[0].arimaReturn}%`} dotColor="var(--yellow)" />
        </section>

        <section className="panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div>
            <div className="label">Stock A</div>
            <select value={stockA} onChange={(event) => setStockA(event.target.value)} style={{ marginTop: 10 }}>
              {compareUniverse.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Stock B</div>
            <select value={stockB} onChange={(event) => setStockB(event.target.value)} style={{ marginTop: 10 }}>
              {compareUniverse.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">Price Comparison</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={[{ name: 'Current Price', A: assetA.currentPrice, B: assetB.currentPrice }]}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="name" {...chartXAxisProps} />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={chartLegendStyle} />
                  <Bar dataKey="A" fill="#1a6bff" name={assetA.name} />
                  <Bar dataKey="B" fill="#2ecc71" name={assetB.name} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel">
            <div className="label">Performance Comparison</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1a2540" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#4a6080', fontSize: 10 }} />
                  <Legend wrapperStyle={chartLegendStyle} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Radar dataKey="A" stroke="#1a6bff" fill="#1a6bff" fillOpacity={0.25} name={assetA.name} />
                  <Radar dataKey="B" stroke="#2ecc71" fill="#2ecc71" fillOpacity={0.25} name={assetB.name} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="label">P/E Ratio</div>
          <div style={{ width: '100%', height: 280, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ranking}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="name" {...chartXAxisProps} />
                <YAxis {...chartYAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="pe" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="label">Ranking Table</div>
          <div className="overflow-table" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type</th>
                  <th>Current Price</th>
                  <th>Performance</th>
                  <th>P/E</th>
                  <th>Benefit Score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.type}</td>
                    <td>{row.currentPrice}</td>
                    <td>{row.performance}%</td>
                    <td>{row.pe}</td>
                    <td>{row.benefitScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Compare;
