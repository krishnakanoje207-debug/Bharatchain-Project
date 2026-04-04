import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiSend, FiCheck, FiAlertTriangle, FiSearch, FiPhone } from 'react-icons/fi';

export default function SendTokens() {
  const { authFetch } = useAuth();
  const [vendorPhone, setVendorPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const lookupVendor = async () => {
    if (!vendorPhone || vendorPhone.length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setLookingUp(true);
    setError('');
    setVendor(null);
    try {
      const res = await authFetch('/api/blockchain/lookup-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorPhone })
      });
      const data = await res.json();
      if (data.verified) {
        setVendor(data);
      } else {
        setError(data.error || 'Vendor not found');
      }
    } catch (err) {
      setError('Failed to look up vendor');
    }
    setLookingUp(false);
  };

  const sendPayment = async () => {
    if (!vendor || !amount || parseFloat(amount) <= 0) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authFetch('/api/blockchain/pay-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorPhone, amount })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ Sent ₹${data.amountSent} to "${data.vendorName}". TX: ${data.txHash.slice(0,14)}... New balance: ₹${parseFloat(data.newBalance).toLocaleString()}`);
        setAmount('');
        setVendorPhone('');
        setVendor(null);
      } else {
        setError(data.error || 'Transfer failed');
      }
    } catch (err) {
      setError('Transfer failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '500px' }}>
        <div className="page-header">
          <h1 className="page-title">Pay Vendor</h1>
          <p className="page-subtitle">Send Digital Rupees to a government-verified vendor using their phone number</p>
        </div>

        {success && (
          <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <FiCheck style={{ marginRight: '0.5rem' }} />{success}
          </div>
        )}
        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <FiAlertTriangle style={{ marginRight: '0.5rem' }} />{error}
          </div>
        )}

        <div className="card" style={{ padding: '2rem' }}>
          {/* Phone Number Input */}
          <div className="form-group">
            <label className="form-label"><FiPhone size={14} style={{ marginRight: '0.5rem' }} />Vendor Phone Number</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="form-input"
                value={vendorPhone}
                onChange={e => { setVendorPhone(e.target.value.replace(/\D/g, '')); setVendor(null); setError(''); }}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
                style={{ flex: 1 }}
              />
              <button
                onClick={lookupVendor}
                className="btn btn-secondary"
                disabled={lookingUp || vendorPhone.length < 10}
                style={{ whiteSpace: 'nowrap' }}
              >
                <FiSearch size={14} /> {lookingUp ? 'Looking up...' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Vendor Info Card */}
          {vendor && (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1rem',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <FiCheck color="var(--success)" />
                <strong style={{ color: 'var(--success)', fontSize: '0.9rem' }}>Government-Verified Vendor</strong>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{vendor.vendorName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Type: {vendor.vendorType === 'FarmingSupplier' ? '🌾 Farming Supplier' : '🌽 Crop Buyer'}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="form-group">
            <label className="form-label">Amount (₹ Digital Rupees)</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="1"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={sendPayment}
            disabled={loading || !vendor || !amount || parseFloat(amount) <= 0}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
          >
            <FiSend /> {loading ? 'Processing...' : `Send ₹${amount || '0'} to ${vendor?.vendorName || 'Vendor'}`}
          </button>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>
            Tokens are transferred directly from your wallet to the vendor's wallet. Only government-approved vendors can receive payments.
          </p>
        </div>
      </div>
    </div>
  );
}
