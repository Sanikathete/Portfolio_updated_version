import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/globals.css';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Growth = lazy(() => import('./pages/Growth'));
const Stocks = lazy(() => import('./pages/Stocks'));
const StockDetail = lazy(() => import('./pages/StockDetail'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const RecommendStocks = lazy(() => import('./pages/RecommendStocks'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const MLAnalysis = lazy(() => import('./pages/MLAnalysis'));
const Compare = lazy(() => import('./pages/Compare'));
const GoldSilver = lazy(() => import('./pages/GoldSilver'));
const Crypto = lazy(() => import('./pages/Crypto'));
const News = lazy(() => import('./pages/News'));
const Chat = lazy(() => import('./pages/Chat'));

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <ToastContainer />
      <Suspense fallback={<div className="empty-state">Loading workspace...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/growth" element={<ProtectedRoute><Growth /></ProtectedRoute>} />
          <Route path="/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
          <Route path="/stocks/:symbol" element={<ProtectedRoute><StockDetail /></ProtectedRoute>} />
          <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="/portfolio/recommend" element={<ProtectedRoute><RecommendStocks /></ProtectedRoute>} />
          <Route path="/portfolio/:ticker" element={<ProtectedRoute><StockDetail /></ProtectedRoute>} />
          <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
          <Route path="/ml-analysis" element={<ProtectedRoute><MLAnalysis /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
          <Route path="/gold-silver" element={<ProtectedRoute><GoldSilver /></ProtectedRoute>} />
          <Route path="/crypto" element={<ProtectedRoute><Crypto /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
