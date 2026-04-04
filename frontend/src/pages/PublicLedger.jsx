import { useState, useEffect } from 'react';
import { FiSearch, FiExternalLink, FiRefreshCw, FiDatabase, FiLink } from 'react-icons/fi';
import { useWallet } from '../hooks/useWallet';
import { useContract } from '../hooks/useContract';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import { formatEther } from 'ethers';
import { BLOCK_EXPLORER } from '../config/chains';

const TX_TYPE_LABELS = ['🏭 Token Mint', '💰 Allocation', '🛒 Citizen→Vendor', '💱 Vendor Exchange', '🔥 Token Revocation'];
const TX_TYPE_COLORS = ['var(--info)', 'var(--success)', 'var(--accent-primary)', 'var(--warning)', 'var(--error)'];
const DB_TX_TYPE_MAP = { TokenMint: 0, TokenAllocation: 1, CitizenToVendor: 2, VendorExchange: 3, TokenRevocation: 4 };

export default function PublicLedger() {
  const { provider } = useWallet();
  const { authFetch } = useAuth();
  const { t } = useLanguage();
  const ledger = useContract('TransactionLedger', provider);
  const [transactions, setTransactions] = useState([]);
  const [totalTx, setTotalTx] = useState(0);
  const [privateTx, setPrivateTx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('auto');

  useEffect(() => { loadTransactions(); }, [ledger, source]);

  const loadTransactions = async () => {
    setLoading(true);
    let onChainTxns = [];
    if (ledger && source !== 'db') {
      try {
        const [publicTx, total, pvt] = await Promise.all([ledger.getPublicTransactions(), ledger.getTotalTransactionCount(), ledger.getPrivateTransactionCount()]);
        onChainTxns = publicTx.map(tx => ({ id: Number(tx.id), type: Number(tx.txType), from: tx.from, to: tx.to, amount: formatEther(tx.amount), timestamp: new Date(Number(tx.timestamp) * 1000).toLocaleString(), description: tx.description, source: 'chain' }));
        setTotalTx(Number(total)); setPrivateTx(Number(pvt));
      } catch (err) { console.error('Failed to load on-chain ledger:', err); }
    }
    let dbTxns = [];
    if (source !== 'chain') {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/ledger/transactions?limit=200`);
        const data = await res.json();
        dbTxns = (data.transactions || []).map((tx) => ({ id: `db-${tx.id}`, type: DB_TX_TYPE_MAP[tx.tx_type] ?? 3, from: tx.from_address || '0x0000000000000000000000000000000000000000', to: tx.to_address || '0x0000000000000000000000000000000000000000', amount: String(tx.amount), timestamp: new Date(tx.created_at).toLocaleString(), description: tx.description, txHash: tx.tx_hash, source: 'db' }));
        if (onChainTxns.length === 0) { setTotalTx(data.total || dbTxns.length); setPrivateTx(0); }
      } catch (err) { console.error('Failed to load DB ledger:', err); }
    }
    let merged;
    if (source === 'chain') merged = onChainTxns;
    else if (source === 'db') merged = dbTxns;
    else {
      merged = onChainTxns.length > 0 ? onChainTxns : dbTxns;
      if (onChainTxns.length > 0 && dbTxns.length > 0) {
        const chainTxSet = new Set(onChainTxns.map(t => t.description));
        merged = [...onChainTxns, ...dbTxns.filter(t => !chainTxSet.has(t.description))];
      }
    }
    setTransactions(merged);
    setLoading(false);
  };

  const truncAddr = (addr) => addr === '0x0000000000000000000000000000000000000000' ? '🏛 System' : `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{t('ledger.title')}</h1>
          <p className="page-subtitle">{t('ledger.subtitle')}</p>
        </div>

        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          <div className="stat-card"><div className="stat-value">{totalTx}</div><div className="stat-label">{t('ledger.totalTx')}</div></div>
          <div className="stat-card"><div className="stat-value">{transactions.length}</div><div className="stat-label">{t('ledger.visibleTx')}</div></div>
          <div className="stat-card"><div className="stat-value">{privateTx}</div><div className="stat-label">{t('ledger.privateTx')}</div></div>
        </div>

        <div className="flex gap-1" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
          <button onClick={() => setSource('auto')} className={`btn btn-sm ${source === 'auto' ? 'btn-primary' : 'btn-secondary'}`}>🔄 Auto</button>
          <button onClick={() => setSource('chain')} className={`btn btn-sm ${source === 'chain' ? 'btn-primary' : 'btn-secondary'}`} disabled={!provider}><FiLink size={12} /> On-Chain</button>
          <button onClick={() => setSource('db')} className={`btn btn-sm ${source === 'db' ? 'btn-primary' : 'btn-secondary'}`}><FiDatabase size={12} /> Database</button>
          <button onClick={loadTransactions} className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }}><FiRefreshCw size={12} /> {t('ledger.refresh')}</button>
        </div>

        {loading ? (
          <div className="loading-overlay"><div className="spinner" /><p>{t('common.loading')}</p></div>
        ) : transactions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              {source === 'chain' && !provider ? t('ledger.connectWallet') : t('ledger.noTx')}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>ID</th><th>Type</th><th>From</th><th>To</th><th>Amount (₹D)</th><th>Time</th><th>Source</th></tr></thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="mono">#{typeof tx.id === 'string' ? tx.id.replace('db-', '') : tx.id}</td>
                      <td><span className="badge" style={{ background: `${TX_TYPE_COLORS[tx.type]}20`, color: TX_TYPE_COLORS[tx.type] }}>{TX_TYPE_LABELS[tx.type]}</span></td>
                      <td className="mono">{truncAddr(tx.from)}</td>
                      <td className="mono">{truncAddr(tx.to)}</td>
                      <td style={{ fontWeight: 600 }}>₹{parseFloat(tx.amount).toLocaleString()}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tx.timestamp}</td>
                      <td>
                        <span className="badge" style={{ background: tx.source === 'chain' ? 'var(--success-bg)' : 'var(--info-bg, #e4f0ff)', color: tx.source === 'chain' ? 'var(--success)' : 'var(--info)', fontSize: '0.65rem' }}>
                          {tx.source === 'chain' ? '⛓ Chain' : '🗄 DB'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
