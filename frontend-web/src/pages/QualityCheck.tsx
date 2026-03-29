import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';

type QualityStock = {
  id: number;
  symbol: string;
  company_name: string;
  pe_ratio: number | null;
  discount_from_52w_high: number | null;
  sentiment_score: number | null;
  sentiment_label: string;
  eps: number | null;
  debt_to_equity: number | null;
  revenue_growth: number | null;
  quality_score: number;
  rank: number;
  date: string;
};

const rankColors: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--purple)', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading StockSphere...</div>
    </div>
  </div>
);

const QualityCheck: React.FC = () => {
  const [stocks, setStocks] = useState<QualityStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const lastUpdated = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  const fetchTop3 = async () => {
    try {
      const response = await axios.get('/api/quality-stocks/top3/');
      const list = Array.isArray(response.data) ? response.data : [];
      setStocks(list);
      setError(null);
    } catch {
      setError('Unable to load quality stocks. Please try again.');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchTop3();
      setLoading(false);
    };

    void load();
  }, []);

  const handleRetry = async () => {
    setLoading(true);
    await fetchTop3();
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/quality-stocks/refresh/');
      await fetchTop3();
    } catch {
      setError('Unable to refresh quality stocks. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <PageLayout title="Quality Check">
      <SectionHeader
        label="Quality Intelligence"
        title="Quality Check"
        description="Top 3 quality stocks selected daily using AI-powered sentiment analysis, PE ratio, discount from 52-week high, and fundamental scoring."
      />
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
        Last updated: {lastUpdated}
      </div>

      {loading ? <PageLoader /> : null}

      {!loading && error ? (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          <button className="btn btn-outline" onClick={handleRetry}>Retry</button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {stocks.map((stock) => {
              const rankColor = rankColors[stock.rank] || 'var(--border)';
              const score = Math.max(0, Math.min(100, stock.quality_score || 0));
              return (
                <div key={stock.id} className="glass-card" style={{ flex: '1 1 280px', padding: 18, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#111', background: rankColor, padding: '4px 10px', borderRadius: 999 }}>
                      #{stock.rank}
                    </div>
                    <SentimentBadge sentiment={stock.sentiment_label || 'Neutral'} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{stock.company_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{stock.symbol}</div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-gold)' }}>{(stock.quality_score || 0).toFixed(1)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 100</div>
                  </div>

                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ width: `${score}%`, height: '100%', background: 'var(--purple)' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>PE Ratio</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stock.pe_ratio !== null && stock.pe_ratio !== undefined ? Number(stock.pe_ratio).toFixed(2) : 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--green)' }}>
                    {stock.discount_from_52w_high !== null && stock.discount_from_52w_high !== undefined
                      ? `${Number(stock.discount_from_52w_high).toFixed(1)}% below 52w high`
                      : 'Discount from 52w high unavailable'}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </>
      ) : null}
    </PageLayout>
  );
};

export default QualityCheck;
