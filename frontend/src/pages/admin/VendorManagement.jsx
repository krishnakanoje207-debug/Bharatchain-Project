import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCheck, FiX, FiDollarSign } from 'react-icons/fi';

export default function VendorManagement() {
  const { authFetch, isRbiAdmin, isAdmin } = useAuth();
  const [govVendors, setGovVendors] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [tab, setTab] = useState('applications');

  useEffect(() => { loadVendors(); }, []);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/vendors');
      const data = await res.json();
      setGovVendors(data.vendors || []);
      setApplications(data.applications || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const approveVendor = async (app) => {
    setActionMsg('');
    try {
      const res = await authFetch(`/api/admin/vendors/${app.id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`✅ Vendor "${app.business_name}" approved!`);
      loadVendors();
    } catch (err) { setActionMsg(`❌ ${err.message}`); }
  };

 const rejectVendor = async (app) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    setActionMsg('');
    try {
      const res = await authFetch(`/api/admin/vendors/${app.id}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`✅ Vendor rejected. Notification sent.`);
      loadVendors();
    } catch (err) { setActionMsg(`❌ ${err.message}`); }
  };

  const confirmTransfer = async (vendor) => {
    const amount = prompt(`Enter RBI transfer amount for "${vendor.business_name}" (${vendor.user_name}):`, '1000');
    if (!amount) return;
    setActionMsg('');
    try {
      const res = await authFetch(`/api/admin/confirm-transfer/${vendor.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, transactionRef: `RBI-TXN-${Date.now()}` })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActionMsg(`✅ RBI transfer confirmed — ₹${amount} to "${data.vendor?.businessName || vendor.business_name}". ${data.tokensBurned ? 'Tokens revoked on-chain! 🔥' : 'No tokens to revoke.'}`);
      loadVendors();
    } catch (err) { setActionMsg(`❌ ${err.message}`); }
  };

  const pendingApps = applications.filter(a => a.status === 'Pending');
  const approvedApps = applications.filter(a => a.status === 'Approved');
  const rejectedApps = applications.filter(a => a.status === 'Rejected');

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading vendors...</p></div>;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Vendor Management</h1>
          <p className="page-subtitle">{isRbiAdmin ? 'Verify ITR and confirm RBI transfers' : 'Approve vendor applications and manage vendors'}</p>
        </div>

        {actionMsg && <div style={{ padding: '1rem', background: actionMsg.startsWith('✅') ? 'var(--success-bg)' : 'var(--error-bg)', color: actionMsg.startsWith('✅') ? 'var(--success)' : 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>{actionMsg}</div>}

        {/* Tab switcher */}
        <div className="flex gap-1" style={{ marginBottom: '1.5rem' }}>
          <button onClick={() => setTab('applications')} className={`btn btn-sm ${tab === 'applications' ? 'btn-primary' : 'btn-secondary'}`}>
            Applications ({applications.length}) {pendingApps.length > 0 && <span className="badge" style={{ background: 'var(--error)', color: 'white', marginLeft: '4px', fontSize: '0.65rem' }}>{pendingApps.length}</span>}
          </button>
          <button onClick={() => setTab('govdb')} className={`btn btn-sm ${tab === 'govdb' ? 'btn-primary' : 'btn-secondary'}`}>Approved Vendors ({govVendors.length})</button>
        </div>

        {/* Vendor Applications Tab */}
        {tab === 'applications' && (
          applications.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-secondary)' }}>No vendor applications yet</p></div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>#</th><th>Business</th><th>Type</th><th>Applicant</th><th>Phone</th><th>Wallet</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {applications.map(a => (
                      <tr key={a.id}>
                        <td>{a.id}</td>
                        <td style={{ fontWeight: 600 }}>{a.business_name}</td>
                        <td><span className="badge badge-info">{a.vendor_type}</span></td>
                        <td>{a.user_name}</td>
                        <td className="mono" style={{ fontSize: '0.8rem' }}>{a.user_phone}</td>
                        <td className="mono" style={{ fontSize: '0.7rem' }}>{a.wallet_address ? `${a.wallet_address.slice(0,10)}...` : '—'}</td>
                        <td>
                          <span className={`badge ${a.status === 'Approved' ? 'badge-success' : a.status === 'Rejected' ? 'badge-error' : 'badge-warning'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          {a.status === 'Pending' && isAdmin ? (
                            <div className="flex gap-1">
                              <button onClick={() => approveVendor(a)} className="btn btn-sm btn-success" title="Approve"><FiCheck size={12} /> Approve</button>
                              <button onClick={() => rejectVendor(a)} className="btn btn-sm btn-secondary" title="Reject" style={{ color: 'var(--error)' }}><FiX size={12} /></button>
                            </div>
                          ) : a.status === 'Rejected' ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(a.rejection_reason || '').slice(0, 30)}...</span>
                          ) : a.status === 'Approved' && isRbiAdmin ? (
                            <button onClick={() => confirmTransfer(a)} className="btn btn-sm btn-success"><FiDollarSign size={12} /> Transfer</button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

         {/* Gov DB Tab — shows only manually approved vendors */}
        {tab === 'govdb' && (
          govVendors.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}><p style={{ color: 'var(--text-secondary)' }}>No approved vendors yet — vendors appear here after admin approval</p></div>
          ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Business</th><th>Type</th><th>Owner</th><th>Bank A/C</th><th>IFSC</th><th>Credential</th></tr></thead>
                <tbody>
                  {govVendors.map(v => (
                    <tr key={v.id}>
                      <td>{v.id}</td>
                      <td style={{ fontWeight: 600 }}>{v.business_name}</td>
                      <td><span className="badge badge-info">{v.vendor_type}</span></td>
                      <td>{v.owner_name}</td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{v.bank_account}</td>
                      <td className="mono" style={{ fontSize: '0.8rem' }}>{v.ifsc_code}</td>
                      <td><span className="badge badge-success">{v.degree || v.itr_status || 'Verified'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        )}
      </div>
    </div>
  );
}
