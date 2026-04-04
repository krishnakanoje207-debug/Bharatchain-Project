import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import { useWallet } from '../hooks/useWallet';
import { FiUsers, FiShoppingBag, FiLink, FiCheck } from 'react-icons/fi';

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get('role') || '');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, sendOtp, verifyOtp } = useAuth();
  const { t } = useLanguage();
  const { account, connectWallet, hasMetaMask } = useWallet();
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) { setError('Enter a valid 10-digit phone number'); return; }
    setLoading(true); setError('');
    try { await sendOtp(phone); setStep(2); } catch (err) { setError(err.message); }
    setLoading(false);
  };

  const handleVerifyAndSignup = async () => {
    setLoading(true); setError('');
    try {
      await verifyOtp(phone, otp);
      await signup(phone, password, name, role, email, account);
      navigate(role === 'citizen' ? '/citizen' : '/vendor');
    } catch (err) {
      setError(err.message);
      setTimeout(() => window.location.reload(), 2000);
    }
    setLoading(false);
  };

  if (!role) {
    return (
      <div className="page fade-in">
        <div className="container" style={{ maxWidth: '700px', padding: '4rem 1.5rem' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{t('signup.title')}</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>{t('signup.chooseRole')}</p>
          <div className="grid-2">
            <button onClick={() => setRole('citizen')} className="card" style={{ textAlign: 'center', padding: '2.5rem', cursor: 'pointer', background: 'var(--bg-glass)' }}>
              <FiUsers size={40} color="var(--accent-primary)" />
              <h3 style={{ margin: '1rem 0 0.5rem' }}>{t('signup.citizen')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('signup.citizenDesc')}</p>
            </button>
            <button onClick={() => setRole('vendor')} className="card" style={{ textAlign: 'center', padding: '2.5rem', cursor: 'pointer', background: 'var(--bg-glass)' }}>
              <FiShoppingBag size={40} color="var(--success)" />
              <h3 style={{ margin: '1rem 0 0.5rem' }}>{t('signup.vendor')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('signup.vendorDesc')}</p>
            </button>
          </div>
          <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {t('signup.haveAccount')} <Link to="/login">{t('signup.loginHere')}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '480px', padding: '3rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {role === 'citizen' ? <FiUsers size={36} color="var(--accent-primary)" /> : <FiShoppingBag size={36} color="var(--success)" />}
          <h2 style={{ marginTop: '0.5rem' }}>{t('signup.as')} {role === 'citizen' ? t('signup.citizen') : t('signup.vendor')}</h2>
          <button onClick={() => setRole('')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>{t('signup.changeRole')}</button>
        </div>

        {error && <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        {step === 1 && (
          <div className="card" style={{ padding: '2rem' }}>
            <div className="form-group"><label className="form-label">{t('signup.fullName')} *</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" required /></div>
            <div className="form-group"><label className="form-label">{t('signup.phone')} *</label><input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" maxLength={10} required /></div>
            <div className="form-group"><label className="form-label">{t('signup.email')}</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com (optional)" /></div>
            <div className="form-group"><label className="form-label">{t('signup.password')} *</label><input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" required minLength={6} /></div>
            <div className="form-group">
              <label className="form-label">{t('signup.metaMask')}</label>
              {account ? (
                <div className="form-input mono" style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✓ {account.slice(0, 10)}...{account.slice(-8)}</div>
              ) : (
                <button type="button" onClick={connectWallet} className="btn btn-secondary" style={{ width: '100%' }}>
                  <FiLink size={14} /> {hasMetaMask ? t('signup.connectMeta') : t('signup.installMeta')}
                </button>
              )}
            </div>
            <button onClick={handleSendOtp} disabled={loading || !name || !phone || !password || phone.length < 10} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? t('signup.sendingOtp') : t('signup.sendOtp')}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <FiCheck size={32} color="var(--success)" />
            <h3 style={{ margin: '1rem 0 0.5rem' }}>{t('signup.otpSent')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{t('signup.enterOtp')} {phone}<br /><small>{t('signup.checkConsole')}</small></p>
            <div className="form-group"><input type="text" className="form-input" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }} /></div>
            <button onClick={handleVerifyAndSignup} disabled={loading || otp.length < 6} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? t('signup.verifying') : t('signup.verifyCreate')}
            </button>
            <button onClick={handleSendOtp} className="btn btn-sm btn-secondary mt-2" style={{ width: '100%' }}>{t('signup.resendOtp')}</button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {t('signup.haveAccount')} <Link to="/login">{t('login.button')}</Link>
        </p>
      </div>
    </div>
  );
}
