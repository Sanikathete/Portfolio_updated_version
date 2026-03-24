import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR'>(
    () => (localStorage.getItem('preferredCurrency') as 'INR' | 'USD' | 'EUR') || 'INR',
  );

  const changeCurrency = (value: 'INR' | 'USD' | 'EUR') => {
    setCurrency(value);
    localStorage.setItem('preferredCurrency', value);
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        background: 'var(--bg-panel)',
        borderBottom: '0.5px solid var(--border)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="label">FINTECH INTELLIGENCE</span>
        <span style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginLeft: 8 }}>StockSphere</span>
      </div>
      {token ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            value={currency}
            onChange={(event) => changeCurrency(event.target.value as 'INR' | 'USD' | 'EUR')}
            style={{
              background: '#0a1020',
              border: '1px solid var(--border)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: 4,
              width: 84,
            }}
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <button
            className="btn-red"
            style={{ padding: '6px 10px', marginLeft: 12 }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-outline" onClick={() => navigate('/login')}>
            Login
          </button>
          <button className="btn-blue" onClick={() => navigate('/register')}>
            Register
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
