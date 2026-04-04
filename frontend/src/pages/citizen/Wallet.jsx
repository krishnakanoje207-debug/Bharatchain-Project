import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FiCopy, FiCheck, FiRefreshCw } from 'react-icons/fi';

export default function Wallet() {
  const { authFetch } = useAuth();
  const [balance, setBalance] = useState('0');
  const [wallet, setWallet] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWallet();
    // Poll for balance updates every 15s
    const interval = setInterval(() => loadWallet(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const loadWallet = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await authFetch('/api/blockchain/wallet-info');
      const data = await res.json();
      setWallet(data.wallet);
      setBalance(data.tokenBalance || '0');
    } catch (err) { console.error(err); }
    if (!silent) setLoading(false);
  };

  const copyAddress = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading wallet...</p></div>;

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: '500px' }}>
        <div className="page-header flex-between">
          <h1 className="page-title">My Wallet</h1>
          <button onClick={() => loadWallet()} className="btn btn-secondary btn-sm"><FiRefreshCw size={12} /> Refresh</button>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Digital Rupee Balance</p>
          <div style={{ fontSize: '3rem', fontWeight: 800 }} className="gradient-text">₹{parseFloat(balance).toLocaleString()}</div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>INRD Tokens</p>
        </div>

        {wallet && (
          <div className="card mt-2">
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Wallet Address</p>
            <div className="flex-between" style={{ background: 'var(--bg-glass)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
              <span className="mono truncate" style={{ fontSize: '0.8rem' }}>{wallet}</span>
              <button onClick={copyAddress} className="btn btn-sm btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
