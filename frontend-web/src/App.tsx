import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { Header } from './components/Header';
import { ChatWidget } from './components/ChatWidget';
import './styles/globals.css';

const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Stocks = React.lazy(() => import('./pages/Stocks'));
const StockDetail = React.lazy(() => import('./pages/StockDetail'));
const Portfolio = React.lazy(() => import('./pages/Portfolio'));
const QualityCheck = React.lazy(() => import('./pages/QualityCheck'));
const RecommendStocks = React.lazy(() => import('./pages/RecommendStocks'));
const Watchlist = React.lazy(() => import('./pages/Watchlist'));
const Growth = React.lazy(() => import('./pages/Growth'));
const MLAnalysis = React.lazy(() => import('./pages/MLAnalysis'));
const Compare = React.lazy(() => import('./pages/Compare'));
const GoldSilver = React.lazy(() => import('./pages/GoldSilver'));
const Crypto = React.lazy(() => import('./pages/Crypto'));
const News = React.lazy(() => import('./pages/News'));
const Chat = React.lazy(() => import('./pages/Chat'));

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--purple)', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading StockSphere...</div>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <PortfolioProvider>
            <Header />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
                <Route path="/stocks/:symbol" element={<ProtectedRoute><StockDetail /></ProtectedRoute>} />
                <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
                <Route path="/quality-check" element={<ProtectedRoute><QualityCheck /></ProtectedRoute>} />
                <Route path="/portfolio/recommend" element={<ProtectedRoute><RecommendStocks /></ProtectedRoute>} />
                <Route path="/portfolio/stock/:symbol" element={<ProtectedRoute><StockDetail mode="portfolio" /></ProtectedRoute>} />
                <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
                <Route path="/growth" element={<ProtectedRoute><Growth /></ProtectedRoute>} />
                <Route path="/ml-analysis" element={<ProtectedRoute><MLAnalysis /></ProtectedRoute>} />
                <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
                <Route path="/gold-silver" element={<ProtectedRoute><GoldSilver /></ProtectedRoute>} />
                <Route path="/crypto" element={<ProtectedRoute><Crypto /></ProtectedRoute>} />
                <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <ChatWidget />
            <Toaster position="top-right" toastOptions={{ duration: 3500, style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }, success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--bg-card)' } }, error: { iconTheme: { primary: 'var(--red)', secondary: 'var(--bg-card)' } } }} />
          </PortfolioProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
