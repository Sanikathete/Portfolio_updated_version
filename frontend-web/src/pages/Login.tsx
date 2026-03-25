import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Logged in successfully');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop: 44, minHeight: '100vh', display: 'grid', placeItems: 'center', paddingInline: 16 }}>
      <form onSubmit={handleSubmit} className="glass-card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{ fontSize: 10, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Secure Login</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 18 }}>Sign In</h1>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Username</div>
            <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Password</div>
            <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Link to="/forgot-password" style={{ color: 'var(--purple-light)', fontSize: 12 }}>
            Forgot Password?
          </Link>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 14, textAlign: 'center' }}>
          Need an account? <Link to="/register" style={{ color: 'var(--purple-light)' }}>Register</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
