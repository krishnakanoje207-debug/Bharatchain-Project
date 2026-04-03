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
               </Link>
            <div style={{ height: 24, width: 1, background: 'var(--border)' }} />

          <Link to="/admin-portal" className="btn btn-sm btn-secondary"><FiHome size={13} /> Dashboard</Link>
          <Link to="/admin-portal/citizens" className="btn btn-sm btn-secondary"><FiUsers size={13} /> Citizens</Link>
          <Link to="/admin-portal/vendors" className="btn btn-sm btn-secondary"><FiShoppingBag size={13} /> Vendors</Link>
          <Link to="/admin-portal/schemes" className="btn btn-sm btn-secondary"><FiFileText size={13} /> Schemes</Link>
          {isRbiAdmin && (
            <Link to="/admin-portal/event-triggers" className="btn btn-sm btn-secondary"><FiClock size={13} /> Triggers</Link>
          )}
          <Link to="/admin-portal/ledger" className="btn btn-sm btn-secondary"><FiActivity size={13} /> Ledger</Link>
           </div>

           <div className="flex gap-1" style={{ alignItems: 'center'}}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.name}</span>
            <button onClick={handleLogout} className="btn btn-sm btn-secondary" title="Logout"><FiLogOut size={14} /></button>
           </div>
         </div>
        </nav>
    );
}