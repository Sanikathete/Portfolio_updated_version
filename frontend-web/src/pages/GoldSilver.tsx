import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ScatterChart, Scatter, BarChart, Bar, Cell } from 'recharts';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { ForecastChart } from '../components/ForecastChart';
import { useCurrency } from '../context/CurrencyContext';
import { buildForecastData, formatDateShort, generateForecastSeries, seededNumber } from '../utils/forecastHelpers';

const GoldSilver: React.FC = () => {
  const { format } = useCurrency();
  const [range, setRange] = useState('3Y');

  const marketData = useMemo(() => {
    const random = seededNumber(`gold-silver-${range}`);
    const days = range === '1Y' ? 365 : range === '2Y' ? 730 : 1095;
    let gold = 45000;
    let silver = 550;
    return Array.from({ length: days }, (_, index) => {
      gold *= 1 + 0.00035 + (random() - 0.5) * 0.02;
      silver *= 1 + 0.00028 + (random() - 0.5) * 0.03;
      if (index === days - 1) {
        gold = 63000;
        silver = 750;
      }
      return {
        date: formatDateShort(new Date(Date.now() - (days - 1 - index) * 86400000).toISOString()),
        gold: Number(gold.toFixed(2)),
        silver: Number(silver.toFixed(2)),
        gap: Number((((silver / 550 - 1) - (gold / 45000 - 1)) * 100).toFixed(2)),
      };
    });
  }, [range]);

  const goldForecast = useMemo(() => buildForecastData(
    marketData.map((item) => ({ date: new Date().toISOString(), value: item.gold })),
    generateForecastSeries({ days: 90, startPrice: marketData[marketData.length - 1]?.gold || 63000, seed: 'gold-forecast', bullish: true }).map((item) => ({ date: item.date, value: item.price })),
  ), [marketData]);

  const silverForecast = useMemo(() => buildForecastData(
    marketData.map((item) => ({ date: new Date().toISOString(), value: item.silver })),
    generateForecastSeries({ days: 90, startPrice: marketData[marketData.length - 1]?.silver || 750, seed: 'silver-forecast', bullish: true }).map((item) => ({ date: item.date, value: item.price })),
  ), [marketData]);

  return (
    <PageLayout title="Gold & Silver">
      <SectionHeader label="Precious Metals" title="Gold and Silver" description="Three-year metal curves, return gap, connected forecasts, and a correlation view." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="select-field" value={range} onChange={(event) => setRange(event.target.value)}><option>1Y</option><option>2Y</option><option>3Y</option></select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Gold Price" value={format(63000)} dotColor="var(--accent-gold)" />
          <StatCard label="Silver Price" value={format(750)} dotColor="var(--blue-light)" />
          <StatCard label="Leading Metal" value="Gold" dotColor="var(--green)" />
          <StatCard label="Correlation" value="0.82" dotColor="var(--purple-light)" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="glass-card" style={{ padding: 18 }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="gold" stroke="#f0b429" fill="rgba(240,180,41,0.2)" />
                <Area type="monotone" dataKey="silver" stroke="#1abc9c" fill="rgba(26,188,156,0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={marketData.slice(-120)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="gap">
                  {marketData.slice(-120).map((item, index) => <Cell key={`${item.date}-${index}`} fill={item.gap >= 0 ? '#2ecc71' : '#e74c3c'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="glass-card" style={{ padding: 18 }}><ForecastChart data={goldForecast} title="Gold Forecast" height={300} /></div>
          <div className="glass-card" style={{ padding: 18 }}><ForecastChart data={silverForecast} title="Silver Forecast" height={300} /></div>
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" dataKey="gold" tick={{ fill: '#5a5080', fontSize: 10 }} />
              <YAxis type="number" dataKey="silver" tick={{ fill: '#5a5080', fontSize: 10 }} />
              <Tooltip />
              <Scatter data={marketData.slice(-100)} fill="#f0b429" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageLayout>
  );
};

export default GoldSilver;
