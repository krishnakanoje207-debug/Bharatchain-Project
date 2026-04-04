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