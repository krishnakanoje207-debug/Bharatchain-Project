import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCalendar, FiClock, FiRefreshCw, FiPlus, FiAlertTriangle } from 'react-icons/fi';

export default function EventTriggers() {
  const { authFetch } = useAuth();
  const [triggers, setTriggers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ schemeId: '', date: '', time: '' });
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(null);
  const [now, setNow] = useState(new Date());
  const pollRef = useRef(null);
  const clockRef = useRef(null);

  useEffect(() => {
    loadData();
    pollRef.current = setInterval(() => loadData(true), 30000);
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(clockRef.current); };
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [trigRes, schRes] = await Promise.all([
        authFetch('/api/admin/event-triggers'),
        authFetch('/api/admin/schemes')
      ]);
      const trigData = await trigRes.json();
      const schData = await schRes.json();
      setTriggers(trigData.triggers || []);
      setSchemes(schData.schemes || []);
    } catch (err) { console.error(err); }
    if (!silent) setLoading(false);
  };

  const scheduleTrigger = async () => {
    if (!form.schemeId || !form.date || !form.time) return;
    try {
      await authFetch('/api/admin/event-triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemeId: form.schemeId, scheduledDate: form.date, scheduledTime: form.time })
      });
      setForm({ schemeId: '', date: '', time: '' });
      setShowForm(false);
      loadData(true);
    } catch (err) { console.error(err); }
  };

  const retryTrigger = async (id) => {
    try {
      await authFetch(`/api/admin/event-triggers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToScheduled: true })
      });
      loadData(true);
    } catch (err) { console.error(err); }
  };