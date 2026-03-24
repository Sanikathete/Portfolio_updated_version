import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { ForecastChart } from '../components/ForecastChart';
import { StatCard } from '../components/StatCard';
import { usePortfolio } from '../context/PortfolioContext';
import { buildForecastData } from '../utils/forecastHelpers';

const colors = ['#7eb8f7','#f39c12','#2ecc71','#e74c3c','#a78bfa','#1abc9c','#f0b429'];

const Growth: React.FC = () => {
  const { activePortfolioId } = usePortfolio();
  const [forecast, setForecast] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!activePortfolioId) return;
      try {
        const [growthRes, portfolioRes] = await Promise.all([
          axios.get(`/api/portfolio/growth/?portfolio_id=${activePortfolioId}`),
          axios.get(`/api/portfolio/?portfolio_id=${activePortfolioId}`),
        ]);
        setForecast(buildForecastData(growthRes.data?.historical || [], growthRes.data?.predicted || []));
        const items = portfolioRes.data?.items || portfolioRes.data || [];
        setHoldings(Array.isArray(items) ? items : []);
      } catch {
        toast.error('Unable to load growth analytics.');
      }
    };
    void load();
  }, [activePortfolioId]);

  const normalized = holdings.map((item) => {
    const stock = item.stock || item;
    return { symbol: stock.symbol, sector: stock.sector || 'Other', discount: Number(stock.discount_percent ?? stock.discount ?? 0), value: Number(stock.current_price ?? stock.price ?? 0) * Number(item.quantity ?? 0), growth: Number(stock.change_percent ?? 0) };
  });
  const sectorData = Object.values(normalized.reduce((acc: Record<string, { name: string; value: number }>, item) => {
    if (!acc[item.sector]) acc[item.sector] = { name: item.sector, value: 0 };
    acc[item.sector].value += item.value;
    return acc;
  }, {}));
  const scatterData = normalized.map((item, index) => ({ x: index * 12 + 10, y: item.growth * 2 + 25, z: item.value, symbol: item.symbol }));

  return (
    <PageLayout title="Growth">
      <SectionHeader label="Forward Curves" title="Growth" description="Historical and predicted portfolio growth are merged into one connected chart keyed by the active portfolio." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Holdings Count" value={normalized.length} dotColor="var(--purple)" />
          <StatCard label="Average Discount" value={normalized.length ? normalized.reduce((sum, item) => sum + item.discount, 0) / normalized.length : 0} dotColor="var(--accent-gold)" />
          <StatCard label="Undervalued Count" value={normalized.filter((item) => item.discount > 0).length} dotColor="var(--green)" />
          <StatCard label="Top Pick" value={[...normalized].sort((a, b) => b.discount - a.discount)[0]?.symbol || '—'} dotColor="var(--blue-light)" />
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <ForecastChart data={forecast} title="Portfolio Growth" height={340} showArea />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Sector Donut</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={sectorData} dataKey="value" innerRadius={60} outerRadius={90}>{sectorData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top Discount Bar</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...normalized].sort((a, b) => b.discount - a.discount)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="symbol" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="discount" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top Growth Bar</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...normalized].sort((a, b) => b.growth - a.growth)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="symbol" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="growth" fill="#f0b429" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Risk Clustering</div>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatterData} fill="#a78bfa" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Growth;
