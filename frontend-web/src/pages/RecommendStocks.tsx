import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { RatingBadge } from '../components/RatingBadge';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';
import { useCurrency } from '../context/CurrencyContext';
import { getChangePercent, getRating, getSentimentLabel } from '../utils/pageUtils';

interface Stock {
  id: number;
  symbol: string;
  name: string;
  current_price: string | number;
  currency?: string;
  exchange?: string;
  sector?: string;
  change_percent?: string | number;
  sentiment?: string;
  sentiment_score?: string | number;
  pe_ratio?: string | number;
}

interface RecommendationRow {
  symbol: string;
  company: string;
  exchange: string;
  sector: string;
  currentPrice: number;
  sourceCurrency: string;
  rating: number;
  sentiment: string;
  forecast: number;
  score: number;
}

const STOCKS_ENDPOINT = '/api/api/stocks/public-stocks/';
const COUNTRY_OPTIONS = ['India', 'USA', 'Global'] as const;

const getCountryForExchange = (exchange: string) => {
  const normalized = String(exchange || '').trim().toUpperCase();
  if (normalized === 'NSE' || normalized === 'BSE') return 'India';
  if (normalized === 'NASDAQ' || normalized === 'NYSE') return 'USA';
  return 'Global';
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatRank = (index: number) => `#${index + 1}`;

const RecommendStocks = () => {
  const { formatFromCurrency } = useCurrency();
  const [country, setCountry] = useState<(typeof COUNTRY_OPTIONS)[number]>('India');
  const [sector, setSector] = useState('All Sectors');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStocks = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await axios.get<Stock[]>(STOCKS_ENDPOINT, {
          withCredentials: true,
        });
        setStocks(Array.isArray(response.data) ? response.data : []);
      } catch {
        setStocks([]);
        setError('Unable to load recommendations right now. Please try again shortly.');
      } finally {
        setLoading(false);
      }
    };

    void loadStocks();
  }, []);

  const countryStocks = useMemo(() => {
    if (country === 'Global') return stocks;
    return stocks.filter((stock) => getCountryForExchange(stock.exchange || '') === country);
  }, [country, stocks]);

  const sectorOptions = useMemo(() => {
    const sectors = Array.from(
      new Set(
        countryStocks
          .map((stock) => String(stock.sector || '').trim())
          .filter((value) => value.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ['All Sectors', ...sectors];
  }, [countryStocks]);

  useEffect(() => {
    if (!sectorOptions.includes(sector)) {
      setSector('All Sectors');
    }
  }, [sector, sectorOptions]);

  const rows = useMemo<RecommendationRow[]>(() => {
    const scopedStocks = sector === 'All Sectors'
      ? countryStocks
      : countryStocks.filter((stock) => String(stock.sector || '').trim() === sector);

    return scopedStocks
      .map((stock) => {
        const rating = getRating(stock);
        const sentiment = getSentimentLabel(stock);
        const currentPrice = Number(stock.current_price ?? 0);
        const changePercent = getChangePercent(stock);
        const sentimentBoost = sentiment === 'High' ? 5 : sentiment === 'Low' ? -4 : 0;
        const forecast = clamp(
          Number((((rating - 5.5) * 3.4) + (changePercent * 0.65) + sentimentBoost).toFixed(1)),
          -18,
          32
        );
        const score = clamp(
          Math.round((rating * 8.5) + (forecast * 1.1) + (sentiment === 'High' ? 10 : sentiment === 'Low' ? -6 : 2)),
          1,
          99
        );

        return {
          symbol: stock.symbol,
          company: stock.name,
          exchange: String(stock.exchange || 'Unknown'),
          sector: String(stock.sector || 'Unknown'),
          currentPrice,
          sourceCurrency: String(stock.currency || 'INR'),
          rating,
          sentiment,
          forecast,
          score,
        };
      })
      .sort((a, b) => b.score - a.score || b.rating - a.rating || b.forecast - a.forecast)
      .slice(0, 100);
  }, [countryStocks, sector]);

  return (
    <PageLayout title="Recommendations">
      <SectionHeader
        label="Recommendation Engine"
        title="Recommended Stocks"
        description="Filter the live stock universe by country and sector, then review the strongest candidates ranked by rating, sentiment, and projected upside."
      />

      <div style={{ display: 'grid', gap: 18 }}>
        <div
          className="glass-card"
          style={{
            padding: 18,
            display: 'grid',
            gap: 14,
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 220px) minmax(220px, 320px)',
              gap: 12,
            }}
          >
            <select
              className="select-field"
              value={country}
              onChange={(event) => setCountry(event.target.value as (typeof COUNTRY_OPTIONS)[number])}
            >
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              className="select-field"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
            >
              {sectorOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Showing {rows.length} ranked stocks from {country === 'Global' ? 'all available markets' : country}.
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: 18,
            border: '1px solid var(--border)',
          }}
        >
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading recommendations...</div>
          ) : error ? (
            <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>
          ) : rows.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Symbol</th>
                    <th>Company</th>
                    <th>Exchange</th>
                    <th>Sector</th>
                    <th>Price</th>
                    <th>Rating</th>
                    <th>Sentiment</th>
                    <th>1Y Forecast</th>
                    <th>Rec Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.symbol}-${row.exchange}`}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatRank(index)}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{row.symbol}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: 220, lineHeight: 1.5 }}>{row.company}</td>
                      <td>{row.exchange}</td>
                      <td style={{ whiteSpace: 'normal', minWidth: 180, lineHeight: 1.5 }}>{row.sector}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {formatFromCurrency(row.currentPrice, row.sourceCurrency)}
                      </td>
                      <td><RatingBadge rating={row.rating} /></td>
                      <td><SentimentBadge sentiment={row.sentiment} /></td>
                      <td style={{ color: row.forecast >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {row.forecast >= 0 ? '+' : ''}{row.forecast.toFixed(1)}%
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{row.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              No stocks matched this country and sector combination.
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default RecommendStocks;
