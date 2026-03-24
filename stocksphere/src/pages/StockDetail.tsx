import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { INDIAN_STOCKS, MOCK_NEWS, MOCK_PORTFOLIO, generateChartData } from '../data/mockData';
import { chartGridProps, chartLegendStyle, chartTooltipStyle, chartXAxisProps, chartYAxisProps } from '../utils/chart';
import { formatCompact, formatCurrency, getArrow, sentimentBadgeClass } from '../utils/format';

const StockDetail = () => {
  const navigate = useNavigate();
  const { symbol, ticker } = useParams();
  const activeSymbol = symbol ?? ticker ?? 'TCS';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      try {
        await api.get(`/api/stocks/${activeSymbol}/`);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    void hydrate();
  }, [activeSymbol]);

  const stock = useMemo(() => {
    const fromStocks = INDIAN_STOCKS.find((item) => item.symbol === activeSymbol);
    const fromPortfolio = MOCK_PORTFOLIO.find((item) => item.symbol === activeSymbol);
    return {
      symbol: activeSymbol,
      company: fromStocks?.company ?? fromPortfolio?.company ?? 'Market Asset',
      price: fromStocks?.price ?? fromPortfolio?.currentPrice ?? 3200,
      change: fromStocks?.change ?? 1.42,
      pe: fromPortfolio?.pe ?? 24.8,
      sector: fromStocks?.sector ?? fromPortfolio?.sector ?? 'IT',
    };
  }, [activeSymbol]);

  const history = generateChartData(365, stock.price * 0.8, 30).map((point, index) => ({
    date: point.date,
    price: point.value + index * 0.08,
  }));

  const volume = Array.from({ length: 60 }, (_, index) => ({
    date: `D${index + 1}`,
    volume: Math.round(600 + Math.random() * 800),
  }));

  const forecastData = Array.from({ length: 24 }, (_, index) => {
    const historical = stock.price * 0.7 + index * 18;
    const linear = index < 16 ? historical : historical + (index - 15) * 16;
    const arima = index < 16 ? historical : historical + (index - 15) * 12;
    return {
      month: `M${index + 1}`,
      historical: index < 16 ? historical : null,
      linear: index < 16 ? null : linear,
      arima: index < 16 ? null : arima,
    };
  });

  const news = MOCK_NEWS.filter((item) => item.ticker === activeSymbol).slice(0, 3);

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <section className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button className="btn-outline" style={{ marginBottom: 12 }} onClick={() => navigate(-1)}>
              ← Back
            </button>
            <div className="page-title">{stock.symbol} — {stock.company}</div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, color: stock.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {formatCurrency(stock.price)}
              </span>
              <span className={stock.change >= 0 ? 'badge badge-green' : 'badge badge-red'}>
                {getArrow(stock.change)} {Math.abs(stock.change).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="label">{loading ? 'Syncing live detail...' : `${stock.sector} Coverage`}</div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="Current Price" value={formatCurrency(stock.price)} dotColor="var(--accent-blue)" />
          <StatCard title="52W High" value={formatCurrency(stock.price * 1.18)} dotColor="var(--green)" />
          <StatCard title="52W Low" value={formatCurrency(stock.price * 0.72)} dotColor="var(--red)" />
          <StatCard title="P/E Ratio" value={stock.pe} dotColor="var(--yellow)" />
          <StatCard title="Market Cap" value={formatCompact(stock.price * 1000000)} dotColor="var(--purple)" />
          <StatCard title="EPS" value={(stock.price / stock.pe).toFixed(2)} dotColor="var(--teal)" />
        </section>

        <section className="panel">
          <div className="label">Price History (5Y)</div>
          <div style={{ width: '100%', height: 320, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="detail-teal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ed2f7" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#0ed2f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="date" hide />
                <YAxis {...chartYAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="price" stroke="#0ed2f7" fill="url(#detail-teal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="label">Volume</div>
          <div style={{ width: '100%', height: 260, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={volume}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="date" hide />
                <YAxis {...chartYAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="volume" fill="#1a3a6b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel" style={{ display: 'grid', gap: 16 }}>
          <div className="label">Sentiment</div>
          <div style={{ width: '100%', height: 8, background: '#1a2540', borderRadius: 999 }}>
            <div style={{ width: '74%', height: '100%', borderRadius: 999, background: 'var(--green)' }} />
          </div>
          {news.length ? news.map((item) => (
            <div key={item.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 13 }}>{item.headline}</div>
                <span className={sentimentBadgeClass(item.sentiment)}>{item.sentiment}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>{item.summary}</div>
            </div>
          )) : <div className="empty-state">No data available. Add stocks to your portfolio.</div>}
        </section>

        <section className="panel">
          <div className="label">ML Forecast</div>
          <div style={{ width: '100%', height: 300, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="month" {...chartXAxisProps} />
                <YAxis {...chartYAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={chartLegendStyle} />
                <Line type="monotone" dataKey="historical" stroke="#0ed2f7" dot={false} name="Historical" />
                <Line type="monotone" dataKey="linear" stroke="#2ecc71" dot={false} strokeDasharray="5 5" name="Linear Regression" />
                <Line type="monotone" dataKey="arima" stroke="#f39c12" dot={false} strokeDasharray="5 5" name="ARIMA" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <StatCard title="Volatility" value="18.6%" dotColor="var(--red)" />
          <StatCard title="Sharpe Ratio" value="1.42" dotColor="var(--green)" />
          <StatCard title="Drawdown" value="-9.8%" dotColor="var(--yellow)" />
          <StatCard title="CAGR" value="14.3%" dotColor="var(--purple)" />
        </section>
      </div>
    </Layout>
  );
};

export default StockDetail;
