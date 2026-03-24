import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { MOCK_PORTFOLIO } from '../data/mockData';
import { chartGridProps, chartLegendStyle, chartTooltipStyle, chartYAxisProps } from '../utils/chart';

const matrixRows = MOCK_PORTFOLIO.map((stock, index) => ({
  symbol: stock.symbol,
  cluster: `Cluster ${index % 3 + 1}`,
  actualTotal: Math.round(stock.currentPrice * stock.quantity),
  actualFutureTotal: Math.round(stock.currentPrice * stock.quantity * 1.08),
  predictedFutureTotal: Math.round(stock.currentPrice * stock.quantity * 1.14),
}));

const MLAnalysis = () => {
  const [currency, setCurrency] = useState('INR');
  const [portfolio, setPortfolio] = useState('My Portfolio');
  const [selectedStock, setSelectedStock] = useState(MOCK_PORTFOLIO[0].symbol);

  useEffect(() => {
    const hydrate = async () => {
      try {
        await api.get('/api/portfolio/');
      } catch (error) {
        console.error(error);
      }
    };

    void hydrate();
  }, []);

  const predictionData = useMemo(
    () =>
      Array.from({ length: 120 }, (_, index) => {
        const base = 120 + index * 1.2 + (selectedStock.charCodeAt(0) % 8);
        return {
          point: `P${index + 1}`,
          historical: index < 90 ? base : null,
          linear: index >= 90 ? base + (index - 89) * 0.6 : null,
          arima: index >= 90 ? base + (index - 89) * 0.9 : null,
          predicted: index >= 90 ? base + (index - 89) * 1.1 : null,
        };
      }),
    [selectedStock],
  );

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <section className="panel">
          <div className="page-title">ML Analysis</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Cluster diagnostics, regression baselines, and sequence forecasting across your watch universe.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
            <select value={portfolio} onChange={(event) => setPortfolio(event.target.value)}>
              <option>My Portfolio</option>
              <option>Growth</option>
              <option>Banking</option>
            </select>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="K-Cluster Groups" value="3" dotColor="var(--purple)" />
          <StatCard title="Linear Intercept" value="12.84" dotColor="var(--accent-blue)" />
          <StatCard title="Logistic Accuracy" value="87.4%" dotColor="var(--green)" />
          <StatCard title="Sample Prediction" value={`${selectedStock} +11.2%`} dotColor="var(--yellow)" />
        </section>

        <section className="panel">
          <div className="label">Analysis Matrix</div>
          <div className="overflow-table" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Cluster</th>
                  <th>Actual Total</th>
                  <th>Actual Future Total</th>
                  <th>Predicted Future Total</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
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
        </section>

        <section className="panel">
          <div style={{ maxWidth: 280 }}>
            <div className="label">Stock Selector</div>
            <select value={selectedStock} onChange={(event) => setSelectedStock(event.target.value)} style={{ marginTop: 10 }}>
              {MOCK_PORTFOLIO.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: '100%', height: 320, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={predictionData}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="point" hide />
                <YAxis {...chartYAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend verticalAlign="bottom" wrapperStyle={chartLegendStyle} />
                <Line type="monotone" dataKey="historical" stroke="#0ed2f7" dot={false} name="Historical" />
                <Line type="monotone" dataKey="linear" stroke="#2ecc71" dot={false} name="Linear Regression" />
                <Line type="monotone" dataKey="arima" stroke="#f39c12" dot={false} name="ARIMA" />
                <Line type="monotone" dataKey="predicted" stroke="#a855f7" dot={false} strokeDasharray="4 4" name="Predicted" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, color: 'var(--text-muted)', fontSize: 11 }}>
            <span>Historical</span>
            <span>Linear Regression</span>
            <span>ARIMA</span>
            <span>Predicted</span>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default MLAnalysis;
