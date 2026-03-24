import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend } from 'recharts';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { usePortfolio } from '../context/PortfolioContext';

const Compare: React.FC = () => {
  const { activePortfolioId } = usePortfolio();
  const [assets, setAssets] = useState<any[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  useEffect(() => {
    const load = async () => {
      const res = await axios.get(`/api/portfolio/?portfolio_id=${activePortfolioId || ''}`).catch(() => ({ data: [] }));
      const items = Array.isArray(res.data?.items || res.data) ? (res.data.items || res.data) : [];
      const portfolioAssets = items.map((item: any, index: number) => {
        const stock = item.stock || item;
        return { name: stock.symbol, type: 'Stock', price: Number(stock.current_price ?? stock.price ?? 0), pe: Number(stock.pe_ratio ?? 18), benefit: 60 + index * 4, marketReturn: 8 + index * 2, linear: 9 + index * 2, arima: 10 + index * 2, performance: 12 + index * 2 };
      });
      const all = [...portfolioAssets, { name: 'Gold', type: 'Commodity', price: 7150, pe: 0, benefit: 78, marketReturn: 8, linear: 9, arima: 11, performance: 14 }, { name: 'Silver', type: 'Commodity', price: 86, pe: 0, benefit: 74, marketReturn: 10, linear: 11, arima: 12, performance: 16 }, { name: 'BTC', type: 'Crypto', price: 68420, pe: 0, benefit: 82, marketReturn: 18, linear: 20, arima: 22, performance: 28 }];
      setAssets(all);
      if (!a && all[0]) setA(all[0].name);
      if (!b && all[1]) setB(all[1].name);
    };
    void load();
  }, [activePortfolioId]);

  const assetA = assets.find((item) => item.name === a) || assets[0];
  const assetB = assets.find((item) => item.name === b) || assets[1];
  const radarData = assetA && assetB ? [
    { metric: 'Benefit Score', A: assetA.benefit, B: assetB.benefit },
    { metric: 'Market Return', A: assetA.marketReturn, B: assetB.marketReturn },
    { metric: 'Linear Return', A: assetA.linear, B: assetB.linear },
    { metric: 'ARIMA Return', A: assetA.arima, B: assetB.arima },
    { metric: 'PE Score', A: assetA.pe || 5, B: assetB.pe || 5 },
  ] : [];
  const ranking = useMemo(() => [...assets].sort((x, y) => y.benefit - x.benefit), [assets]);

  return (
    <PageLayout title="Compare">
      <SectionHeader label="Opportunity Matrix" title="Compare" description="Compare two portfolio assets or macro instruments across shared price and benefit dimensions." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Most Beneficial" value={ranking[0]?.name || '—'} dotColor="var(--purple)" />
          <StatCard label="Best Benefit Score" value={ranking[0]?.benefit || 0} dotColor="var(--green)" />
          <StatCard label="Best ARIMA Return %" value={`${ranking[0]?.arima || 0}%`} dotColor="var(--accent-gold)" />
        </div>
        <div className="glass-card" style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <select className="select-field" value={a} onChange={(e) => setA(e.target.value)}>{assets.map((item) => <option key={item.name}>{item.name}</option>)}</select>
          <select className="select-field" value={b} onChange={(e) => setB(e.target.value)}>{assets.map((item) => <option key={item.name}>{item.name}</option>)}</select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="glass-card" style={{ padding: 18 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{ label: 'Price', A: assetA?.price || 0, B: assetB?.price || 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="A" fill="#7c3aed" />
                <Bar dataKey="B" fill="#f0b429" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e1a3a" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Legend />
                <Radar dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
                <Radar dataKey="B" stroke="#f0b429" fill="#f0b429" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Asset</th><th>Type</th><th>Current Price</th><th>Performance</th><th>P/E</th><th>Benefit Score</th></tr></thead>
              <tbody>{ranking.map((item) => <tr key={item.name}><td>{item.name}</td><td>{item.type}</td><td>{item.price}</td><td>{item.performance}%</td><td>{item.pe}</td><td>{item.benefit}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Compare;
