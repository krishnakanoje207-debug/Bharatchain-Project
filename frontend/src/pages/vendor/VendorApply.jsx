import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCheck } from 'react-icons/fi';

export default function VendorApply() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [existingApp, setExistingApp] = useState(null);

  const [businessName, setBusinessName] = useState('');
  const [vendorType, setVendorType] = useState('FarmingSupplier');
  const [credential, setCredential] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  useEffect(() => {
    authFetch('/api/verify/my-vendor-status').then(r => r.json()).then(d => {
      if (d.application) setExistingApp(d.application);
      if (d.walletAddress) setWalletAddress(d.walletAddress);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/verify/vendor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, vendorType, credential, bankAccount, ifsc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      setWalletAddress(data.walletAddress);
      setExistingApp({ status: 'Pending', business_name: businessName });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

   // Show existing application status
  if (existingApp) {
    const statusColors = { Pending: 'var(--warning)', Approved: 'var(--success)', Rejected: 'var(--error)' };
    return (
      <div className="page fade-in">
        <div className="container" style={{ maxWidth: '540px' }}>
          <div className="page-header"><h1 className="page-title">Vendor Application</h1></div>
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: existingApp.status === 'Approved' ? 'var(--success-bg)' : existingApp.status === 'Pending' ? 'rgba(255,193,7,0.1)' : 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <FiCheck size={30} color={statusColors[existingApp.status]} />
            </div>
            <h3 style={{ color: statusColors[existingApp.status] }}>
              {existingApp.status === 'Pending' ? 'Application Pending ⏳' : existingApp.status === 'Approved' ? 'Application Approved ✓' : 'Application Rejected ✗'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {existingApp.status === 'Pending' ? 'Your vendor application is under review by the admin team.' :
               existingApp.status === 'Approved' ? 'You are now a verified vendor! You can accept Digital Rupee payments.' :
               `Reason: ${existingApp.rejection_reason || 'Did not meet criteria'}`}
            </p>
            {walletAddress && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-Generated Wallet:</p>
                <p className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', wordBreak: 'break-all' }}>{walletAddress}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '540px' }}>
        <div className="page-header"><h1 className="page-title">Apply for Vendor Approval</h1></div>

        {success && <div style={{ padding: '1rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiCheck /> {success}</div>}
        {error && <div style={{ padding: '1rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>{error}</div>}

        <div style={{ padding: '0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
          ℹ️ No MetaMask needed! Your blockchain wallet is automatically generated when you apply.
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          <div className="form-group"><label className="form-label">Business Name *</label><input className="form-input" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Green Farm Supplies" required /></div>
          <div className="form-group"><label className="form-label">Vendor Type *</label>
            <select className="form-select" value={vendorType} onChange={e => setVendorType(e.target.value)}>
              <option value="FarmingSupplier">Farming Supplier (seeds, fertilizer, equipment)</option>
              <option value="CropBuyer">Crop Buyer (grain, produce, export)</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Credential / Degree *</label><input className="form-input" value={credential} onChange={e => setCredential(e.target.value)} placeholder="e.g. BSc Agriculture, License #MP/AGR/2023/001" required /></div>
          <div className="form-group"><label className="form-label">Bank Account Number *</label><input className="form-input" value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="e.g. 1234567890" required /></div>
          <div className="form-group"><label className="form-label">IFSC Code *</label><input className="form-input" value={ifsc} onChange={e => setIfsc(e.target.value)} placeholder="e.g. SBIN0001234" required /></div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Banking details are hashed on-chain. Your application will be reviewed by the admin team.</p>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>{loading ? 'Submitting...' : 'Submit Vendor Application'}</button>
        </form>
      </div>
    </div>
  );
}
