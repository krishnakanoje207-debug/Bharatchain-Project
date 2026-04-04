import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiSend, FiCheck, FiAlertTriangle, FiSearch, FiPhone } from 'react-icons/fi';

export default function SendTokens() {
  const { authFetch } = useAuth();
  const [vendorPhone, setVendorPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const lookupVendor = async () => {
    if (!vendorPhone || vendorPhone.length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setLookingUp(true);
    setError('');
    setVendor(null);
    try {
      const res = await authFetch('/api/blockchain/lookup-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorPhone })
      });
      const data = await res.json();
      if (data.verified) {
        setVendor(data);
      } else {
        setError(data.error || 'Vendor not found');
      }
    } catch (err) {
      setError('Failed to look up vendor');
    }
    setLookingUp(false);
  };