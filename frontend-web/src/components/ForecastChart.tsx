import React, { useMemo } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useCurrency } from '../context/CurrencyContext';
import { formatDateShort } from '../utils/forecastHelpers';

interface DataPoint {
  date: string;
  actual?: number | null;
  predicted?: number | null;
}

interface ForecastChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  showArea?: boolean;
}

const CustomTooltip = ({ active, payload, label, convertPrice, currencySymbol }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip" style={{ padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {p.value !== null && p.value !== undefined
              ? `${currencySymbol}${convertPrice(Number(p.value)).toFixed(2)}`
              : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ForecastChart: React.FC<ForecastChartProps> = ({ data, title, height = 300, showArea = true }) => {
  const { convertPrice, currencySymbol } = useCurrency();
  const splitIndex = useMemo(() => {
    let last = -1;
    data.forEach((d, i) => { if (d.actual !== null && d.actual !== undefined) last = i; });
    return last;
  }, [data]);
  const chartData = useMemo(() => data.map((d, i) => ({
    date: d.date,
    actual: d.actual ?? null,
    predicted: i >= splitIndex && splitIndex >= 0 ? (i === splitIndex ? (d.actual ?? d.predicted ?? null) : (d.predicted ?? null)) : null,
  })), [data, splitIndex]);

  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No forecast data available</div>;

  return (
    <div>
      {title ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</div> : null}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1abc9c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1abc9c" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f39c12" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f39c12" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value) => formatDateShort(value)} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval="preserveStartEnd" minTickGap={60} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${currencySymbol}${convertPrice(Number(v)).toFixed(0)}`} width={70} />
          <Tooltip content={<CustomTooltip convertPrice={convertPrice} currencySymbol={currencySymbol} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 12 }} />
          {splitIndex >= 0 ? <ReferenceLine x={data[splitIndex]?.date} stroke="var(--text-muted)" strokeDasharray="4 4" label={{ value: 'Today', position: 'top', fontSize: 10, fill: 'var(--text-muted)' }} /> : null}
          {showArea ? (
            <>
              <Area type="monotone" dataKey="actual" name="Actual Price" stroke="#1abc9c" strokeWidth={2} fill="url(#gradActual)" dot={false} connectNulls={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="predicted" name="Predicted Price" stroke="#f39c12" strokeWidth={2} strokeDasharray="6 3" fill="url(#gradPredicted)" dot={false} connectNulls isAnimationActive={false} />
            </>
          ) : (
            <>
              <Line type="monotone" dataKey="actual" name="Actual Price" stroke="#1abc9c" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="predicted" name="Predicted Price" stroke="#f39c12" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls isAnimationActive={false} />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
