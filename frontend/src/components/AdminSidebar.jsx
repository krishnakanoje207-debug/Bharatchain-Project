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
    