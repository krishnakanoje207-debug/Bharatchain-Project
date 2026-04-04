import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import { FiShield } from 'react-icons/fi';

export default function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(phone, password);
      if (!['admin', 'rbi_admin'].includes(data.user.role)) {
        setError('This portal is for administrators only.');
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      navigate('/admin-portal');
    } catch (err) {
      setError(err.message);
      setTimeout(() => window.location.reload(), 2500);
    }
    setLoading(false);
};

return (
    <div className="page fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 0%, rgba(255,153,51,0.08) 0%, transparent 50%)' }}>
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
        <ThemeToggle />
        <LanguageToggle />
      </div>
      <div style={{ maxWidth: '420px', width: '100%', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--saffron), #FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <FiShield size={28} color="white" />
          </div>
          <h2>Admin Portal Login</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem', borderColor: 'rgba(255,153,51,0.2)' }}>
          {error && <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
          <div className="form-group"><label className="form-label">{t('login.phone')}</label><input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Admin phone number" maxLength={10} required /></div>
          <div className="form-group"><label className="form-label">{t('login.password')}</label><input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Admin password" required /></div>
          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', background: 'var(--saffron)', color: '#000', fontWeight: 700 }}>
            <FiShield size={14} /> {loading ? t('login.loggingIn') : 'Login to Admin Portal'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <p>System Admin: 9000000001 / admin123</p>
          <p>RBI Admin: 9000000002 / rbi123</p>
        </div>
      </div>
    </div>
  );
}