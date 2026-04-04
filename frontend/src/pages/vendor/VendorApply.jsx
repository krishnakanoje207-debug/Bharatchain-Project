import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCheck } from 'react-icons/fi';

export default function VendorApply() {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [existingApp, setExistingApp] = useState(null);

  const [businessName, setBusinessName] = useState('');
  const [vendorType, setVendorType] = useState('FarmingSupplier');
  const [credential, setCredential] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  useEffect(() => {
    authFetch('/api/verify/my-vendor-status').then(r => r.json()).then(d => {
      if (d.application) setExistingApp(d.application);
      if (d.walletAddress) setWalletAddress(d.walletAddress);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await authFetch('/api/verify/vendor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, vendorType, credential, bankAccount, ifsc })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      setWalletAddress(data.walletAddress);
      setExistingApp({ status: 'Pending', business_name: businessName });
    } catch (err) { setError(err.message); }
    setLoading(false);
  };