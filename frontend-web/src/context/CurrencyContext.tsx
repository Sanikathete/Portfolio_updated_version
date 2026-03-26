import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type Currency = 'INR' | 'USD' | 'EUR';

const RATES: Record<Currency, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
};

const SYMBOLS: Record<Currency, string> = {
  INR: 'Rs ',
  USD: '$',
  EUR: 'EUR ',
};

interface CurrencyCtx {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convertPrice: (priceInINR: number) => number;
  convertFromCurrency: (price: number, sourceCurrency?: string) => number;
  currencySymbol: string;
  convert: (priceInINR: number) => number;
  format: (priceInINR: number, decimals?: number) => string;
  formatFromCurrency: (price: number, sourceCurrency?: string, decimals?: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyCtx>({} as CurrencyCtx);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(
    (localStorage.getItem('currency') as Currency) || 'INR',
  );

  const setCurrency = (nextCurrency: Currency) => {
    setCurrencyState(nextCurrency);
    localStorage.setItem('currency', nextCurrency);
  };

  const normalizeCurrency = (value?: string): Currency => {
    const upper = String(value || 'INR').toUpperCase();
    return upper === 'USD' || upper === 'EUR' ? upper : 'INR';
  };

  const convertPrice = (priceInINR: number) => priceInINR * RATES[currency];
  const convertFromCurrency = (price: number, sourceCurrency = 'INR') => {
    const source = normalizeCurrency(sourceCurrency);
    const baseInINR = source === 'INR' ? price : price / RATES[source];
    return convertPrice(baseInINR);
  };

  const format = useMemo(() => {
    return (priceInINR: number, decimals = 2) => {
      const converted = convertPrice(priceInINR);
      return `${SYMBOLS[currency]}${converted.toFixed(decimals)}`;
    };
  }, [currency]);

  const formatFromCurrency = useMemo(() => {
    return (price: number, sourceCurrency = 'INR', decimals = 2) => {
      const converted = convertFromCurrency(price, sourceCurrency);
      return `${SYMBOLS[currency]}${converted.toFixed(decimals)}`;
    };
  }, [currency]);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      convertPrice,
      convertFromCurrency,
      currencySymbol: SYMBOLS[currency],
      convert: convertPrice,
      format,
      formatFromCurrency,
      symbol: SYMBOLS[currency],
    }),
    [currency, format, formatFromCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
