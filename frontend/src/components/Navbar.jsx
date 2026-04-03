import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import WalletButton from './WalletButton';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { FiLogOut } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav style={{
      background: 'rgba(10, 14, 26, 0.95)',
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 100
    }}> 
      <div className="container flex-between" style={{ height: '64px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>₹</div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>BharatChain</span>
        </Link>
        <div className="flex gap-2" style={{ alignItems: 'center' }}>
          <Link to="/schemes" className="btn btn-sm btn-secondary">{t('nav.schemes')}</Link>
          <Link to="/ledger" className="btn btn-sm btn-secondary">{t('nav.publicLedger')}</Link>
          <ThemeToggle />
          <LanguageToggle />
          {!user ? (
            <>
              <Link to="/login" className="btn btn-sm btn-secondary">{t('nav.login')}</Link>
              <Link to="/signup" className="btn btn-sm btn-primary">{t('nav.signup')}</Link>
            </>
          ) : (
            <>
              {user.role === 'citizen' && <Link to="/citizen" className="btn btn-sm btn-secondary">{t('nav.dashboard')}</Link>}
              {user.role === 'vendor' && <Link to="/vendor" className="btn btn-sm btn-secondary">{t('nav.dashboard')}</Link>}
              <WalletButton />
              <button onClick={handleLogout} className="btn btn-sm btn-secondary" title={t('nav.logout')}><FiLogOut size={14} /></button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 