export const formatCurrency = (value: number, currency: 'INR' | 'USD' | 'EUR' = 'INR') => {
  const map = {
    INR: { locale: 'en-IN', currency: 'INR' },
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
  };

  return new Intl.NumberFormat(map[currency].locale, {
    style: 'currency',
    currency: map[currency].currency,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(value);

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const sentimentBadgeClass = (sentiment: string) => {
  if (sentiment === 'Positive') return 'badge badge-green';
  if (sentiment === 'Negative') return 'badge badge-red';
  return 'badge badge-yellow';
};

export const riskBadgeClass = (risk: string) => {
  if (risk === 'High Risk') return 'badge badge-red';
  if (risk === 'Low Risk') return 'badge badge-green';
  return 'badge badge-yellow';
};

export const getChangeColor = (value: number) => (value >= 0 ? 'var(--green)' : 'var(--red)');

export const getArrow = (value: number) => (value >= 0 ? 'UP' : 'DN');
