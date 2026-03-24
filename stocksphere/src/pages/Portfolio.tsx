import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import { MOCK_PORTFOLIO, generateChartData } from '../data/mockData';
import { getArrow, sentimentBadgeClass } from '../utils/format';

const portfolioRows = MOCK_PORTFOLIO.map((stock, index) => ({
  ...stock,
  rating: 6.2 + index * 0.8,
  sentiment: stock.discount > 7 ? 'Positive' : stock.discount > 0 ? 'Neutral' : 'Negative',
  forecast3M: stock.discount > 0 ? 4.5 + index : -1.2 - index * 0.4,
  forecast1Y: stock.discount > 0 ? 12 + index * 2 : -3.5 - index * 0.6,
  performance: generateChartData(7, 50 + index * 8, 8).map((point) => ({ value: point.value })),
}));

const Portfolio = () => {
  const navigate = useNavigate();
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const warmPortfolio = async () => {
      try {
        await api.get('/api/portfolio/');
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void warmPortfolio();
  }, []);

  const averages = useMemo(() => {
    const avg3M = portfolioRows.reduce((sum, row) => sum + row.forecast3M, 0) / portfolioRows.length;
    const avg1Y = portfolioRows.reduce((sum, row) => sum + row.forecast1Y, 0) / portfolioRows.length;
    return { avg3M, avg1Y };
  }, []);

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="page-title">Portfolio Intelligence</div>
            <div className="label" style={{ marginTop: 8 }}>Long-horizon signals and tactical forecasts</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-blue" onClick={() => navigate('/portfolio/recommend')}>Recommend Stocks</button>
            <button className="btn-outline" onClick={() => setAnalysisOpen((current) => !current)}>Analysis</button>
          </div>
        </div>

        {analysisOpen ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
            <div className="panel">
              <div className="label">Coverage</div>
              <div style={{ fontSize: 20, marginTop: 16 }}>{portfolioRows.length} Active Picks</div>
            </div>
            <div className="panel">
              <div className="label">Average 3M Forecast</div>
              <div style={{ fontSize: 20, marginTop: 16, color: averages.avg3M >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {averages.avg3M.toFixed(2)}%
              </div>
            </div>
            <div className="panel">
              <div className="label">Average 1Y Forecast</div>
              <div style={{ fontSize: 20, marginTop: 16, color: averages.avg1Y >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {averages.avg1Y.toFixed(2)}%
              </div>
            </div>
          </div>
        ) : null}

        <div className="panel">
          <div className="overflow-table">
            {!loading && portfolioRows.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Stock Name</th>
                    <th>Ticker</th>
                    <th>Rating</th>
                    <th>Sentiment</th>
                    <th>3M Forecast</th>
                    <th>1Y Forecast</th>
                    <th>5Y Performance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolioRows.map((row) => (
                    <tr key={row.symbol}>
                      <td>{row.company}</td>
                      <td>{row.symbol}</td>
                      <td style={{ color: row.rating > 7 ? 'var(--green)' : row.rating > 5 ? 'var(--yellow)' : 'var(--red)' }}>
                        {row.rating.toFixed(1)}/10
                      </td>
                      <td><span className={sentimentBadgeClass(row.sentiment)}>{row.sentiment}</span></td>
                      <td style={{ color: row.forecast3M >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {getArrow(row.forecast3M)} {Math.abs(row.forecast3M).toFixed(2)}%
                      </td>
                      <td style={{ color: row.forecast1Y >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {getArrow(row.forecast1Y)} {Math.abs(row.forecast1Y).toFixed(2)}%
                      </td>
                      <td>
                        <div style={{ width: 60, height: 30 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={row.performance}>
                              <Area type="monotone" dataKey="value" stroke="#7eb8f7" fill="rgba(126,184,247,0.2)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </td>
                      <td>
                        <button className="btn-blue" style={{ padding: '6px 10px' }} onClick={() => navigate(`/portfolio/${row.symbol}`)}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : loading ? (
              <div style={{ color: 'var(--text-muted)' }}>Loading portfolio analysis...</div>
            ) : (
              <div className="empty-state">No data available. Add stocks to your portfolio.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Portfolio;
