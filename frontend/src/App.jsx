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

function MainSite() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/ledger" element={<PublicLedger />} />

        <Route path="/citizen" element={<ProtectedRoute allowedRoles={['citizen']}><CitizenDashboard /></ProtectedRoute>} />
        <Route path="/citizen/apply" element={<ProtectedRoute allowedRoles={['citizen']}><Apply /></ProtectedRoute>} />
        <Route path="/citizen/wallet" element={<ProtectedRoute allowedRoles={['citizen']}><Wallet /></ProtectedRoute>} />
        <Route path="/citizen/send" element={<ProtectedRoute allowedRoles={['citizen']}><SendTokens /></ProtectedRoute>} />

        <Route path="/vendor" element={<ProtectedRoute allowedRoles={['vendor']}><VendorDashboard /></ProtectedRoute>} />
        <Route path="/vendor/apply" element={<ProtectedRoute allowedRoles={['vendor']}><VendorApply /></ProtectedRoute>} />
        <Route path="/vendor/exchange" element={<ProtectedRoute allowedRoles={['vendor']}><VendorExchange /></ProtectedRoute>} />
      </Routes>
    </>
  );
}



function AdminPortal() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/" element={<AdminProtected><AdminLayout><AdminDashboard /></AdminLayout></AdminProtected>} />
      <Route path="/citizens" element={<AdminProtected><AdminLayout><CitizenManagement /></AdminLayout></AdminProtected>} />
      <Route path="/vendors" element={<AdminProtected><AdminLayout><VendorManagement /></AdminLayout></AdminProtected>} />
      <Route path="/schemes" element={<AdminProtected><AdminLayout><AdminSchemes /></AdminLayout></AdminProtected>} />
      <Route path="/event-triggers" element={<AdminProtected><AdminLayout><EventTriggers /></AdminLayout></AdminProtected>} />
      <Route path="/ledger" element={<AdminProtected><AdminLayout><PublicLedger /></AdminLayout></AdminProtected>} />
      <Route path="/settlements" element={<AdminProtected><AdminLayout><VendorManagement /></AdminLayout></AdminProtected>} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin-portal/*" element={<AdminPortal />} />
      <Route path="/*" element={<MainSite />} />
    </Routes>
  );
}
