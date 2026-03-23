import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Portfolio from './pages/Portfolio'
import Stocks from './pages/Stocks'
import {
  clearStoredAuth,
  getStoredAuth,
  isAuthenticated,
} from './api/config'

function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  const auth = getStoredAuth()

  return (
    <div className="min-h-screen bg-app text-app-text">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <Sidebar username={auth?.username ?? 'Investor'} onLogout={clearStoredAuth} />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function RootRedirect() {
  return <Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stocks" element={<Stocks />} />
        <Route path="/portfolio" element={<Portfolio />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
