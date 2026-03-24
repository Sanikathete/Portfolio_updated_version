import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ScatterChart, Scatter, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { ForecastChart } from '../components/ForecastChart';
import { useCurrency } from '../context/CurrencyContext';
import { buildForecastData, formatDateShort } from '../utils/forecastHelpers';

const GoldSilver: React.FC = () => {
  const { currency } = useCurrency();
  const [range, setRange] = useState('3Y');
  const [marketData, setMarketData] = useState<any[]>([]);
  const [goldForecast, setGoldForecast] = useState<any[]>([]);
  const [silverForecast, setSilverForecast] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [market, gold, silver] = await Promise.all([
          axios.get(`/api/commodities/gold-silver/?currency=${currency}&range=${range}`),
          axios.get('/api/commodities/gold-forecast/'),
          axios.get('/api/commodities/silver-forecast/'),
        ]);
        const goldSeries = market.data?.gold || [];
        const silverSeries = market.data?.silver || [];
        const len = Math.max(goldSeries.length, silverSeries.length);
        setMarketData(Array.from({ length: len }, (_, index) => ({
          date: formatDateShort(goldSeries[index]?.date || silverSeries[index]?.date || `P${index}`),
          gold: Number(goldSeries[index]?.price ?? 0),
          silver: Number(silverSeries[index]?.price ?? 0),
          gap: Number(silverSeries[index]?.price ?? 0) - Number(goldSeries[index]?.price ?? 0),
        })));
        setGoldForecast(buildForecastData(gold.data?.historical || [], gold.data?.predicted || []));
        setSilverForecast(buildForecastData(silver.data?.historical || [], silver.data?.predicted || []));
      } catch {
        toast.error('Unable to load gold and silver analytics.');
      }
    };
    void load();
  }, [currency, range]);

  return (
    <PageLayout title="Gold & Silver">
      <SectionHeader label="Precious Metals" title="Gold & Silver" description="Market spread, connected forecast curves, and correlation in one workspace." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="select-field" value={range} onChange={(e) => setRange(e.target.value)}><option>1Y</option><option>2Y</option><option>3Y</option></select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Gold Price" value={`${marketData.at(-1)?.gold?.toFixed(2) || '0.00'}`} dotColor="var(--accent-gold)" />
          <StatCard label="Silver Price" value={`${marketData.at(-1)?.silver?.toFixed(2) || '0.00'}`} dotColor="var(--blue-light)" />
          <StatCard label="Leading Metal" value={(marketData.at(-1)?.gold || 0) > (marketData.at(-1)?.silver || 0) ? 'Gold' : 'Silver'} dotColor="var(--green)" />
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
              <LineChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: '#5a5080', fontSize: 10 }} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="gap" stroke="#a78bfa" dot={false} />
              </LineChart>
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
              <Scatter data={marketData} fill="#f0b429" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageLayout>
  );
};

export default GoldSilver;
