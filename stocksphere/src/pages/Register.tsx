import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Header from '../components/Header';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/users/register/', form);
      window.__showToast?.('Account created successfully. Sign in to continue.', 'success');
      navigate('/login');
    } catch (error) {
      console.error(error);
      window.__showToast?.('Registration failed. Please review your details.', 'error');
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
          <div className="page-title">Create Account</div>
          <div style={{ marginTop: 18 }}>
            <div className="label">Username</div>
            <input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="label">Email</div>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="label">Password</div>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="label">Phone</div>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
          </div>
          <button className="btn-blue" type="submit" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
            {loading ? 'Registering...' : 'Register'}
          </button>
          <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-blue)' }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default Register;
