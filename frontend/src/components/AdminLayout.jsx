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
