import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { ForecastChart } from '../components/ForecastChart';
import { buildForecastData } from '../utils/forecastHelpers';

const Crypto: React.FC = () => {
  const [model, setModel] = useState('LINEAR');
  const [duration, setDuration] = useState('6months');
  const [view, setView] = useState<'Historical' | 'Forecast'>('Forecast');
  const [stats, setStats] = useState<any>({});
  const [forecast, setForecast] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/api/crypto/btc/?model=${model}&duration=${duration}`);
        setStats(res.data?.stats || {});
        const merged = buildForecastData(res.data?.historical || [], res.data?.predicted || []);
        setForecast(view === 'Historical' ? merged.map((item) => ({ ...item, predicted: null })) : merged);
      } catch {
        toast.error('Unable to load BTC forecast.');
      }
    };
    void load();
  }, [model, duration, view]);

  const current = Number(stats.current_price ?? forecast.findLast?.((row: any) => row.actual !== null)?.actual ?? 0);
  const projected = Number(stats.projected_price ?? forecast.findLast?.((row: any) => row.predicted !== null)?.predicted ?? 0);
  const change = current ? ((projected - current) / current) * 100 : 0;

  return (
    <PageLayout title="Crypto">
      <SectionHeader label="BTC Models" title="Crypto" description="One connected BTC chart joins historical data and prediction output for the selected model and duration." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="select-field" value={model} onChange={(e) => setModel(e.target.value)}><option>LINEAR</option><option>ARIMA</option><option>RNN</option></select>
          <select className="select-field" value={duration} onChange={(e) => setDuration(e.target.value)}><option value="3months">3 months</option><option value="6months">6 months</option><option value="1year">1 year</option></select>
          <button className={view === 'Historical' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setView('Historical')}>Historical</button>
          <button className={view === 'Forecast' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setView('Forecast')}>Forecast</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Current Price" value={current.toFixed(2)} dotColor="var(--blue-light)" />
          <StatCard label="Projected Price" value={projected.toFixed(2)} dotColor="var(--accent-gold)" />
          <StatCard label="Change %" value={`${change.toFixed(2)}%`} dotColor={change >= 0 ? 'var(--green)' : 'var(--red)'} />
          <StatCard label="Model" value={model} dotColor="var(--purple-light)" subtext={duration} />
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <ForecastChart data={forecast} title="BTC-USD Projection" height={360} showArea />
        </div>
      </div>
    </PageLayout>
  );
};

export default Crypto;
