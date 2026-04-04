import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiRefreshCw, FiCheck, FiAlertTriangle, FiArrowRight, FiDollarSign } from 'react-icons/fi';

export default function VendorExchange() {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBalance();
    const interval = setInterval(() => loadBalance(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const loadBalance = async (silent = false) => {
    if (!silent) setLoadingBalance(true);
    try {
      const res = await authFetch('/api/blockchain/wallet-info');
      const data = await res.json();
      setBalance(data.tokenBalance || '0');
    } catch (err) { console.error(err); }
    if (!silent) setLoadingBalance(false);
  };

  const requestExchange = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await authFetch('/api/blockchain/request-exchange', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Exchange request for ₹${amount} submitted! Admin will verify ITR, then RBI will transfer real INR to your bank account.`);
        setAmount('');
        loadBalance(true);
      } else {
        setError(data.error || 'Exchange request failed');
      }
    } catch (err) { setError('Exchange request failed. Please try again.'); }
    setLoading(false);
  };

  const steps = [
    { label: t('exchange.step1'), icon: '📝', active: true },
    { label: t('exchange.step2'), icon: '🔍', active: false },
    { label: t('exchange.step3'), icon: '🏦', active: false },
    { label: t('exchange.step4'), icon: '🔥', active: false },
  ];

  if (loadingBalance) return <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>;

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '650px' }}>
        <div className="page-header">
          <h1 className="page-title">{t('exchange.title')}</h1>
          <p className="page-subtitle">{t('exchange.subtitle')}</p>
        </div>

        {success && (
          <div style={{ padding: '1rem', background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            <FiCheck style={{ marginRight: '0.5rem' }} />{success}
          </div>
        )}
        {error && (
          <div style={{ padding: '1rem', background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
            <FiAlertTriangle style={{ marginRight: '0.5rem' }} />{error}
          </div>
        )}

        {/* Balance Card */}
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))' }}>
          <FiDollarSign size={36} color="var(--accent-primary)" />
          <div style={{ fontSize: '3rem', fontWeight: 800, marginTop: '0.5rem' }}>
            <span className="gradient-text">₹{parseFloat(balance).toLocaleString()}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('exchange.available')}</div>
        </div>

        {/* Exchange Pipeline */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('exchange.process')}</h4>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem', flexWrap: 'wrap' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, minWidth: '120px' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                    background: i === 0 ? 'var(--accent-gradient)' : 'var(--bg-glass)',
                    border: `2px solid ${i === 0 ? 'var(--accent-primary)' : 'var(--border)'}`
                  }}>{step.icon}</div>
                  <span style={{ fontSize: '0.65rem', color: i === 0 ? 'var(--accent-primary)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{step.label}</span>
                </div>
                {i < 3 && <FiArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '-1rem' }} />}
              </div>
            ))}
          </div>
        </div>

      {/* Exchange Form */}
        <div className="card" style={{ padding: '2rem' }}>
          <div className="form-group">
            <label className="form-label">{t('exchange.amount')}</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={t('exchange.enterAmount')}
              min="0"
              style={{ fontSize: '1.2rem', textAlign: 'center', fontWeight: 700 }}
            />
          </div>

          <button
            onClick={requestExchange}
            disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(balance)}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
          >
            <FiRefreshCw /> {loading ? t('exchange.submitting') : `${t('exchange.request')} ₹${amount || '0'} Exchange`}
          </button>

          {amount && parseFloat(amount) > parseFloat(balance) && (
            <p style={{ color: 'var(--error)', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.75rem' }}>
              {t('exchange.insufficient')} (₹{parseFloat(balance).toLocaleString()})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
   