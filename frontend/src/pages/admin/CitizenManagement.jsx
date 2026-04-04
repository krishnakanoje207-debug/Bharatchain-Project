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