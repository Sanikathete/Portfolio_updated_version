import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { chartGridProps, chartTooltipStyle, chartYAxisProps } from '../utils/chart';

const basePrice = 68420;

const Crypto = () => {
  const [model, setModel] = useState('LINEAR');
  const [duration, setDuration] = useState('3 months');
  const [view, setView] = useState<'Historical' | 'Forecast'>('Historical');
  const [projectedPrice, setProjectedPrice] = useState(74890);

  useEffect(() => {
    const hydrate = async () => {
      try {
        await api.get('/api/stocks/');
      } catch (error) {
        console.error(error);
      }
    };

    void hydrate();
  }, []);

  useEffect(() => {
    const factors: Record<string, number> = {
      'LINEAR-3 months': 1.07,
      'LINEAR-6 months': 1.11,
      'LINEAR-1 year': 1.18,
      'ARIMA-3 months': 1.09,
      'ARIMA-6 months': 1.14,
      'ARIMA-1 year': 1.2,
      'RNN-3 months': 1.1,
      'RNN-6 months': 1.16,
      'RNN-1 year': 1.24,
    };
    const key = `${model}-${duration}`;
    const multiplier = factors[key] ?? 1.09;
    const randomDrift = 1 + ((model.length + duration.length) % 4) * 0.003;
    setProjectedPrice(Math.round(basePrice * multiplier * randomDrift));
  }, [duration, model]);

  const chartData = useMemo(
    () =>
      Array.from({ length: 240 }, (_, index) => ({
        date: `D${index + 1}`,
        historical: index < 180 ? 52000 + index * 85 + Math.sin(index / 10) * 1800 : null,
        forecast: index >= 180 ? basePrice + (index - 179) * ((projectedPrice - basePrice) / 60) : null,
      })),
    [projectedPrice],
  );

  const changePct = (((projectedPrice - basePrice) / basePrice) * 100).toFixed(2);

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <section className="panel">
          <div className="page-title">BTC Forecast Explorer</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Explore model-driven Bitcoin projections across horizons and compare how the path changes.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <select value={model} onChange={(event) => setModel(event.target.value)}>
              <option>LINEAR</option>
              <option>ARIMA</option>
              <option>RNN</option>
            </select>
            <select value={duration} onChange={(event) => setDuration(event.target.value)}>
              <option>3 months</option>
              <option>6 months</option>
              <option>1 year</option>
            </select>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="Current Price" value={`$${basePrice.toLocaleString()}`} dotColor="var(--accent-blue)" />
          <StatCard title="Projected Price" value={`$${projectedPrice.toLocaleString()}`} dotColor="var(--yellow)" />
          <StatCard title="Change %" value={`${changePct}%`} dotColor={Number(changePct) >= 0 ? 'var(--green)' : 'var(--red)'} />
          <StatCard title="Model + Horizon" value={`${model} / ${duration}`} dotColor="var(--purple)" />
        </section>

        <section style={{ display: 'flex', gap: 16 }}>
          <div className="panel" style={{ flex: '0 0 65%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="label">BTC-USD Projection</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={view === 'Historical' ? 'btn-blue' : 'btn-outline'} onClick={() => setView('Historical')}>Historical</button>
                <button className={view === 'Forecast' ? 'btn-blue' : 'btn-outline'} onClick={() => setView('Forecast')}>Forecast</button>
              </div>
            </div>
            <div style={{ width: '100%', height: 360, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="btc-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ed2f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ed2f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  {view === 'Historical' ? (
                    <Area type="monotone" dataKey="historical" stroke="#0ed2f7" fill="url(#btc-fill)" />
                  ) : (
                    <Line type="monotone" dataKey="forecast" stroke="#f39c12" dot={false} strokeDasharray="5 5" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel" style={{ flex: '0 0 35%' }}>
            <div className="label">Forecast Notes</div>
            <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Symbol</span><span>BTC-USD</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Model</span><span>{model}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Horizon</span><span>{duration}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Latest Price</span><span>${basePrice.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Projection</span><span>${projectedPrice.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: Number(changePct) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                <span className="label">Change</span>
                <span>{Number(changePct) >= 0 ? '+' : ''}{changePct}%</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Crypto;
