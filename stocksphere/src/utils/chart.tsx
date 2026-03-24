import type { CSSProperties, ReactNode } from 'react';

export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: '#1a2540',
};

export const chartXAxisProps = {
  stroke: '#4a6080',
  tick: { fill: '#4a6080', fontSize: 10 },
};

export const chartYAxisProps = {
  stroke: '#4a6080',
  tick: { fill: '#4a6080', fontSize: 10 },
};

export const chartTooltipStyle: CSSProperties = {
  background: '#0d1428',
  border: '1px solid #1a2540',
  borderRadius: '4px',
  fontSize: '11px',
  color: '#e2e8f0',
};

export const chartLegendStyle: CSSProperties = {
  fontSize: '11px',
  color: '#c9d1e0',
};

export const renderNoData = (content = 'No data available. Add stocks to your portfolio.') => (
  <div className="empty-state">{content}</div>
);

export const chartWrapper = (child: ReactNode, height = 300) => (
  <div style={{ width: '100%', height }}>{child}</div>
);
