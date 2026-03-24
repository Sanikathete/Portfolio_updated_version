import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

const RATES: Record<Currency, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
};

const SYMBOLS: Record<Currency, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£'
};

interface CurrencyCtx {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (inrValue: number) => number;
  format: (inrValue: number, decimals?: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyCtx>({} as CurrencyCtx);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrency] = useState<Currency>(
    (localStorage.getItem('currency') as Currency) || 'INR'
  );

  const handleSetCurrency = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem('currency', c);
  };

  const convert = useCallback((v: number) => v * RATES[currency], [currency]);

  const format = useCallback((v: number, decimals = 2) => {
    const converted = v * RATES[currency];
    const symbol = SYMBOLS[currency];
    if (converted >= 1e7) return `${symbol}${(converted / 1e7).toFixed(2)}Cr`;
    if (converted >= 1e5) return `${symbol}${(converted / 1e5).toFixed(2)}L`;
    if (converted >= 1e3) return `${symbol}${(converted / 1e3).toFixed(1)}K`;
    return `${symbol}${converted.toFixed(decimals)}`;
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency: handleSetCurrency, convert, format, symbol: SYMBOLS[currency] }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
