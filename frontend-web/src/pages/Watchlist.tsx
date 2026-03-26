import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { RatingBadge } from '../components/RatingBadge';
import { SentimentBadge } from '../components/SentimentBadge';
import { getRating, getSentimentLabel } from '../utils/pageUtils';

interface WatchlistStock {
  id: number;
  symbol: string;
  name: string;
  current_price: number;
  sector: string;
  exchange: string;
  currency: string;
}

interface WatchlistItem {
  id: number;
  stock: WatchlistStock;
  created_at: string;
}

const WATCHLIST_ENDPOINT = '/api/api/watchlist/watchlist/';
const SERVICE_USERNAME = 'testteacher';
const SERVICE_PASSWORD = 'teacher@123';

const Watchlist: React.FC = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await axios.get(WATCHLIST_ENDPOINT, {
        params: {
          username: SERVICE_USERNAME,
          password: SERVICE_PASSWORD,
        },
      });

      const watchlistItems = Array.isArray(response.data?.items) ? response.data.items : [];
      setItems(watchlistItems);
    } catch (error) {
      console.error(error);
      toast.error('Cannot connect to server');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageLayout title="Watchlist">
      <SectionHeader label="Saved Ideas" title="Watchlist" description="Review your watchlisted stocks synced from the Django watchlist service." />
      <div className="glass-card" style={{ padding: 18 }}>
        {loading ? (
          <div className="empty-state">Loading watchlist...</div>
        ) : !items.length ? (
          <div className="empty-state">Your watchlist is empty. Go to Stocks page to add stocks.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            {items.map((item) => (
              <article
                key={item.id}
                className="glass-card"
                style={{
                  padding: 18,
                  border: '1px solid var(--border)',
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                      {item.stock.symbol}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 6 }}>
                      {item.stock.name}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: 'rgba(126, 184, 247, 0.12)',
                      border: '1px solid rgba(126, 184, 247, 0.22)',
                      color: 'var(--accent-blue)',
                      fontSize: 10,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.stock.exchange}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        width: 'fit-content',
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: 'rgba(167, 139, 250, 0.12)',
                        border: '1px solid rgba(167, 139, 250, 0.2)',
                        color: 'var(--purple)',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {item.stock.sector}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <RatingBadge rating={getRating(item.stock)} />
                      <SentimentBadge sentiment={getSentimentLabel(item.stock)} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current Price</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.stock.currency === 'INR' ? `₹${Number(item.stock.current_price).toFixed(2)}` : `${item.stock.currency} ${Number(item.stock.current_price).toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Watchlist;
