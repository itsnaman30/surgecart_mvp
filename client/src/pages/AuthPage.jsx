import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { AuthContext } from '../context/AuthContext.jsx';

const AuthPage = () => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'register') {
        await authApi.register({ email: form.email, password: form.password, name: form.name });
        setMode('login');
        setError('Registration successful. Sign in below.');
      } else {
        const res = await authApi.login({ email: form.email, password: form.password });
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not authenticate.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p style={styles.subtitle}>Use your account to save products, monitor surge demand, and get delivery alerts.</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={styles.input}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={styles.input}
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.button} disabled={busy}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={styles.switchButton}>
          {mode === 'login' ? 'New here? Create account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
    padding: '36px',
    border: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    marginBottom: '12px',
    fontSize: '26px',
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    marginBottom: '24px',
    color: '#475569',
    lineHeight: 1.6,
  },
  form: {
    display: 'grid',
    gap: '12px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    outline: 'none',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    padding: '10px 0',
  },
  button: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '14px',
    border: 'none',
    backgroundColor: '#0f172a',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  switchButton: {
    marginTop: '20px',
    width: '100%',
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default AuthPage;
