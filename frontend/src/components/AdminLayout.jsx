import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { FiMenu, FiLogOut, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout, isRbiAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="admin-layout">
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn btn-sm btn-secondary"
              style={{ padding: '0.4rem' }}
            >
              <FiMenu size={16} />
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isRbiAdmin ? '⚡ RBI AUTHORITY' : '🏛 SYSTEM ADMIN'} • Anti-Corruption CBDC Distribution Console
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle />
            <LanguageToggle />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 0.5rem' }}>{user?.name}</span>
            <button onClick={handleLogout} className="btn btn-sm btn-secondary" title={t('nav.logout')}>
              <FiLogOut size={14} />
            </button>
          </div>
        </header>
        {/* Main content */}
        <div className="admin-content">
            {children}
        </div>
        </div>
    </div>
    );
}