import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../i18n/LanguageContext';
import { FiGrid, FiHash, FiClock, FiUsers, FiCheckCircle, FiShoppingBag, FiDollarSign, FiCreditCard, FiActivity, FiLock, FiShield } from 'react-icons/fi';

export default function AdminSidebar({ collapsed, onToggle}) {
    const { isRbiAdmin } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const path = location.pathname;

    const isActive = (route) => {
        if (route === '/admin-portal' && path === '/admin-portal') return true;
        if (route !== '/admin-portal' && path.startsWith(route)) return true;
        return false;  
     };

     const selections = [
        {
      links: [
        { to: '/admin-portal', icon: FiGrid, label: t('sidebar.overview'), exact: true },
      ]
    },
    {
      title: t('sidebar.identity'),
      links: [
        { to: '/admin-portal/schemes', icon: FiHash, label: t('admin.schemes') },
        { to: '/admin-portal/vendors', icon: FiClock, label: t('sidebar.pendingVendors') },
        { to: '/admin-portal/citizens', icon: FiUsers, label: t('sidebar.manageCitizens') },
      ]
    }, 
    {
      title: t('sidebar.verification'),
      links: [
        { to: '/admin-portal/citizens', icon: FiCheckCircle, label: t('sidebar.verifyBeneficiary') },
        { to: '/admin-portal/vendors', icon: FiShoppingBag, label: t('sidebar.verifyVendor') },
      ]
    },
    {
      title: t('sidebar.distribution'),
      links: [
        ...(isRbiAdmin ? [{ to: '/admin-portal/event-triggers', icon: FiDollarSign, label: t('sidebar.issueDigitalRupee') }] : []),
        { to: '/admin-portal/settlements', icon: FiCreditCard, label: t('sidebar.vendorSettlements') },
      ]
    },
    {
      title: t('sidebar.audit'),
      links: [
        { to: '/admin-portal/ledger', icon: FiActivity, label: t('sidebar.transactionLedger') },
      ]
    }
  ];

  return (
    <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <Link to="/admin-portal" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="sidebar-logo">
            <FiShield size={20} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>BharatChain</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
                {isRbiAdmin ? '⚡ RBI AUTHORITY' : '⚡ SYSTEM ADMIN'}
              </div>
            </div>
          )}
        </Link>
      </div> 

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section, si) => (
          <div key={si} className="sidebar-section">
            {section.title && !collapsed && (
              <div className="sidebar-section-title">{section.title}</div>
            )}
            {section.links.map((link, li) => (
              <Link
                key={li}
                to={link.to}
                className={`sidebar-link ${isActive(link.to) ? 'active' : ''}`}
                title={collapsed ? link.label : undefined}
              >
                <link.icon size={16} />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="sidebar-footer">
          <FiLock size={12} style={{ color: 'var(--success)' }} />
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>{t('sidebar.secureAccess')}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{t('sidebar.encryptedDash')}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{t('sidebar.digitalRupee')}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
