import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface Props {
  children: ReactNode;
  title?: string;
}

export const PageLayout: React.FC<Props> = ({ children, title }) => {
  useEffect(() => {
    if (title) document.title = `${title} - StockSphere`;
  }, [title]);

  return (
    <>
      <Sidebar />
      <main
        className="page-enter"
        style={{
          marginLeft: 200,
          paddingTop: 44,
          minHeight: '100vh',
          background: 'var(--bg-main)',
        }}
      >
        <div style={{ padding: '24px 24px 48px', minHeight: 'calc(100vh - 44px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <footer style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 10, marginTop: 24, paddingTop: 16 }}>
            StockSphere © 2025 - AI-Powered Market Intelligence
          </footer>
        </div>
      </main>
    </>
  );
};
