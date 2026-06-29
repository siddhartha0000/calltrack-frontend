import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch {
      setError('Incorrect username or password');
    } finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div style={{ width: 380, maxWidth: '95vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-.5px' }}>CallTrack CRM</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>Telecalling · Admissions · Sales</div>
        </div>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Sign in</div>
          <form onSubmit={submit}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Username</label>
              <input autoFocus placeholder="Enter username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Password</label>
              <input type="password" placeholder="Enter password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div style={{ marginTop: 20, padding: 12, background: 'var(--bg)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--muted)' }}>
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Demo accounts</div>
            <div>Admin: <strong>admin</strong> / <strong>admin@123</strong></div>
            <div style={{ marginTop: 3 }}>Agent: <strong>priya</strong> / <strong>agent@123</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
