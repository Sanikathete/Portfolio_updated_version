import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { ForecastChart } from '../components/ForecastChart';
import { generateForecastDataset } from '../utils/forecastHelpers';
import { useCurrency } from '../context/CurrencyContext';
import { getCompanyName, getPrice, getChangePercent } from '../utils/pageUtils';

const StockDetail: React.FC<{ mode?: 'portfolio' | 'stocks' }> = ({ mode = 'stocks' }) => {
  const { symbol = '' } = useParams();
  const { format } = useCurrency();
  const [stock, setStock] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [position, setPosition] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stockResponse = await axios.get(`/api/stocks/?symbol=${symbol}`);
        const stockData = stockResponse.data?.results?.[0] || stockResponse.data?.[0] || stockResponse.data || { symbol };
        const currentPrice = getPrice(stockData) || 100;

        setStock(stockData);
        setForecast(generateForecastDataset({
          seed: `${symbol}-${mode}`,
          currentPrice,
          historicalDays: 180,
          forecastDays: 90,
          bullish: getChangePercent(stockData) >= 0,
          historicalVolatility: 0.02,
          forecastVolatility: 0.015,
        }));

        if (mode === 'portfolio') {
          try {
            const portfolioResponse = await axios.get('/api/portfolio/');
            const list = portfolioResponse.data?.items || portfolioResponse.data || [];
            const match = (Array.isArray(list) ? list : []).find((item: any) => (item.stock?.symbol || item.symbol) === symbol);
            setPosition(match || null);
          } catch {
            setPosition(null);
          }
        }
      } catch {
        toast.error('Cannot connect to server');
      }
    };

    void load();
  }, [symbol, mode]);

  const currentPrice = getPrice(stock || {});
  const buyPrice = Number(position?.buy_price ?? position?.buyPrice ?? currentPrice);
  const quantity = Number(position?.quantity ?? 0);
  const pnlPercent = buyPrice ? ((currentPrice - buyPrice) / buyPrice) * 100 : 0;

  return (
    <PageLayout title={symbol}>
      <SectionHeader label={mode === 'portfolio' ? 'Portfolio Holding' : 'Stock Detail'} title={`${symbol} - ${getCompanyName(stock || { symbol })}`} description="Historical and predicted lines share the same current-day point for a continuous forecast graph." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="Current Price" value={format(currentPrice)} dotColor="var(--blue-light)" />
          <StatCard label="Buy Price" value={format(buyPrice)} dotColor="var(--accent-gold)" />
          <StatCard label="P/L %" value={`${pnlPercent.toFixed(2)}%`} dotColor={pnlPercent >= 0 ? 'var(--green)' : 'var(--red)'} />
          <StatCard label="Position Value" value={format(currentPrice * quantity)} dotColor="var(--purple-light)" />
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <ForecastChart data={forecast} title="ML Forecast" height={360} showArea={false} />
        </div>
      </div>
    </PageLayout>
  );
};

export default StockDetail;
