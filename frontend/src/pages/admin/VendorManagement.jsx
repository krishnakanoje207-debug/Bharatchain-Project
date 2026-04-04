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

  