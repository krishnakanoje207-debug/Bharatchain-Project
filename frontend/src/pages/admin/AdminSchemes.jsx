import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiPlus, FiTrash2, FiEdit, FiUsers } from 'react-icons/fi';

export default function AdminSchemes() {
  const { authFetch, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', totalFund: '', perCitizenAmount: '', instalmentCount: '1', targetOccupation: 'Farmer', status: 'Active' });
  const [msg, setMsg] = useState('');

  useEffect(() => { loadSchemes(); }, []);

  const loadSchemes = async () => {
    try {
      const res = await authFetch('/api/admin/schemes');
      const data = await res.json();
      setSchemes(data.schemes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createScheme = async () => {
    const totalFund = parseFloat(form.totalFund);
    const perCitizen = parseFloat(form.perCitizenAmount);
    const instCount = parseInt(form.instalmentCount) || 1;
    if (!form.name || !totalFund || !perCitizen) return setMsg('❌ Fill all required fields');
    try {
      const res = await authFetch('/api/admin/schemes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description, totalFund, perCitizenAmount: perCitizen, instalmentCount: instCount, targetOccupation: form.targetOccupation, status: form.status })
      });
      const data = await res.json();
      setMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`);
      if (res.ok) { setShowForm(false); setForm({ name: '', description: '', totalFund: '', perCitizenAmount: '', instalmentCount: '1', targetOccupation: 'Farmer', status: 'Active' }); loadSchemes(); }
    } catch (e) { setMsg(`❌ ${e.message}`); }
  };

  const deleteScheme = async (id, name) => {
    if (!confirm(`Delete scheme "${name}"? This cannot be undone.`)) return;
    try {
      const res = await authFetch(`/api/admin/schemes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      setMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`);
      if (res.ok) loadSchemes();
    } catch (e) { setMsg(`❌ ${e.message}`); }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      const res = await authFetch(`/api/admin/schemes/${id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      setMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`);
      if (res.ok) loadSchemes();
    } catch (e) { setMsg(`❌ ${e.message}`); }
  };

  const statusColor = (s) => s === 'Active' ? 'badge-success' : s === 'Upcoming' ? 'badge-info' : 'badge-warning';

   if (loading) return <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">{t('admin.schemes')}</h1>
            <p className="page-subtitle">{t('schemes.manage')}</p>
          </div>
          {isAdmin && <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm"><FiPlus size={14} /> {t('schemes.createNew')}</button>}
        </div>

        {msg && <div style={{ padding: '0.75rem', background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--error-bg)', color: msg.startsWith('✅') ? 'var(--success)' : 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>{msg}</div>}

        {/* Create Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>{t('schemes.createTitle')}</h3>
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group"><label className="form-label">{t('schemes.name')} *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">{t('schemes.targetOcc')}</label>
                <select className="form-input" value={form.targetOccupation} onChange={e => setForm({...form, targetOccupation: e.target.value})}>
                  <option value="Farmer">Farmer</option><option value="Labourer">Labourer</option><option value="All">All</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Total Fund (₹) *</label><input type="number" className="form-input" value={form.totalFund} onChange={e => setForm({...form, totalFund: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Per Citizen (₹) *</label><input type="number" className="form-input" value={form.perCitizenAmount} onChange={e => setForm({...form, perCitizenAmount: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">{t('schemes.instalments')}</label><input type="number" className="form-input" value={form.instalmentCount} onChange={e => setForm({...form, instalmentCount: e.target.value})} min="1" /></div>
              <div className="form-group">
                <label className="form-label">{t('schemes.status')} *</label>
                <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="Active">{t('status.active')}</option>
                  <option value="Upcoming">{t('status.upcoming')}</option>
                  <option value="Completed">{t('status.completed')}</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">{t('schemes.description')}</label><textarea className="form-input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="flex gap-1">
              <button onClick={createScheme} className="btn btn-primary">{t('schemes.create')}</button>
              <button onClick={() => setShowForm(false)} className="btn btn-secondary">{t('schemes.cancel')}</button>
            </div>
          </div>
        )}
        {/* Scheme Cards */}
        {schemes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-secondary)' }}>{t('schemes.noSchemes')}</p></div>
        ) : (
          schemes.map(s => (
            <div key={s.id} className="card mb-2" style={{ padding: '2rem', borderLeft: `4px solid ${s.status === 'Active' ? 'var(--success)' : s.status === 'Upcoming' ? 'var(--info)' : 'var(--text-muted)'}` }}>
              <div className="flex-between" style={{ marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div className="flex gap-1" style={{ alignItems: 'center' }}>
                  <span className={`badge ${statusColor(s.status)}`}>{s.status}</span>
                  <h2 style={{ fontSize: '1.25rem' }}>{s.name}</h2>
                </div>
                <div className="flex gap-1" style={{ alignItems: 'center' }}>
                  <span className="badge badge-info"><FiUsers size={10} /> {s.beneficiary_count || 0} {t('admin.beneficiaries')}</span>
                  {isAdmin && (
                    <>
                      <select
                        value={s.status}
                        onChange={e => changeStatus(s.id, e.target.value)}
                        className="form-input"
                        style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        <option value="Active">{t('status.active')}</option>
                        <option value="Upcoming">{t('status.upcoming')}</option>
                        <option value="Completed">{t('status.completed')}</option>
                      </select>
                      <button onClick={() => deleteScheme(s.id, s.name)} className="btn btn-sm btn-danger" title={t('schemes.delete')}><FiTrash2 size={12} /></button>
                    </>
                  )}
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '700px', fontSize: '0.9rem' }}>{s.description}</p>
              <div className="grid-4" style={{ marginTop: '1rem' }}>
                <div className="stat-card"><div className="stat-value" style={{ fontSize: '1.2rem' }}>₹{(s.total_fund/10000000).toFixed(2)} Cr</div><div className="stat-label">{t('schemes.totalFund')}</div></div>
                <div className="stat-card"><div className="stat-value" style={{ fontSize: '1.2rem' }}>₹{s.per_citizen_amount?.toLocaleString()}</div><div className="stat-label">{t('schemes.perCitizen')}</div></div>
                <div className="stat-card"><div className="stat-value" style={{ fontSize: '1.2rem' }}>{s.instalment_count} × ₹{s.instalment_amount?.toLocaleString()}</div><div className="stat-label">{t('schemes.instalments')}</div></div>
                <div className="stat-card"><div className="stat-value" style={{ fontSize: '1.2rem' }}>{s.current_instalment || 0}/{s.instalment_count}</div><div className="stat-label">{t('common.currentInstalment')}</div></div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
