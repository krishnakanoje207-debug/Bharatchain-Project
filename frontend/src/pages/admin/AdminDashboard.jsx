import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiUsers, FiShoppingBag, FiFileText, FiClock, FiActivity, FiArrowRight } from 'react-icons/fi';

const ACTIVITY_ICONS = {
  'CitizenToVendor': '🛒',
  'TokenAllocation': '💰',
  'TokenRevocation': '🔥',
  'VendorExchange': '💱',
  'TokenMint': '🏭',
  'instalment': '⚡',
};

export default function AdminDashboard() {
  const { authFetch, isRbiAdmin } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('schemes'); // 'schemes' or 'activities'

  useEffect(() => {
    Promise.all([
      authFetch('/api/admin/stats').then(r => r.json()),
      authFetch('/api/admin/recent-activities?limit=20').then(r => r.json()),
    ]).then(([statsData, actData]) => {
      setStats(statsData.stats);
      setActivities(actData.activities || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>;

   return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">🏛 {isRbiAdmin ? 'RBI' : 'System'} {t('admin.dashboard')}</h1>
          <p className="page-subtitle">{t('admin.manageAll')}</p>
        </div>

        <div className="grid-4" style={{ marginBottom: '2rem' }}>
          <div className="stat-card"><div className="stat-value">{stats?.govDB?.totalCitizens || 0}</div><div className="stat-label">{t('admin.citizensGov')}</div></div>
          <div className="stat-card"><div className="stat-value">{stats?.govDB?.farmers || 0}</div><div className="stat-label">{t('admin.farmers')}</div></div>
          <div className="stat-card"><div className="stat-value">{stats?.applications?.pending || 0}</div><div className="stat-label">{t('admin.pendingApps')}</div></div>
          <div className="stat-card"><div className="stat-value">{stats?.applications?.approved || 0}</div><div className="stat-label">{t('admin.approved')}</div></div>
        </div>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card"><div className="stat-value">{stats?.platform?.totalUsers || 0}</div><div className="stat-label">{t('admin.platformUsers')}</div></div>
          <div className="stat-card"><div className="stat-value">{stats?.platform?.citizenUsers || 0}</div><div className="stat-label">{t('admin.citizenAccounts')}</div></div>
          <div className="stat-card"><div className="stat-value">{stats?.platform?.vendorUsers || 0}</div><div className="stat-label">{t('admin.vendorAccounts')}</div></div>
        </div>

        <h2 style={{ marginBottom: '1.5rem' }}>{t('admin.quickActions')}</h2>
        <div className="grid-3">
          <Link to="/admin-portal/citizens" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '2rem' }}>
            <FiUsers size={32} color="var(--accent-primary)" />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{t('admin.citizens')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('admin.citizenDesc')}</p>
            {stats?.applications?.pending > 0 && <span className="badge" style={{ background: 'var(--error)', color: 'white', marginTop: '0.5rem' }}>{stats.applications.pending} {t('admin.pending')}</span>}
          </Link>
          <Link to="/admin-portal/vendors" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '2rem' }}>
            <FiShoppingBag size={32} color="var(--saffron)" />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{t('admin.vendors')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('admin.vendorDesc')}</p>
          </Link>
          <Link to="/admin-portal/schemes" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '2rem' }}>
            <FiFileText size={32} color="var(--success)" />
            <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{t('admin.schemes')}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('admin.schemesDesc')}</p>
          </Link>
        </div>

        {isRbiAdmin && (
          <div className="grid-2 mt-3">
            <Link to="/admin-portal/event-triggers" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '2rem', borderColor: 'rgba(255,153,51,0.3)' }}>
              <FiClock size={32} color="var(--saffron)" />
              <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{t('admin.eventTriggers')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('admin.triggerDesc')}</p>
              {stats?.scheduledTriggers > 0 && <span className="badge badge-info mt-1">{stats.scheduledTriggers} {t('admin.scheduled')}</span>}
            </Link>
            <Link to="/admin-portal/ledger" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '2rem' }}>
              <FiActivity size={32} color="var(--info)" />
              <h3 style={{ marginTop: '1rem', color: 'var(--text-primary)' }}>{t('admin.txLedger')}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{t('admin.txDesc')}</p>
            </Link>
          </div>
        )}

