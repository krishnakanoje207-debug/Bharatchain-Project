import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { FiRefreshCw, FiCheck, FiAlertTriangle, FiArrowRight, FiDollarSign } from 'react-icons/fi';

export default function VendorExchange() {
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBalance();
    const interval = setInterval(() => loadBalance(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const loadBalance = async (silent = false) => {
    if (!silent) setLoadingBalance(true);
    try {
      const res = await authFetch('/api/blockchain/wallet-info');
      const data = await res.json();
      setBalance(data.tokenBalance || '0');
    } catch (err) { console.error(err); }
    if (!silent) setLoadingBalance(false);
  };

  const requestExchange = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await authFetch('/api/blockchain/request-exchange', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Exchange request for ₹${amount} submitted! Admin will verify ITR, then RBI will transfer real INR to your bank account.`);
        setAmount('');
        loadBalance(true);
      } else {
        setError(data.error || 'Exchange request failed');
      }
    } catch (err) { setError('Exchange request failed. Please try again.'); }
    setLoading(false);
  };

