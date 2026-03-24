import React, { useMemo, useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { ForecastChart } from '../components/ForecastChart';
import { useCurrency } from '../context/CurrencyContext';
import { generateForecastDataset } from '../utils/forecastHelpers';

const Crypto: React.FC = () => {
  const { format } = useCurrency();
  const [model, setModel] = useState('LINEAR');
  const [view, setView] = useState<'Historical' | 'Forecast'>('Forecast');

  const forecast = useMemo(() => {
    const config = model === 'LINEAR'
      ? { bullish: true, historicalVolatility: 0.05, forecastVolatility: 0.012 }
      : model === 'ARIMA'
      ? { bullish: true, historicalVolatility: 0.05, forecastVolatility: 0.02 }
      : { bullish: true, historicalVolatility: 0.05, forecastVolatility: 0.03 };
    const data = generateForecastDataset({
      seed: `btc-${model}`,
      currentPrice: 87000,
      historicalDays: 180,
      forecastDays: 90,
      ...config,
    });
    return view === 'Historical' ? data.map((item) => ({ ...item, predicted: null })) : data;
  }, [model, view]);

  const currentPrice = 87000;
  const projected = forecast.findLast?.((item) => item.predicted !== null)?.predicted ?? currentPrice;
  const change = ((projected - currentPrice) / currentPrice) * 100;

  return (
    <PageLayout title="Crypto">
      <SectionHeader label="BTC Models" title="Crypto" description="Historical BTC movement and the selected forecast model share the same current-day junction point." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <select className="select-field" value={model} onChange={(event) => setModel(event.target.value)}><option>LINEAR</option><option>ARIMA</option><option>RNN</option></select>
          <button className={view === 'Historical' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setView('Historical')}>Historical</button>
          <button className={view === 'Forecast' ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setView('Forecast')}>Forecast</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Current Price" value={format(currentPrice)} dotColor="var(--blue-light)" />
          <StatCard label="Projected Price" value={format(projected)} dotColor="var(--accent-gold)" />
          <StatCard label="Projected Change" value={`${change.toFixed(2)}%`} dotColor={change >= 0 ? 'var(--green)' : 'var(--red)'} />
          <StatCard label="Model" value={`${model} 30 day horizon`} dotColor="var(--purple-light)" />
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <ForecastChart data={forecast} title="BTC Projection" height={360} showArea />
        </div>
      </div>
    </PageLayout>
  );
};

export default Crypto;
