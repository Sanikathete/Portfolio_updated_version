import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from '../api/axios';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/users/register/', form);
      toast.success('Account created. You can sign in now.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ paddingTop: 44, minHeight: '100vh', display: 'grid', placeItems: 'center', paddingInline: 16 }}>
      <form onSubmit={handleSubmit} className="glass-card" style={{ width: '100%', maxWidth: 460, padding: 28 }}>
        <div style={{ fontSize: 10, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Create Workspace Access</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 18 }}>Register</h1>
        <div style={{ display: 'grid', gap: 14 }}>
          {[
            ['username', 'Username', 'text'],
            ['email', 'Email', 'email'],
            ['password', 'Password', 'password'],
            ['phone', 'Phone', 'text'],
          ].map(([key, label, type]) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
              <input className="input-field" type={type} value={(form as any)[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <button className="btn btn-gold" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 14, textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--purple-light)' }}>Login</Link>
        </div>
      </form>
    </div>
  );
};

export default Register;
