import { useEffect, useState } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  dotColor: string;
  subtitle?: string;
}

const StatCard = ({ title, value, dotColor, subtitle }: StatCardProps) => {
  const [displayValue, setDisplayValue] = useState<string | number>(typeof value === 'number' ? 0 : value);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 800, 1);
      setDisplayValue(Math.round(value * progress * 100) / 100);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
          }}
        />
        <span className="label">{title}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 16 }}>{displayValue}</div>
      {subtitle ? <div style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 11 }}>{subtitle}</div> : null}
    </div>
  );
};

export default StatCard;
