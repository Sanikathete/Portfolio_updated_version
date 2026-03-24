import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';
import { MOCK_NEWS } from '../data/mockData';
import { sentimentBadgeClass } from '../utils/format';

const filters = ['All', 'Positive', 'Neutral', 'Negative'] as const;

const News = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');

  useEffect(() => {
    const hydrate = async () => {
      try {
        await api.get('/api/news/');
      } catch (error) {
        console.error(error);
      }
    };

    void hydrate();
  }, []);

  const items = useMemo(
    () =>
      MOCK_NEWS.filter((item) => filter === 'All' || item.sentiment === filter).filter((item) =>
        `${item.headline} ${item.summary}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [filter, search],
  );

  return (
    <Layout>
      <div className="fade-in" style={{ display: 'grid', gap: 16 }}>
        <div className="panel">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search news headlines or summaries..." />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {filters.map((item) => (
              <button key={item} className={item === filter ? 'btn-blue' : 'btn-outline'} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          {items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className="panel"
                style={{ transition: 'border-color 0.2s', minHeight: 180, borderColor: 'var(--border)' }}
                onMouseEnter={(event) => { event.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
                onMouseLeave={(event) => { event.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-green">AI SUMMARY</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.time}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginTop: 8 }}>{item.headline}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 6 }}>{item.summary}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                  <span className={sentimentBadgeClass(item.sentiment)}>{item.sentiment}</span>
                  <div style={{ width: 60, height: 4, background: '#1a2540' }}>
                    <div style={{ width: `${item.score * 100}%`, height: '100%', background: '#7eb8f7' }} />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.source}</span>
                </div>
                <div style={{ color: 'var(--accent-blue)', marginTop: 12, fontSize: 12 }}>Read More →</div>
              </div>
            ))
          ) : (
            <div className="panel empty-state" style={{ gridColumn: '1 / -1' }}>No data available. Add stocks to your portfolio.</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default News;
