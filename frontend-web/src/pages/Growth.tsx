import React, { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { ForecastChart } from '../components/ForecastChart';
import { StatCard } from '../components/StatCard';
import { usePortfolio } from '../context/PortfolioContext';
import { buildForecastData, generateForecastSeries, seededNumber } from '../utils/forecastHelpers';
import { getPrice } from '../utils/pageUtils';

const colors = ['#7eb8f7', '#f39c12', '#2ecc71', '#e74c3c', '#a78bfa', '#1abc9c'];

const Growth: React.FC = () => {
  const { selectedPortfolioId } = usePortfolio();
  const [holdings, setHoldings] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!selectedPortfolioId) {
        setHoldings([]);
        setForecast([]);
        return;
      }

      try {
        const response = await axios.get(`/api/portfolio/?portfolio_id=${selectedPortfolioId}`);
        const items = response.data?.items || response.data || [];
        const list = Array.isArray(items) ? items : [];
        setHoldings(list);

        const startValue = list.reduce((sum: number, item: any) => sum + Number(item.buy_price ?? getPrice(item.stock || item)) * Number(item.quantity ?? 0), 0);
        const currentValue = list.reduce((sum: number, item: any) => sum + getPrice(item.stock || item) * Number(item.quantity ?? 0), 0);
        const random = seededNumber(`growth-${selectedPortfolioId}`);
        const historical = Array.from({ length: 90 }, (_, index) => {
          const progress = index / 89;
          const base = startValue + (currentValue - startValue) * progress;
          const noise = 1 + (random() - 0.5) * 0.08;
          return {
            date: new Date(Date.now() - (89 - index) * 86400000).toISOString(),
            value: Number((base * noise).toFixed(2)),
          };
        });
        historical[historical.length - 1].value = currentValue;

        const predicted = generateForecastSeries({
          days: 90,
          startPrice: currentValue || startValue || 1,
          seed: `growth-forecast-${selectedPortfolioId}`,
          bullish: true,
          volatility: 0.01,
        }).map((item) => ({ date: item.date, value: item.price }));

        setForecast(buildForecastData(historical, predicted));
      } catch {
        toast.error('Cannot connect to server');
      }
    };

    void load();
  }, [selectedPortfolioId]);

  const normalized = useMemo(() => holdings.map((item) => {
    const stock = item.stock || item;
    return {
      symbol: stock.symbol,
      sector: stock.sector || 'Other',
      discount: Number(item.buy_price ? ((getPrice(stock) - Number(item.buy_price)) / Number(item.buy_price)) * 100 : 0),
      value: getPrice(stock) * Number(item.quantity ?? 0),
      growth: Number(stock.change_percent ?? stock.change ?? 0),
    };
  }), [holdings]);

  const sectorData = Object.values(normalized.reduce((acc: Record<string, { name: string; value: number }>, item) => {
    if (!acc[item.sector]) acc[item.sector] = { name: item.sector, value: 0 };
    acc[item.sector].value += item.value;
    return acc;
  }, {}));

  return (
    <PageLayout title="Growth">
      <SectionHeader label="Forward Curves" title="Growth" description="Portfolio growth follows the selected portfolio and is connected through today's point." />
      {!selectedPortfolioId ? <div className="empty-state">Please select a portfolio from Dashboard</div> : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <StatCard label="Holdings Count" value={normalized.length} dotColor="var(--purple)" />
            <StatCard label="Average Discount" value={normalized.length ? normalized.reduce((sum, item) => sum + item.discount, 0) / normalized.length : 0} dotColor="var(--accent-gold)" />
            <StatCard label="Undervalued Count" value={normalized.filter((item) => item.discount > 0).length} dotColor="var(--green)" />
            <StatCard label="Top Pick" value={[...normalized].sort((a, b) => b.value - a.value)[0]?.symbol || '--'} dotColor="var(--blue-light)" />
          </div>

          <div className="glass-card" style={{ padding: 18 }}>
            <ForecastChart data={forecast} title="Portfolio Growth" height={340} showArea />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="glass-card" style={{ padding: 18 }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" innerRadius={60} outerRadius={90}>
                    {sectorData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card" style={{ padding: 18 }}>
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

          <div className="glass-card" style={{ padding: 18 }}>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="x" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Scatter data={normalized.map((item, index) => ({ x: index + 1, y: item.growth }))} fill="#a78bfa" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Growth;
