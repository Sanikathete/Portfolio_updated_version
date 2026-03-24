import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fastapiInstance } from '../api/axios';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';

const News: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [modalArticle, setModalArticle] = useState<any>(null);

  useEffect(() => {
    fastapiInstance.get('/news/').then((res) => {
      const data = res.data?.results || res.data || [];
      setArticles(Array.isArray(data) ? data : []);
    }).catch(() => toast.error('Unable to load news.'));
  }, []);

  const handleReadMore = (article: any) => {
    if (article.url || article.link) {
      window.open(article.url || article.link, '_blank', 'noopener,noreferrer');
    } else if (article.content || article.full_text) {
      setModalArticle(article);
    }
  };

  const visible = useMemo(() => articles.filter((article) => {
    const matchesSearch = String(article.headline || article.title || '').toLowerCase().includes(search.toLowerCase());
    const sentiment = String(article.sentiment || 'Neutral');
    return matchesSearch && (filter === 'All' || sentiment.toLowerCase().includes(filter.toLowerCase()));
  }), [articles, search, filter]);

  return (
    <PageLayout title="News">
      <SectionHeader label="News Flow" title="News" description="Search headlines, filter by sentiment, and open the original article or an inline modal when no link is available." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="glass-card" style={{ padding: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input className="input-field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search headlines..." style={{ maxWidth: 320 }} />
          {['All', 'Positive', 'Neutral', 'Negative'].map((item) => <button key={item} className={filter === item ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {visible.map((article, index) => (
            <div key={index} className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="badge badge-blue">AI SUMMARY</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{article.date || article.published_at || '—'}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{article.headline || article.title}</div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>{article.summary || article.description || article.content || 'No summary available.'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <SentimentBadge sentiment={String(article.sentiment || 'Neutral')} />
                <button className="btn btn-outline" onClick={() => handleReadMore(article)}>Read Full Article →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modalArticle ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'grid', placeItems: 'center', zIndex: 1200 }}>
          <div className="glass-card" style={{ width: 'min(760px, 92vw)', maxHeight: '82vh', overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 22 }}>{modalArticle.headline || modalArticle.title}</h2>
              <button className="btn btn-danger" onClick={() => setModalArticle(null)}>Close</button>
            </div>
            <div style={{ color: 'var(--text-muted)', lineHeight: 1.8 }}>{modalArticle.content || modalArticle.full_text}</div>
          </div>
        </div>
      ) : null}
    </PageLayout>
  );
};

export default News;
