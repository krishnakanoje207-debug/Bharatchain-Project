import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { useState, useEffect } from 'react';
import { FiFileText, FiRefreshCw, FiCopy, FiBell } from 'react-icons/fi';

export default function VendorDashboard() {
  const { user, authFetch } = useAuth();
  const { t } = useLanguage();
  const [vendorApp, setVendorApp] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => refreshBalance(), 15000);
    return () => clearInterval(interval);
  }, []);

  const refreshBalance = async () => {
    try {
      const walletRes = await authFetch('/api/blockchain/wallet-info');
      const walletData = await walletRes.json();
      setTokenBalance(walletData.tokenBalance || '0');
    } catch (err) { console.error(err); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const statusRes = await authFetch('/api/verify/my-vendor-status');
      const statusData = await statusRes.json();
      setVendorApp(statusData.application);
      setWallet(statusData.walletAddress);

      const walletRes = await authFetch('/api/blockchain/wallet-info');
      const walletData = await walletRes.json();
      setTokenBalance(walletData.tokenBalance || '0');

      const notifRes = await authFetch('/api/verify/notifications');
      const notifData = await notifRes.json();
      setNotifications(notifData.notifications || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  