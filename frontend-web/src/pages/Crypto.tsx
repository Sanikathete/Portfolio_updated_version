import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
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
  const [currentPrice, setCurrentPrice] = useState(87000);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  useEffect(() => {
    const loadLivePrice = async () => {
      try {
        const response = await axios.get('/api/stocks/live-crypto/', {
          params: { symbol: 'BTC' },
        });
        const livePrice = Number(response.data?.price_inr);
        if (Number.isFinite(livePrice) && livePrice > 0) {
          setCurrentPrice(livePrice);
        }

        const liveChange = Number(response.data?.change_percent);
        if (Number.isFinite(liveChange)) {
          setPriceChange(liveChange);
        }
      } catch {
        // Fall back to seeded demo price if the live quote is unavailable.
      }
    };

    void loadLivePrice();
    const interval = window.setInterval(() => void loadLivePrice(), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const forecast = useMemo(() => {
    const config = model === 'LINEAR'
      ? { bullish: true, historicalVolatility: 0.05, forecastVolatility: 0.012 }
      : model === 'ARIMA'
      ? { bullish: true, historicalVolatility: 0.05, forecastVolatility: 0.02 }
      : { bullish: true, historicalVolatility: 0.05, forecastVolatility: 0.03 };
    const data = generateForecastDataset({
      seed: `btc-${model}`,
      currentPrice,
      historicalDays: 180,
      forecastDays: 90,
      ...config,
    });
    return view === 'Historical' ? data.map((item) => ({ ...item, predicted: null })) : data;
  }, [currentPrice, model, view]);

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
          <StatCard label="Live 24H Move" value={priceChange === null ? '--' : `${priceChange.toFixed(2)}%`} dotColor="var(--purple-light)" />
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <ForecastChart data={forecast} title="BTC Projection" height={360} showArea />
        </div>
      </div>
    </PageLayout>
  );
};

export default Crypto;
