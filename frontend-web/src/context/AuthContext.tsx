import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import axios from '../api/axios';

interface AuthContextType {
  token: string | null;
  userId: number | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userId, setUserId] = useState<number | null>(Number(localStorage.getItem('user_id')) || null);
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));

  const login = async (uname: string, password: string) => {
    const res = await axios.post('/api/users/login/', { username: uname, password });
    const payload = res.data ?? {};
    const t = payload.token ?? payload.access;
    const user_id = payload.user_id ?? payload.id ?? null;
    const u = payload.username ?? uname;
    if (!t) throw new Error('Authentication token missing from response');
    localStorage.setItem('token', t);
    if (user_id) localStorage.setItem('user_id', String(user_id));
    localStorage.setItem('username', u);
    setToken(t);
    setUserId(user_id);
    setUsername(u);
  };

  const logout = () => {
    ['token', 'user_id', 'username'].forEach((k) => localStorage.removeItem(k));
    setToken(null);
    setUserId(null);
    setUsername(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ token, userId, username, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) { window.location.href = '/login'; return null; }
  return <>{children}</>;
};
