import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { chartGridProps, chartTooltipStyle, chartXAxisProps, chartYAxisProps } from '../utils/chart';

const GoldSilver = () => {
  const [currency, setCurrency] = useState('INR');
  const [range, setRange] = useState('1Y');

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

  const marketData = useMemo(
    () =>
      Array.from({ length: 365 }, (_, index) => ({
        date: `D${index + 1}`,
        gold: 6200 + index * 2.4 + Math.sin(index / 14) * 60,
        silver: 70 + index * 0.06 + Math.sin(index / 10) * 3.2,
      })),
    [range],
  );

  const returnGap = marketData.map((point) => ({ date: point.date, gap: point.silver * 5 - point.gold / 100, zero: 0 }));
  const forecastData = marketData.slice(-120).map((point, index) => ({
    date: point.date,
    goldActual: index < 80 ? point.gold : null,
    goldPredicted: index >= 80 ? point.gold + (index - 79) * 4 : null,
    silverActual: index < 80 ? point.silver : null,
    silverPredicted: index >= 80 ? point.silver + (index - 79) * 0.12 : null,
  }));
  const scatterData = Array.from({ length: 30 }, (_, index) => ({
    x: 6400 + index * 18,
    y: 74 + index * 0.14,
  }));
  const regressionLine = scatterData.map((point, index) => ({ x: point.x, y: 72 + index * 0.16 }));

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <section className="panel">
          <div className="page-title">Gold and Silver</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Precious metals monitoring with comparative returns, correlation, and forecast overlays.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
            <select value={range} onChange={(event) => setRange(event.target.value)}>
              <option>1Y</option>
              <option>2Y</option>
              <option>3Y</option>
            </select>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="Gold Price" value="7,150" dotColor="var(--yellow)" />
          <StatCard title="Silver Price" value="86.4" dotColor="var(--accent-blue)" />
          <StatCard title="Leading Metal" value="Gold" dotColor="var(--green)" />
          <StatCard title="Correlation" value="0.82" dotColor="var(--purple)" />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">Gold vs Silver</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={marketData}>
                  <defs>
                    <linearGradient id="gold-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f0b429" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f0b429" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="silver-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ed2f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0ed2f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="gold" stroke="#f0b429" fill="url(#gold-fill)" />
                  <Area type="monotone" dataKey="silver" stroke="#0ed2f7" fill="url(#silver-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel">
            <div className="label">Return Gap (Silver - Gold)</div>
            <div style={{ width: '100%', height: 320, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={returnGap}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="gap" stroke="#a855f7" dot={false} />
                  <Line type="monotone" dataKey="zero" stroke="#4a6080" dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">Gold Forecast</div>
            <div style={{ width: '100%', height: 300, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecastData}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="goldActual" stroke="#f0b429" fill="rgba(240,180,41,0.2)" />
                  <Area type="monotone" dataKey="goldPredicted" stroke="#f39c12" fill="rgba(243,156,18,0.08)" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel">
            <div className="label">Silver Forecast</div>
            <div style={{ width: '100%', height: 300, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecastData}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="date" hide />
                  <YAxis {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="silverActual" stroke="#0ed2f7" fill="rgba(14,210,247,0.2)" />
                  <Area type="monotone" dataKey="silverPredicted" stroke="#67e8f9" fill="rgba(103,232,249,0.08)" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          <div className="panel">
            <div className="label">Market Snapshot</div>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Gold 3M Return</span><span>6.8%</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Silver 3M Return</span><span>9.4%</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Correlation</span><span>0.82</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">Market Leader</span><span>Gold</span></div>
            </div>
          </div>
          <div className="panel">
            <div className="label">Correlation & Regression</div>
            <div style={{ width: '100%', height: 300, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis type="number" dataKey="x" name="Gold" {...chartXAxisProps} />
                  <YAxis type="number" dataKey="y" name="Silver" {...chartYAxisProps} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Scatter data={scatterData} fill="#f0b429" />
                  <Line type="monotone" data={regressionLine} dataKey="y" stroke="#0ed2f7" dot={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default GoldSilver;
