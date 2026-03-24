import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface PortfolioOption {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface PortfolioCtx {
  selectedPortfolioId: number | null;
  setSelectedPortfolioId: (id: number | null) => void;
  portfolios: PortfolioOption[];
  setPortfolios: (items: PortfolioOption[]) => void;
  activePortfolioId: number | null;
  setActivePortfolioId: (id: number | null) => void;
}

const PortfolioContext = createContext<PortfolioCtx>({} as PortfolioCtx);

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [selectedPortfolioIdState, setSelectedPortfolioIdState] = useState<number | null>(
    Number(localStorage.getItem('selected_portfolio_id')) || null,
  );
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);

  const setSelectedPortfolioId = (id: number | null) => {
    setSelectedPortfolioIdState(id);
    if (id) localStorage.setItem('selected_portfolio_id', String(id));
    else localStorage.removeItem('selected_portfolio_id');
  };

  const value = useMemo(
    () => ({
      selectedPortfolioId: selectedPortfolioIdState,
      setSelectedPortfolioId,
      portfolios,
      setPortfolios,
      activePortfolioId: selectedPortfolioIdState,
      setActivePortfolioId: setSelectedPortfolioId,
    }),
    [selectedPortfolioIdState, portfolios],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};

export const usePortfolio = () => useContext(PortfolioContext);
