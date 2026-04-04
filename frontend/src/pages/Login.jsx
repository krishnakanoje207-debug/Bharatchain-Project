import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';

export default function Login() {
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
      if (['admin', 'rbi_admin'].includes(data.user.role)) {
        navigate('/admin-portal');
      } else {
        navigate(`/${data.user.role}`);
      }
    } catch (err) {
      setError(err.message);
      setTimeout(() => window.location.reload(), 2500);
    }
    setLoading(false);
  };

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '440px', padding: '4rem 1.5rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{t('login.title')}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>{t('login.subtitle')}</p>
        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          {error && <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
          <div className="form-group"><label className="form-label">{t('login.phone')}</label><input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter your 10-digit phone number" maxLength={10} required /></div>
          <div className="form-group"><label className="form-label">{t('login.password')}</label><input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required /></div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>{loading ? t('login.loggingIn') : t('login.button')}</button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p><Link to="/forgot-password">{t('login.forgotPassword')}</Link></p>
          <p style={{ marginTop: '0.5rem' }}>{t('login.noAccount')} <Link to="/signup">{t('nav.signup')}</Link></p>
        </div>
      </div>
    </div>
  );
}
