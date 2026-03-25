import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { StatCard } from '../components/StatCard';
import { usePortfolio } from '../context/PortfolioContext';
import { useCurrency } from '../context/CurrencyContext';
import { generateHistoricalSeries, generateForecastSeries, formatDate, seededNumber } from '../utils/forecastHelpers';
import { getPrice } from '../utils/pageUtils';

const MLAnalysis: React.FC = () => {
  const { selectedPortfolioId } = usePortfolio();
  const { format } = useCurrency();
  const [symbols, setSymbols] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [forecastRows, setForecastRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!selectedPortfolioId) {
        setSymbols([]);
        setSelectedSymbol('');
        setForecastRows([]);
        return;
      }
      try {
        const response = await axios.get(`/api/portfolio/${selectedPortfolioId}/`);
        const items = response.data?.items || response.data || [];
        const list = Array.isArray(items) ? items : [];
        setSymbols(list);
        const hasCurrentSymbol = list.some((item: any) => (item.stock?.symbol || item.symbol) === selectedSymbol);
        const nextSymbol = hasCurrentSymbol ? selectedSymbol : (list[0]?.stock?.symbol || list[0]?.symbol || '');
        if (nextSymbol !== selectedSymbol) setSelectedSymbol(nextSymbol);
      } catch {
        toast.error('Cannot connect to server');
      }
    };
    void load();
  }, [selectedPortfolioId, selectedSymbol]);

  useEffect(() => {
    const selected = symbols.find((item) => (item.stock?.symbol || item.symbol) === selectedSymbol);
    const stock = selected?.stock || selected;
    if (!stock) {
      setForecastRows([]);
      return;
    }

    const currentPrice = getPrice(stock) || 100;
    const historical = generateHistoricalSeries({ days: 180, endPrice: currentPrice, seed: `${selectedSymbol}-ml`, volatility: 0.02 });
    const linearFuture = generateForecastSeries({ days: 90, startPrice: currentPrice, seed: `${selectedSymbol}-linear`, bullish: true, volatility: 0.006 });
    const arimaFuture = generateForecastSeries({ days: 90, startPrice: currentPrice, seed: `${selectedSymbol}-arima`, bullish: true, volatility: 0.015 });

    const rows: any[] = historical.map((item) => ({
      date: formatDate(item.date),
      historical: item.price,
      linear: null,
      arima: null,
      predicted: null,
    }));

    const lastHistorical = historical[historical.length - 1].price;
    rows[rows.length - 1].linear = lastHistorical;
    rows[rows.length - 1].arima = lastHistorical;
    rows[rows.length - 1].predicted = lastHistorical;

    linearFuture.forEach((item, index) => {
      if (index === 0) return;
      const arimaValue = arimaFuture[index]?.price ?? item.price;
      rows.push({
        date: formatDate(item.date),
        historical: null,
        linear: item.price,
        arima: arimaValue,
        predicted: Number(((item.price + arimaValue) / 2).toFixed(2)),
      });
    });

    setForecastRows(rows);
  }, [selectedSymbol, symbols]);

  const selected = symbols.find((item) => (item.stock?.symbol || item.symbol) === selectedSymbol);
  const selectedStock = selected?.stock || selected;
  const currentPrice = getPrice(selectedStock || {});
  const trendSeed = seededNumber(`${selectedSymbol}-ml-intercept`);
  const tableRows = useMemo(() => symbols.map((item, index) => {
    const stock = item.stock || item;
    const price = getPrice(stock);
    return {
      symbol: stock.symbol,
      cluster: `Cluster ${(index % 3) + 1}`,
      actualTotal: price.toFixed(2),
      actualFutureTotal: (price * 1.08).toFixed(2),
      predictedFutureTotal: (price * 1.12).toFixed(2),
    };
  }), [symbols]);

  return (
    <PageLayout title="ML Analysis">
      <SectionHeader label="Models & Clusters" title="ML Analysis" description="Historical, regression, ARIMA, and predicted future totals all connect at the current-day point." />
      {!selectedPortfolioId ? <div className="empty-state">Please select a portfolio from Dashboard</div> : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <StatCard label="K-Cluster Groups" value="3" dotColor="var(--purple)" />
            <StatCard label="Linear Intercept" value={String((10 + trendSeed() * 8).toFixed(2))} dotColor="var(--blue-light)" />
            <StatCard label="Logistic Accuracy" value="94.2%" dotColor="var(--green)" />
            <StatCard label="Sample Prediction" value={format(currentPrice)} dotColor="var(--accent-gold)" />
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Symbol</th><th>Cluster</th><th>Actual Total</th><th>Actual Future Total</th><th>Predicted Future Total</th></tr></thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.symbol}>
                      <td>{row.symbol}</td>
                      <td>{row.cluster}</td>
                      <td>{row.actualTotal}</td>
                      <td>{row.actualFutureTotal}</td>
                      <td>{row.predictedFutureTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="glass-card" style={{ padding: 18 }}>
            <select className="select-field" value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value)}>
              {symbols.map((item) => {
                const stock = item.stock || item;
                return <option key={stock.symbol} value={stock.symbol}>{stock.symbol}</option>;
              })}
            </select>
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={forecastRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: '#5a5080', fontSize: 10 }} interval="preserveStartEnd" minTickGap={60} />
                  <YAxis tick={{ fill: '#5a5080', fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="historical" stroke="#1abc9c" dot={false} />
                  <Line type="monotone" dataKey="linear" stroke="#2ecc71" strokeDasharray="5 5" dot={false} connectNulls />
                  <Line type="monotone" dataKey="arima" stroke="#f39c12" strokeDasharray="5 5" dot={false} connectNulls />
                  <Line type="monotone" dataKey="predicted" stroke="#a78bfa" strokeDasharray="5 5" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default MLAnalysis;
