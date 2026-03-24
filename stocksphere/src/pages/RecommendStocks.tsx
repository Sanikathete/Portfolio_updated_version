import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';
import { sentimentBadgeClass } from '../utils/format';

const recommendations = [
  { symbol: 'WIPRO', company: 'Wipro Ltd', sector: 'IT', rating: 8.9, sentiment: 'Positive', forecast: 18.4, score: 92 },
  { symbol: 'TATAMOTORS', company: 'Tata Motors Ltd', sector: 'Auto', rating: 8.7, sentiment: 'Positive', forecast: 21.2, score: 89 },
  { symbol: 'ICICIBANK', company: 'ICICI Bank Ltd', sector: 'Banking', rating: 8.5, sentiment: 'Positive', forecast: 16.7, score: 87 },
  { symbol: 'SUNPHARMA', company: 'Sun Pharmaceutical', sector: 'Pharma', rating: 8.1, sentiment: 'Neutral', forecast: 12.5, score: 83 },
  { symbol: 'RELIANCE', company: 'Reliance Industries', sector: 'Energy', rating: 7.9, sentiment: 'Positive', forecast: 14.2, score: 81 },
  { symbol: 'MARUTI', company: 'Maruti Suzuki India', sector: 'Auto', rating: 7.7, sentiment: 'Positive', forecast: 11.3, score: 79 },
  { symbol: 'INFY', company: 'Infosys Ltd', sector: 'IT', rating: 7.3, sentiment: 'Neutral', forecast: 9.7, score: 74 },
  { symbol: 'HDFCBANK', company: 'HDFC Bank Ltd', sector: 'Banking', rating: 6.8, sentiment: 'Negative', forecast: 4.1, score: 68 },
];

const RecommendStocks = () => {
  const [country, setCountry] = useState('India');
  const [sector, setSector] = useState('All');

  useEffect(() => {
    const touchEndpoint = async () => {
      try {
        await api.get('/api/stocks/');
      } catch (error) {
        console.error(error);
      }
    };

    void touchEndpoint();
  }, []);

  const rows = useMemo(
    () =>
      [...recommendations]
        .filter((item) => sector === 'All' || item.sector === sector)
        .sort((a, b) => b.score - a.score),
    [sector],
  );

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <div className="panel" style={{ display: 'flex', gap: 12 }}>
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="India">India</option>
            <option value="USA">USA</option>
            <option value="Global">Global</option>
          </select>
          <select value={sector} onChange={(event) => setSector(event.target.value)}>
            <option value="All">All Sectors</option>
            <option value="IT">IT</option>
            <option value="Banking">Banking</option>
            <option value="Auto">Auto</option>
            <option value="Pharma">Pharma</option>
            <option value="Energy">Energy</option>
          </select>
        </div>
        <div className="panel">
          <div className="overflow-table">
            {rows.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Symbol</th>
                    <th>Company</th>
                    <th>Sector</th>
                    <th>Rating</th>
                    <th>Sentiment</th>
                    <th>1Y Forecast</th>
                    <th>Rec Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.symbol}>
                      <td>{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</td>
                      <td>{row.symbol}</td>
                      <td>{row.company}</td>
                      <td>{row.sector}</td>
                      <td>{row.rating.toFixed(1)}</td>
                      <td><span className={sentimentBadgeClass(row.sentiment)}>{row.sentiment}</span></td>
                      <td style={{ color: row.forecast >= 0 ? 'var(--green)' : 'var(--red)' }}>{row.forecast.toFixed(1)}%</td>
                      <td>{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No data available. Add stocks to your portfolio.</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RecommendStocks;
