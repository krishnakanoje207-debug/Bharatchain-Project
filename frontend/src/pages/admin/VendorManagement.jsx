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

  