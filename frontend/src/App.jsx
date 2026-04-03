import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LanguageProvider } from './i18n/LanguageContext';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Schemes from './pages/Schemes';
import PublicLedger from './pages/PublicLedger';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import Apply from './pages/citizen/Apply';
import Wallet from './pages/citizen/Wallet';
import SendTokens from './pages/citizen/SendTokens';
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorApply from './pages/vendor/VendorApply';
import VendorExchange from './pages/vendor/VendorExchange';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import VendorManagement from './pages/admin/VendorManagement';
import CitizenManagement from './pages/admin/CitizenManagement';
import AdminSchemes from './pages/admin/AdminSchemes';
import EventTriggers from './pages/admin/EventTriggers';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
}
function AdminProtected({ children }) {
  const { user, loading, isAnyAdmin } = useAuth();
  if (loading) return <div className="loading-overlay"><div className="spinner" /><p>Loading admin panel...</p></div>;
  if (!user || !isAnyAdmin) return <Navigate to="/admin-portal/login" />;
  return children;
}
