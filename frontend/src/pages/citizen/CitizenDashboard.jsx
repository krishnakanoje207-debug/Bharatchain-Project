import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiSend, FiCopy, FiFileText, FiCreditCard, FiShoppingBag, FiEye, FiActivity, FiArrowRight } from 'react-icons/fi';

export default function CitizenDashboard() {
  const { user, authFetch } = useAuth();
  const { t } = useLanguage();
  const [wallet, setWallet] = useState(null);
  const [apps, setApps] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      authFetch('/api/blockchain/wallet-info').then(r => r.json()),
      authFetch('/api/verify/my-applications').then(r => r.json()),
      authFetch('/api/verify/notifications').then(r => r.json()),
    ]).then(([w, a, n]) => {
      setWallet(w);
      setApps(a.applications || []);
      setNotifications(n.notifications || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const copyWallet = () => {
    if (wallet?.wallet) { navigator.clipboard.writeText(wallet.wallet); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const getStatusBadge = (s) => {
    const map = { 'Approved': 'badge-success', 'Funded': 'badge-success', 'Pending': 'badge-warning', 'Rejected': 'badge-error' };
    const label = { 'Approved': t('status.approved'), 'Funded': t('status.funded'), 'Pending': t('status.pending'), 'Rejected': t('status.rejected') };
    return <span className={`badge ${map[s] || 'badge-info'}`}>{label[s] || s}</span>;
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{t('citizen.welcome')} {user?.name} 👋</h1>
          <p className="page-subtitle">{t('citizen.subtitle')}</p>
        </div>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-value">₹{wallet?.tokenBalance || '0'}</div>
            <div className="stat-label">{t('citizen.balance')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{apps.length > 0 ? apps[0].status : t('citizen.notApplied')}</div>
            <div className="stat-label">{t('citizen.appStatus')}</div>
          </div>
          <div className="stat-card" style={{ cursor: wallet?.wallet ? 'pointer' : 'default' }} onClick={copyWallet}>
            <div className="stat-value" style={{ fontSize: '1rem', wordBreak: 'break-all' }}>
              {wallet?.wallet ? `${wallet.wallet.slice(0, 8)}...${wallet.wallet.slice(-6)}` : '—'}
            </div>
            <div className="stat-label">{copied ? `✅ ${t('citizen.copied')}` : t('citizen.autoWallet')} {wallet?.wallet && <FiCopy size={10} />}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 style={{ marginBottom: '1rem' }}>Quick Actions</h2>
        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <Link to="/citizen/apply" className="card" style={{ textAlign: 'center', padding: '1.5rem', textDecoration: 'none' }}>
            <FiFileText size={28} color="var(--accent-primary)" />
            <h3 style={{ marginTop: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}>{t('citizen.applyScheme')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{t('citizen.applyDesc')}</p>
          </Link>
          <Link to="/citizen/wallet" className="card" style={{ textAlign: 'center', padding: '1.5rem', textDecoration: 'none' }}>
            <FiCreditCard size={28} color="var(--success)" />
            <h3 style={{ marginTop: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}>{t('citizen.myWallet')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{t('citizen.walletDesc')}</p>
          </Link>
          <Link to="/citizen/send" className="card" style={{ textAlign: 'center', padding: '1.5rem', textDecoration: 'none' }}>
            <FiShoppingBag size={28} color="var(--saffron)" />
            <h3 style={{ marginTop: '0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}>{t('citizen.payVendor')}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{t('citizen.payDesc')}</p>
          </Link>
        </div>

        <div className="grid-2">
          <Link to="/schemes" className="card" style={{ textAlign: 'center', padding: '1.25rem', textDecoration: 'none' }}>
            <FiEye size={22} color="var(--info)" />
            <h4 style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>{t('citizen.viewSchemes')}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('citizen.viewSchemesDesc')}</p>
          </Link>
          <Link to="/ledger" className="card" style={{ textAlign: 'center', padding: '1.25rem', textDecoration: 'none' }}>
            <FiActivity size={22} color="var(--warning)" />
            <h4 style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>{t('citizen.publicLedger')}</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('citizen.ledgerDesc')}</p>
          </Link>
        </div>

        {/* Application History */}
        {apps.length > 0 && (
          <div className="card mt-3" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
            <h3 style={{ marginBottom: '1rem' }}>{t('citizen.appHistory')}</h3>
            {apps.map(a => (
              <div key={a.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{a.scheme_name || `Scheme #${a.scheme_id}`}</strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {t('citizen.applied')}: {new Date(a.applied_at).toLocaleDateString()} | {a.citizen_name} ({a.occupation}) — {a.district}, {a.state}
                  </p>
                </div>
                <div className="flex gap-1">{getStatusBadge(a.status)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <div className="card mt-3" style={{ borderLeft: '4px solid var(--info)' }}>
            <h3 style={{ marginBottom: '1rem' }}>{t('citizen.notifications')}</h3>
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>{n.message}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
