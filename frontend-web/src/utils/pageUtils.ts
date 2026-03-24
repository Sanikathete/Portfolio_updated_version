export const getSentimentScore = (item: Record<string, unknown>) =>
  Number(item.sentiment_score ?? item.score ?? 0.5);

export const getPrice = (item: Record<string, unknown>) =>
  Number(item.current_price ?? item.price ?? item.close ?? 0);

export const getChangePercent = (item: Record<string, unknown>) =>
  Number(item.change_percent ?? item.change ?? 0);

export const getCompanyName = (item: Record<string, unknown>) =>
  String(item.company ?? item.name ?? item.symbol ?? 'Unknown');

export const getExchange = (item: Record<string, unknown>) =>
  String(item.exchange ?? item.market ?? 'NSE');

export const getSector = (item: Record<string, unknown>) =>
  String(item.sector ?? 'Unknown');

export const getRating = (stock: Record<string, unknown>): number => {
  const sentiment = Number(stock.sentiment_score ?? stock.score ?? 0.5);
  const change = Number(stock.change_percent ?? 0);
  const pe = Number(stock.pe_ratio ?? 20);
  let score = sentiment * 6;
  score += change > 0 ? Math.min(change / 5, 2) : Math.max(change / 10, -1);
  score += pe < 15 ? 2 : pe < 25 ? 1 : pe < 40 ? 0 : -1;
  return Math.min(10, Math.max(1, score));
};
