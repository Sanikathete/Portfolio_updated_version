import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface PortfolioCtx {
  activePortfolioId: number | null;
  setActivePortfolioId: (id: number | null) => void;
}

const PortfolioContext = createContext<PortfolioCtx>({} as PortfolioCtx);

export const PortfolioProvider = ({ children }: { children: ReactNode }) => {
  const [activePortfolioId, setActivePortfolioId] = useState<number | null>(
    Number(localStorage.getItem('active_portfolio_id')) || null
  );

  const set = (id: number | null) => {
    setActivePortfolioId(id);
    if (id) localStorage.setItem('active_portfolio_id', String(id));
    else localStorage.removeItem('active_portfolio_id');
  };

  return (
    <PortfolioContext.Provider value={{ activePortfolioId, setActivePortfolioId: set }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => useContext(PortfolioContext);
