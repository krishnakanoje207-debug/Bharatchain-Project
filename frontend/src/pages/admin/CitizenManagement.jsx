import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCheck, FiX, FiFilter } from 'react-icons/fi';

export default function CitizenManagement() {
  const { authFetch } = useAuth();
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => { loadApps(); }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/citizens');
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const approve = async (id) => {
    setActionMsg('');
    try {
      const res = await authFetch(`/api/admin/citizens/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`✅ ${data.message}`);
      loadApps();
    } catch (err) { setActionMsg(`❌ ${err.message}`); }
  };

  const reject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setActionMsg('');
    try {
      const res = await authFetch(`/api/admin/citizens/${id}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`✅ Application rejected. Notification sent.`);
      loadApps();
    } catch (err) { setActionMsg(`❌ ${err.message}`); }
  };

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);
  const counts = { all: applications.length, Pending: applications.filter(a => a.status === 'Pending').length, Approved: applications.filter(a => a.status === 'Approved').length, Rejected: applications.filter(a => a.status === 'Rejected').length };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading applications...</p></div>;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Citizen Applications</h1>
          <p className="page-subtitle">Review, approve, or reject citizen welfare applications</p>
        </div>

        {actionMsg && <div style={{ padding: '1rem', background: actionMsg.startsWith('✅') ? 'var(--success-bg)' : 'var(--error-bg)', color: actionMsg.startsWith('✅') ? 'var(--success)' : 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>{actionMsg}</div>}

        {/* Filter tabs */}
        <div className="flex gap-1" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['all', 'Pending', 'Approved', 'Rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
              {f === 'all' ? 'All' : f} ({counts[f] || 0})
            </button>
          ))}
        </div>

         {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No applications found</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Phone</th><th>PAN</th><th>Occupation</th><th>Scheme</th><th>Status</th><th>Applied</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(app => (
                    <tr key={app.id}>
                      <td>#{app.id}</td>
                      <td style={{ fontWeight: 600 }}>{app.citizen_name || app.user_name}</td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{app.phone || app.user_phone}</td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{app.pan}</td>
                      <td>{app.occupation}</td>
                      <td style={{ fontSize: '0.8rem' }}>{app.scheme_name}</td>
                      <td>
                        <span className={`badge ${app.status === 'Approved' ? 'badge-success' : app.status === 'Rejected' ? 'badge-error' : 'badge-warning'}`}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(app.applied_at).toLocaleDateString()}</td>
                      <td>
                        {app.status === 'Pending' ? (
                          <div className="flex gap-1">
                            <button onClick={() => approve(app.id)} className="btn btn-sm btn-success" title="Approve"><FiCheck size={12} /></button>
                            <button onClick={() => reject(app.id)} className="btn btn-sm btn-secondary" title="Reject" style={{ color: 'var(--error)' }}><FiX size={12} /></button>
                          </div>
                        ) : app.status === 'Rejected' ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} title={app.rejection_reason}>Reason: {(app.rejection_reason || '').slice(0, 30)}...</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
