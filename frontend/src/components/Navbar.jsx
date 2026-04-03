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
       