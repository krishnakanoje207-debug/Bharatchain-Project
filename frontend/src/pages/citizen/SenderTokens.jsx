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

        