export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
}

const dayMs = 86400000;

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
}

export function seededNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += hash << 13;
    hash ^= hash >>> 7;
    hash += hash << 3;
    hash ^= hash >>> 17;
    hash += hash << 5;
    return ((hash >>> 0) % 10000) / 10000;
  };
}

export function randomBetween(next: () => number, min: number, max: number) {
  return min + (max - min) * next();
}

export function generateHistoricalSeries({
  days,
  endPrice,
  seed,
  volatility = 0.02,
}: {
  days: number;
  endPrice: number;
  seed: string;
  volatility?: number;
}) {
  const random = seededNumber(`${seed}-historical`);
  const prices = new Array(days).fill(0);
  prices[days - 1] = endPrice;

  for (let index = days - 2; index >= 0; index -= 1) {
    const move = randomBetween(random, -volatility, volatility);
    prices[index] = prices[index + 1] / (1 + move);
  }

  return prices.map((price, index) => ({
    date: new Date(Date.now() - (days - 1 - index) * dayMs).toISOString(),
    price: Number(price.toFixed(2)),
  }));
}

export function generateForecastSeries({
  days,
  startPrice,
  seed,
  bullish = true,
  volatility = 0.015,
}: {
  days: number;
  startPrice: number;
  seed: string;
  bullish?: boolean;
  volatility?: number;
}) {
  const random = seededNumber(`${seed}-forecast`);
  const trend = bullish ? 0.001 : -0.001;
  const points = [{ date: new Date().toISOString(), price: Number(startPrice.toFixed(2)) }];

  for (let index = 1; index < days; index += 1) {
    const move = trend + randomBetween(random, -volatility, volatility);
    const prev = points[index - 1].price;
    points.push({
      date: new Date(Date.now() + index * dayMs).toISOString(),
      price: Number((prev * (1 + move)).toFixed(2)),
    });
  }

  return points;
}

export function buildForecastData(
  historical: { date: string; price?: number; value?: number; close?: number }[],
  predicted: { date: string; price?: number; value?: number; predicted?: number }[],
): ForecastPoint[] {
  const histPoints: ForecastPoint[] = historical.map((item) => ({
    date: formatDate(item.date),
    actual: item.price ?? item.value ?? item.close ?? null,
    predicted: null,
  }));

  const predPoints: ForecastPoint[] = predicted.map((item) => ({
    date: formatDate(item.date),
    actual: null,
    predicted: item.price ?? item.value ?? item.predicted ?? null,
  }));

  if (histPoints.length > 0 && predPoints.length > 0) {
    const lastActual = histPoints[histPoints.length - 1].actual;
    histPoints[histPoints.length - 1].predicted = lastActual;
    predPoints[0].actual = lastActual;
  }

  return [...histPoints, ...predPoints];
}

export function generateForecastDataset({
  seed,
  currentPrice,
  historicalDays = 90,
  forecastDays = 90,
  bullish = true,
  historicalVolatility = 0.02,
  forecastVolatility = 0.015,
}: {
  seed: string;
  currentPrice: number;
  historicalDays?: number;
  forecastDays?: number;
  bullish?: boolean;
  historicalVolatility?: number;
  forecastVolatility?: number;
}) {
  const historical = generateHistoricalSeries({
    days: historicalDays,
    endPrice: currentPrice,
    seed,
    volatility: historicalVolatility,
  });

  const predicted = generateForecastSeries({
    days: forecastDays,
    startPrice: currentPrice,
    seed,
    bullish,
    volatility: forecastVolatility,
  });

  return buildForecastData(historical, predicted);
}
