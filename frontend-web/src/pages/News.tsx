import React, { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { SectionHeader } from '../components/SectionHeader';
import { SentimentBadge } from '../components/SentimentBadge';
import api from '../api/axios';

const fallbackNews = [
  { title: 'TCS extends enterprise AI delivery pipeline', url: 'https://example.com/tcs', source: 'Market Wire', published_at: '2026-03-24', sentiment: 'Positive', summary: 'Enterprise demand remains stable and margins continue to hold.' },
  { title: 'Banking stocks trade mixed after rate commentary', url: 'https://example.com/banks', source: 'Money Desk', published_at: '2026-03-24', sentiment: 'Neutral', summary: 'Investors are repricing balance sheet sensitivity across lenders.' },
  { title: 'Auto names slip as commodity costs rise', url: '', source: 'Street Pulse', published_at: '2026-03-23', sentiment: 'Negative', summary: 'Input inflation is back in focus for manufacturers and suppliers.' },
  { title: 'Reliance retail expansion supports consumption view', url: 'https://example.com/reliance', source: 'Capital Scan', published_at: '2026-03-23', sentiment: 'Positive', summary: 'Store additions and digital scale reinforce the medium-term thesis.' },
  { title: 'Pharma basket sees defensive rotation', url: '', source: 'Health Markets', published_at: '2026-03-22', sentiment: 'Neutral', summary: 'Defensive positioning is lifting large cap pharma names this week.' },
  { title: 'IT export basket faces pricing pressure', url: 'https://example.com/it', source: 'Tech Finance', published_at: '2026-03-22', sentiment: 'Negative', summary: 'Deal wins remain healthy but pricing conversations are tougher.' },
];

const News: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.get('/news/search?query=stocks').then((response) => {
      const data = response.data?.results || response.data || [];
      setArticles(Array.isArray(data) && data.length ? data : fallbackNews);
    }).catch(() => setArticles(fallbackNews));
  }, []);

  const visible = useMemo(() => articles.filter((article) => {
    const title = String(article.title || article.headline || '').toLowerCase();
    const sentiment = String(article.sentiment || 'Neutral');
    return title.includes(search.toLowerCase()) && (filter === 'All' || sentiment.toLowerCase().includes(filter.toLowerCase()));
  }), [articles, search, filter]);

  const handleReadMore = (article: any, index: number) => {
    if (article.url || article.link) {
      window.open(article.url || article.link, '_blank');
    } else {
      setExpanded(expanded === index ? null : index);
    }
  };

  return (
    <PageLayout title="News">
      <SectionHeader label="News Flow" title="News" description="Latest stock-related news with sentiment filters and a safe read-more action." />
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="glass-card" style={{ padding: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input className="input-field" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search headlines..." style={{ maxWidth: 320 }} />
          {['All', 'Positive', 'Neutral', 'Negative'].map((item) => <button key={item} className={filter === item ? 'btn btn-primary' : 'btn btn-outline'} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          {visible.map((article, index) => (
            <div key={`${article.title}-${index}`} className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="badge badge-green">AI SUMMARY</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{article.published_at || article.date || '--'}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{article.title || article.headline}</div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>{article.summary || article.description || 'No summary available.'}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <SentimentBadge sentiment={String(article.sentiment || 'Neutral')} />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{article.source || 'Unknown source'}</span>
              </div>
              <button className="btn btn-ghost" style={{ color: '#7eb8f7', marginTop: 10, paddingInline: 0 }} onClick={() => handleReadMore(article, index)}>
                Read More
              </button>
              {expanded === index ? <div style={{ marginTop: 10, color: 'var(--text-secondary)' }}>{article.summary || article.description || 'No expanded article text available.'}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default News;
