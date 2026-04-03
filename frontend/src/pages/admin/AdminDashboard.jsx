import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiUsers, FiShoppingBag, FiFileText, FiClock, FiActivity, FiArrowRight } from 'react-icons/fi';

const ACTIVITY_ICONS = {
  'CitizenToVendor': '🛒',
  'TokenAllocation': '💰',
  'TokenRevocation': '🔥',
  'VendorExchange': '💱',
  'TokenMint': '🏭',
  'instalment': '⚡',
};

export default function AdminDashboard() {
  const { authFetch, isRbiAdmin } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('schemes'); // 'schemes' or 'activities'

  useEffect(() => {
    Promise.all([
      authFetch('/api/admin/stats').then(r => r.json()),
      authFetch('/api/admin/recent-activities?limit=20').then(r => r.json()),
    ]).then(([statsData, actData]) => {
      setStats(statsData.stats);
      setActivities(actData.activities || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>;

  
