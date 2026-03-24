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
  currencySymbol: string;
  convert: (priceInINR: number) => number;
  format: (priceInINR: number, decimals?: number) => string;
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

  const convertPrice = (priceInINR: number) => priceInINR * RATES[currency];

  const format = useMemo(() => {
    return (priceInINR: number, decimals = 2) => {
      const converted = convertPrice(priceInINR);
      return `${SYMBOLS[currency]}${converted.toFixed(decimals)}`;
    };
  }, [currency]);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      convertPrice,
      currencySymbol: SYMBOLS[currency],
      convert: convertPrice,
      format,
      symbol: SYMBOLS[currency],
    }),
    [currency, format],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
