import { seededNumber } from './forecastHelpers';

export const getSentimentScore = (item: any) =>
  Number(item.sentiment_score ?? item.score ?? 0.5);

export const getPrice = (item: any) =>
  Number(item.current_price ?? item.price ?? item.close ?? 0);

export const getChangePercent = (item: any) =>
  Number(item.change_percent ?? item.change ?? 0);

export const getSentimentLabel = (item: any) => {
  const explicit = String(item.sentiment ?? '').trim().toLowerCase();
  if (explicit === 'bullish' || explicit === 'positive' || explicit === 'high') return 'High';
  if (explicit === 'bearish' || explicit === 'negative' || explicit === 'low') return 'Low';
  if (explicit === 'neutral') return 'Neutral';

  const score = Number(item.sentiment_score ?? item.score);
  if (Number.isFinite(score)) {
    if (score >= 0.65) return 'High';
    if (score <= 0.35) return 'Low';
    return 'Neutral';
  }

  const change = getChangePercent(item);
  if (change >= 1) return 'High';
  if (change <= -1) return 'Low';

  const currentPrice = Number(item.current_price ?? item.price ?? 0);
  const buyPrice = Number(item.buy_price ?? item.buyPrice ?? 0);
  if (Number.isFinite(currentPrice) && Number.isFinite(buyPrice) && buyPrice > 0) {
    const holdingMove = ((currentPrice - buyPrice) / buyPrice) * 100;
    if (holdingMove >= 3) return 'High';
    if (holdingMove <= -3) return 'Low';
  }

  const seeded = seededNumber(String(item.symbol ?? item.name ?? 'sentiment'));
  const fallback = seeded();
  if (fallback >= 0.67) return 'High';
  if (fallback <= 0.33) return 'Low';
  return 'Neutral';
};

export const getCompanyName = (item: any) =>
  String(item.company ?? item.name ?? item.symbol ?? 'Unknown');

export const getExchange = (item: any) =>
  String(item.exchange ?? item.market ?? 'NSE');

export const getSector = (item: any) =>
  String(item.sector ?? 'Unknown');

export const getRating = (stock: any): number => {
  const seeded = seededNumber(String(stock.symbol ?? stock.name ?? 'stock'));
  const sentimentLabel = getSentimentLabel(stock);
  const sectorBoost = getSector(stock).toLowerCase().includes('it') ? 0.35 : getSector(stock).toLowerCase().includes('bank') ? 0.2 : 0.1;
  const sentiment = Number(stock.sentiment_score ?? stock.score ?? 0.5);
  const change = Number(stock.change_percent ?? stock.change ?? 0);
  const pe = Number(stock.pe_ratio ?? 20);

  let baseScore = sentimentLabel === 'High' ? 8.1 : sentimentLabel === 'Low' ? 3.8 : 5.9;

  if (Number.isFinite(sentiment)) {
    baseScore += (sentiment - 0.5) * 1.4;
  }

  if (Number.isFinite(change)) {
    baseScore += change > 0 ? Math.min(change / 8, 0.8) : Math.max(change / 12, -0.8);
  }

  if (Number.isFinite(pe)) {
    baseScore += pe < 15 ? 0.5 : pe < 25 ? 0.2 : pe < 40 ? 0 : -0.35;
  }

  baseScore += sectorBoost;

  if (!Number.isFinite(baseScore)) {
    baseScore = sentimentLabel === 'High'
      ? 8 + seeded() * 1.2
      : sentimentLabel === 'Low'
      ? 3 + seeded() * 1.4
      : 5.4 + seeded() * 1.2;
  }

  return Math.min(10, Math.max(1, Number(baseScore.toFixed(1))));
};
