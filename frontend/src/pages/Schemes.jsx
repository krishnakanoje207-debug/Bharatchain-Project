import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { FiDollarSign, FiUsers, FiClock, FiLayers } from 'react-icons/fi';

export default function Schemes() {
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/verify/schemes').then(r => r.json()).then(d => { setSchemes(d.schemes || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const formatCr = (v) => `₹${(v / 10000000).toLocaleString(undefined, { maximumFractionDigits: 2 })} Crores`;
  const statusColor = (s) => s === 'Active' ? 'var(--success)' : s === 'Upcoming' ? 'var(--info)' : 'var(--text-muted)';
  const statusBadge = (s) => s === 'Active' ? 'badge-success' : s === 'Upcoming' ? 'badge-info' : 'badge-warning';

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{t('schemes.title')}</h1>
          <p className="page-subtitle">{t('schemes.subtitle')}</p>
        </div>

        {schemes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-secondary)' }}>{t('schemes.noSchemes')}</p></div>
        ) : (
          schemes.map(s => (
            <div key={s.id} className="card mb-2" style={{ padding: '2rem', borderLeft: `4px solid ${statusColor(s.status)}` }}>
              <div className="flex gap-1" style={{ alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className={`badge ${statusBadge(s.status)}`}>{t(`status.${s.status?.toLowerCase()}`)}</span>
                {s.beneficiary_count > 0 && <span className="badge badge-info"><FiUsers size={10} /> {s.beneficiary_count} {t('schemes.benefited')}</span>}
              </div>
              <h2 style={{ marginTop: '0.5rem' }}>{s.name}</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '700px' }}>{s.description}</p>

              <div className="grid-4" style={{ marginTop: '1.5rem' }}>
                <div className="stat-card">
                  <FiDollarSign size={20} color="var(--accent-primary)" style={{ margin: '0 auto 0.5rem' }} />
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>{formatCr(s.total_fund)}</div>
                  <div className="stat-label">{t('schemes.totalFund')}</div>
                </div>
                <div className="stat-card">
                  <FiUsers size={20} color="var(--success)" style={{ margin: '0 auto 0.5rem' }} />
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>₹{s.per_citizen_amount?.toLocaleString()}</div>
                  <div className="stat-label">{t('schemes.perCitizen')}</div>
                </div>
                <div className="stat-card">
                  <FiLayers size={20} color="var(--warning)" style={{ margin: '0 auto 0.5rem' }} />
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>{s.instalment_count}</div>
                  <div className="stat-label">{t('schemes.instalments')}</div>
                </div>
                <div className="stat-card">
                  <FiClock size={20} color="var(--info)" style={{ margin: '0 auto 0.5rem' }} />
                  <div className="stat-value" style={{ fontSize: '1.1rem' }}>₹{s.instalment_amount?.toLocaleString()}</div>
                  <div className="stat-label">{t('schemes.perInstalment')}</div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>{t('schemes.eligibility')}</h4>
                <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '1.25rem' }}>
                  <li>{t('schemes.targetGroup')}: <strong>{s.target_occupation}s</strong></li>
                  <li>{t('schemes.validPAN')}</li>
                  <li>{t('schemes.verifiedGov')}</li>
                  {s.target_occupation === 'Farmer' && <li>{t('schemes.kisanCard')}</li>}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
