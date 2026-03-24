import type { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }: { children: ReactNode }) => (
  <>
    <Header />
    <Sidebar />
    <main
      style={{
        marginLeft: 200,
        marginTop: 44,
        padding: 24,
        minHeight: 'calc(100vh - 44px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      <footer
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 9,
          marginTop: 24,
          paddingTop: 16,
        }}
      >
        StockSphere © 2025 — AI-Powered Market Intelligence
      </footer>
    </main>
  </>
);

export default Layout;
