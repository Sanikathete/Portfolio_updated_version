import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/api/users/login/', { username, password });
      const token = response.data.token ?? response.data.access;
      const user = response.data.user ?? { username, email: response.data.email ?? '' };
      if (!token) {
        throw new Error('Missing auth token in login response');
      }
      login(token, user);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      window.__showToast?.('Unable to sign in with that username and password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div
        className="fade-in"
        style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', paddingTop: 44, paddingInline: 16 }}
      >
        <form className="panel" style={{ width: '100%', maxWidth: 400 }} onSubmit={handleSubmit}>
          <div className="page-title">Sign In</div>
          <div style={{ marginTop: 18 }}>
            <div className="label">Username</div>
            <input value={username} onChange={(event) => setUsername(event.target.value)} type="text" required />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="label">Password</div>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </div>
          <button
            className="btn-blue"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 20,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Signing In...' : 'Login'}
          </button>
          <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
            Need an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-blue)' }}>
              Register
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default Login;
