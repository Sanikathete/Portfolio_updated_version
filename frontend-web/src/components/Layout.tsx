import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

const Layout = ({ children }: { children: ReactNode }) => (
  <>
    <Sidebar />
    <main
      className="fade-in"
      style={{
        marginLeft: 200,
        paddingTop: 44,
        paddingInline: 24,
        paddingBottom: 24,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      <footer
        style={{
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 10,
          marginTop: 24,
          paddingTop: 16,
        }}
      >
        StockSphere © 2025 - AI-Powered Market Intelligence
      </footer>
    </main>
  </>
);

export default Layout;
