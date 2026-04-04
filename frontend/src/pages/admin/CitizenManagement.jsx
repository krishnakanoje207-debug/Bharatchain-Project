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