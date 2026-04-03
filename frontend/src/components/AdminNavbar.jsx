import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FiHome, FiShoppingBag, FiUsers, FiFileText, FiClock, FiActivity, FiLogOut, FiShield } from 'react-icons/fi';

export default function AdminNavbar() {
    const { user, logout, isRbiAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => { logout(); navigate('/'); }; 

    return (
        <nav style={{
      background: 'rgba(10, 14, 26, 0.98)',
      borderBottom: '2px solid rgba(255, 153, 51, 0.3)',
      backdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 100
    }}>
        <div className="container flex-between" style={{height: '64px'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/admin-portal" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <FiShield size={22} color="var(--saffron)" />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--saffron)' }}>
              {isRbiAdmin ? 'RBI Admin' : 'System Admin'}
            </span>
    )