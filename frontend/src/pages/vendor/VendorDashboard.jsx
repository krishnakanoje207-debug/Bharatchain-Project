import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { useState, useEffect } from 'react';
import { FiFileText, FiRefreshCw, FiCopy, FiBell } from 'react-icons/fi';

export default function VendorDashboard() {
  const { user, authFetch } = useAuth();
  const { t } = useLanguage();
  const [vendorApp, setVendorApp] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => refreshBalance(), 15000);
    return () => clearInterval(interval);
  }, []);

  const refreshBalance = async () => {
    try {
      const walletRes = await authFetch('/api/blockchain/wallet-info');
      const walletData = await walletRes.json();
      setTokenBalance(walletData.tokenBalance || '0');
    } catch (err) { console.error(err); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const statusRes = await authFetch('/api/verify/my-vendor-status');
      const statusData = await statusRes.json();
      setVendorApp(statusData.application);
      setWallet(statusData.walletAddress);

      const walletRes = await authFetch('/api/blockchain/wallet-info');
      const walletData = await walletRes.json();
      setTokenBalance(walletData.tokenBalance || '0');

      const notifRes = await authFetch('/api/verify/notifications');
      const notifData = await notifRes.json();
      setNotifications(notifData.notifications || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const copyWallet = () => {
    if (wallet) { navigator.clipboard.writeText(wallet); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const statusColors = { Pending: 'var(--warning)', Approved: 'var(--success)', Rejected: 'var(--error)' };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{t('vendor.welcome')} {user?.name} 👋</h1>
          <p className="page-subtitle">{t('vendor.subtitle')}</p>
        </div>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-value">₹{parseFloat(tokenBalance).toLocaleString()}</div>
            <div className="stat-label">{t('vendor.tokenBalance')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: vendorApp ? statusColors[vendorApp.status] : 'var(--text-muted)', fontSize: '1rem' }}>
              {vendorApp ? (vendorApp.status === 'Pending' ? t('vendor.pendingReview') : vendorApp.status === 'Approved' ? t('status.approved') : t('status.rejected')) : t('vendor.notApplied')}
            </div>
            <div className="stat-label">{t('vendor.approvalStatus')}</div>
          </div>
          <div className="stat-card" style={{ cursor: wallet ? 'pointer' : 'default' }} onClick={copyWallet}>
            <div className="stat-value mono" style={{ fontSize: '0.85rem' }}>
              {wallet ? `${wallet.slice(0,8)}...` : t('common.none')}
              {wallet && <FiCopy size={12} style={{ marginLeft: '4px', opacity: 0.6 }} />}
            </div>
            <div className="stat-label">{copied ? `✅ ${t('citizen.copied')}` : t('citizen.autoWallet')}</div>
          </div>
        </div>

        {vendorApp && (
          <div className="card mb-2" style={{ padding: '1.5rem', borderLeft: `4px solid ${statusColors[vendorApp.status]}` }}>
            <h3>{vendorApp.business_name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Type: {vendorApp.vendor_type} | Status: <strong style={{ color: statusColors[vendorApp.status] }}>{vendorApp.status}</strong>
            </p>
            {vendorApp.status === 'Pending' && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Your application is being reviewed by the admin team. You'll be notified once approved.</p>
            )}
            {vendorApp.status === 'Rejected' && vendorApp.rejection_reason && (
              <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Reason: {vendorApp.rejection_reason}</p>
            )}
          </div>
        )}

        <div className="grid-2">
          <Link to="/vendor/apply" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '2rem' }}>
            <FiFileText size={32} color="var(--accent-primary)" />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{vendorApp ? t('vendor.viewApp') : t('vendor.applyApproval')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('vendor.appDesc')}</p>
          </Link>
          <Link to="/vendor/exchange" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '2rem', opacity: vendorApp?.status === 'Approved' ? 1 : 0.5 }}>
            <FiRefreshCw size={32} color="var(--success)" />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{t('vendor.requestExchange')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {vendorApp?.status === 'Approved' ? t('vendor.exchangeDesc') : t('vendor.afterApproval')}
            </p>
          </Link>
        </div>

        {notifications.length > 0 && (
          <div className="card mt-2" style={{ padding: '1.5rem', borderLeft: '4px solid var(--info)' }}>
            <h3 style={{ marginBottom: '1rem' }}><FiBell size={16} /> {t('citizen.notifications')}</h3>
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {n.message}
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
