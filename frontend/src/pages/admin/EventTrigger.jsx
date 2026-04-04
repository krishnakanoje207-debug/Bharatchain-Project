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

  const executeTrigger = async (id) => {
    if (!window.confirm('Execute this trigger now? This will distribute tokens to all approved citizens on-chain.')) return;
    setExecuting(id);
    try {
      const res = await authFetch(`/api/admin/event-triggers/${id}/execute`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.message}`);
      } else {
        alert(`❌ ${data.error || 'Execution failed'}`);
      }
      loadData(true);
    } catch (err) {
      console.error(err);
      alert('❌ Network error during execution');
    }
    setExecuting(null);
  };

   const getCountdown = (trigger) => {
    const target = new Date(`${trigger.scheduled_date}T${trigger.scheduled_time}`);
    const diff = target - now;
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const stats = {
    total: triggers.length,
    scheduled: triggers.filter(t => t.status === 'Scheduled').length,
    executed: triggers.filter(t => t.status === 'Executed').length,
    failed: triggers.filter(t => t.status === 'Failed').length
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading...</p></div>;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">Event Triggers</h1>
            <p className="page-subtitle">Schedule lump-sum token distribution — triggers execute automatically at the set time</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => loadData()} className="btn btn-secondary btn-sm"><FiRefreshCw size={12} /> Refresh</button>
            <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm"><FiPlus size={12} /> Schedule Trigger</button>
          </div>
        </div>

        {/* Auto-execution info */}
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>🤖 Automatic Execution:</strong> All scheduled triggers fire automatically when the set date and time arrives. The server checks every 60 seconds. No manual action needed.
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{stats.total}</div><div className="stat-label">Total Triggers</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.scheduled}</div><div className="stat-label">Scheduled</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--success)' }}>{stats.executed}</div><div className="stat-label">Executed</div></div>
          <div className="stat-card"><div className="stat-value" style={{ color: 'var(--error)' }}>{stats.failed}</div><div className="stat-label">Failed</div></div>
        </div>

        {/* Schedule Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Schedule New Distribution</h3>
            <div className="grid-3" style={{ gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Scheme</label>
                <select className="form-input" value={form.schemeId} onChange={e => setForm({ ...form, schemeId: e.target.value })}>
                  <option value="">Select scheme</option>
                  {schemes.map(s => <option key={s.id} value={s.id}>{s.name} (₹{s.per_citizen_amount})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label"><FiCalendar size={12} /> Date</label>
                <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label"><FiClock size={12} /> Time</label>
                <input type="time" className="form-input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <button onClick={scheduleTrigger} className="btn btn-primary mt-1" disabled={!form.schemeId || !form.date || !form.time}>
              Schedule Distribution
            </button>
          </div>
        )}

