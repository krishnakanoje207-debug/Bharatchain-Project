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