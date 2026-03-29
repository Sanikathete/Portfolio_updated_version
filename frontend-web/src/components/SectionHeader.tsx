import React from 'react';

interface SectionHeaderProps {
  label: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ label, title, description, action }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ fontSize: 9, color: 'var(--accent-gold)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
      * {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: description ? 8 : 0 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h1>
      {action ? <div>{action}</div> : null}
    </div>
    {description ? <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 600, lineHeight: 1.6, margin: 0 }}>{description}</p> : null}
  </div>
);
