import React from 'react';

export const SentimentBadge: React.FC<{ sentiment: string }> = ({ sentiment }) => {
  const s = (sentiment || '').toLowerCase();
  const cls = s.includes('positive') || s === 'bullish'
    ? 'badge badge-positive'
    : s.includes('negative') || s === 'bearish'
    ? 'badge badge-negative'
    : 'badge badge-neutral';
  const icon = s.includes('positive') || s === 'bullish' ? '▲'
             : s.includes('negative') || s === 'bearish' ? '▼' : '●';
  return <span className={cls}>{icon} {sentiment || 'Neutral'}</span>;
};
