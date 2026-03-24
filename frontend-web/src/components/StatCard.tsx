import React, { useEffect, useRef } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  dotColor?: string;
  subtext?: string;
  glowColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, dotColor = 'var(--purple)', subtext, glowColor
}) => {
  const valRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof value === 'number' && valRef.current) {
      const end = value;
      const duration = 800;
      const step = (timestamp: number, startTime: number) => {
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        if (valRef.current) valRef.current.textContent = (eased * end).toFixed(2);
        if (progress < 1) requestAnimationFrame((t) => step(t, startTime));
      };
      requestAnimationFrame((t) => step(t, t));
    }
  }, [value]);

  return (
    <div className="stat-card" style={{ boxShadow: glowColor ? `0 0 20px ${glowColor}` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span className="pulse-dot" style={{ background: dotColor }} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
      </div>
      <div ref={valRef} style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }} className="count-animate">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </div>
      {subtext ? <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{subtext}</div> : null}
    </div>
  );
};
