import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiShield } from 'react-icons/fi';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@rbi.gov.in');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.role !== 'admin') {
        setError('This login is for RBI administrators only.');
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '440px', padding: '4rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <FiShield size={40} color="var(--saffron)" />
          <h2 style={{ marginTop: '1rem' }}>RBI Admin Login</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem', borderColor: 'rgba(255, 153, 51, 0.2)' }}>
          {error && <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" required />
          </div>

          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', background: 'var(--saffron)', color: '#000', fontWeight: 700 }}>
            <FiShield size={14} /> {loading ? 'Verifying...' : 'Login as Administrator'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Demo credentials: admin@rbi.gov.in / admin123
        </p>
      </div>
    </div>
  );
}
