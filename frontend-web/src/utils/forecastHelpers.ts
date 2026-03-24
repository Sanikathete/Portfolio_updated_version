export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
}

export function buildForecastData(
  historical: { date: string; price?: number; value?: number; close?: number }[],
  predicted:  { date: string; price?: number; value?: number; predicted?: number }[],
): ForecastPoint[] {
  const histPoints: ForecastPoint[] = historical.map((h) => ({
    date: formatDate(h.date),
    actual: h.price ?? h.value ?? h.close ?? null,
    predicted: null,
  }));

  const predPoints: ForecastPoint[] = predicted.map((p) => ({
    date: formatDate(p.date),
    actual: null,
    predicted: p.price ?? p.value ?? p.predicted ?? null,
  }));

  if (histPoints.length > 0 && predPoints.length > 0) {
    const lastActual = histPoints[histPoints.length - 1].actual;
    histPoints[histPoints.length - 1].predicted = lastActual;
    predPoints[0].actual = lastActual;
  }

  return [...histPoints, ...predPoints];
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}
