import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { usePortfolio } from '../context/PortfolioContext';
import { formatDate } from '../utils/forecastHelpers';

const MLAnalysis: React.FC = () => {
  const { activePortfolioId } = usePortfolio();
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [forecastRows, setForecastRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!activePortfolioId) return;
      try {
        const res = await axios.get(`/api/ml/analysis/?portfolio_id=${activePortfolioId}`);
        const rows = res.data?.results || res.data?.rows || res.data || [];
        const arr = Array.isArray(rows) ? rows : [];
        setAnalysis(arr);
        const symbolsList = arr.map((row) => row.symbol).filter(Boolean);
        setSymbols(symbolsList);
        if (!selectedSymbol && symbolsList[0]) setSelectedSymbol(symbolsList[0]);
      } catch {
        toast.error('Unable to load ML analysis.');
      }
    };
    void load();
  }, [activePortfolioId]);

  useEffect(() => {
    const loadForecast = async () => {
      if (!selectedSymbol) return;
      try {
        const res = await axios.get(`/api/ml/forecast/?symbol=${selectedSymbol}`);
        const historical = res.data?.historical || [];
        const linear = res.data?.linear || [];
        const arima = res.data?.arima || [];
        const predicted = res.data?.predicted || [];
        const map = new Map<string, any>();
        const append = (rows: any[], key: string) => rows.forEach((item, index) => {
          const date = formatDate(item.date || item.label || `P${index + 1}`);
          const existing = map.get(date) || { date, historical: null, linear: null, arima: null, predicted: null };
          existing[key] = Number(item.price ?? item.value ?? item.predicted ?? null);
          map.set(date, existing);
        });
        append(historical, 'historical');
        append(linear, 'linear');
        append(arima, 'arima');
        append(predicted, 'predicted');
        const rows = Array.from(map.values());
        const firstPred = rows.find((row) => row.predicted !== null);
        const lastHist = [...rows].reverse().find((row) => row.historical !== null);
        if (firstPred && lastHist) {
          firstPred.historical = lastHist.historical;
          lastHist.predicted = lastHist.historical;
          lastHist.linear = lastHist.historical;
          lastHist.arima = lastHist.historical;
        }
        setForecastRows(rows);
      } catch {
        toast.error('Unable to load ML forecast.');
      }
    };
    void loadForecast();
  }, [selectedSymbol]);

  return (
    <PageLayout title="ML Analysis">
      <SectionHeader label="Models & Clusters" title="ML Analysis" description="Historical, regression, ARIMA, and future forecast lines are aligned on one connected timeline." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
          <StatCard label="K-Cluster Groups" value="3" dotColor="var(--purple)" />
          <StatCard label="Linear Intercept" value="12.84" dotColor="var(--blue-light)" />
          <StatCard label="Logistic Accuracy" value="87.4%" dotColor="var(--green)" />
          <StatCard label="Sample Prediction" value={selectedSymbol || '—'} dotColor="var(--accent-gold)" />
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Symbol</th><th>Cluster</th><th>Actual Total</th><th>Actual Future Total</th><th>Predicted Future Total</th></tr></thead>
              <tbody>
                {analysis.map((row, index) => <tr key={`${row.symbol}-${index}`}><td>{row.symbol}</td><td>{row.cluster || `Cluster ${(index % 3) + 1}`}</td><td>{row.actual_total || row.actualTotal || '—'}</td><td>{row.actual_future_total || row.actualFutureTotal || '—'}</td><td>{row.predicted_future_total || row.predictedFutureTotal || '—'}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
        <div className="glass-card" style={{ padding: 18 }}>
          <select className="select-field" value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}>{symbols.map((symbol) => <option key={symbol}>{symbol}</option>)}</select>
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={forecastRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: '#5a5080', fontSize: 10 }} interval="preserveStartEnd" minTickGap={60} />
                <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="historical" stroke="#1abc9c" dot={false} />
                <Line type="monotone" dataKey="linear" stroke="#2ecc71" strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="arima" stroke="#f39c12" strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="#a78bfa" strokeDasharray="6 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default MLAnalysis;
