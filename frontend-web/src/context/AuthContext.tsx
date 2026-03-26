import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import axios from '../api/axios';
import {
  clearStoredAuth,
  decodeJwtPayload,
  getValidStoredToken,
  storeAuthSession,
} from '../utils/auth';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  userId: number | null;
}

interface AuthContextType {
  token: string | null;
  userId: number | null;
  username: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const getInitialAuthState = (): AuthState => {
  const token = getValidStoredToken();
  const username = localStorage.getItem('username');
  const storedUserId = localStorage.getItem('user_id');

  return {
    isAuthenticated: !!token,
    token,
    username,
    userId: storedUserId ? Number(storedUserId) : null,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialState = getInitialAuthState();
  const [token, setToken] = useState<string | null>(initialState.token);
  const [userId, setUserId] = useState<number | null>(initialState.userId);
  const [username, setUsername] = useState<string | null>(initialState.username);
  const [isAuthenticated, setIsAuthenticated] = useState(initialState.isAuthenticated);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncAuthState = () => {
      const restoredState = getInitialAuthState();
      setToken(restoredState.token);
      setUserId(restoredState.userId);
      setUsername(restoredState.username);
      setIsAuthenticated(restoredState.isAuthenticated);
      setLoading(false);
    };

    syncAuthState();
    window.addEventListener('auth-changed', syncAuthState);
    window.addEventListener('storage', syncAuthState);

    return () => {
      window.removeEventListener('auth-changed', syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  const login = async (uname: string, password: string) => {
    const res = await axios.post('/api/users/login/', { username: uname, password });
    const payload = res.data ?? {};
    const t = payload.access;
    const refreshToken = payload.refresh;
    const decoded = t ? decodeJwtPayload(t) : null;
    const user_id = payload.user_id ?? decoded?.user_id ?? null;
    const u = payload.username ?? uname;

    if (!t || !refreshToken) throw new Error('Authentication tokens missing from response');

    storeAuthSession({
      token: t,
      refreshToken,
      username: u,
      userId: user_id,
    });

    setToken(t);
    setUserId(user_id);
    setUsername(u);
    setIsAuthenticated(true);
    setLoading(false);
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUserId(null);
    setUsername(null);
    setIsAuthenticated(false);
    setLoading(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ token, userId, username, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--purple)', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Checking your session...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
