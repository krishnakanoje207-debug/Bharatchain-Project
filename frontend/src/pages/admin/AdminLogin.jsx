import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import { FiShield } from 'react-icons/fi';

export default function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(phone, password);
      if (!['admin', 'rbi_admin'].includes(data.user.role)) {
        setError('This portal is for administrators only.');
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      navigate('/admin-portal');
    } catch (err) {
      setError(err.message);
      setTimeout(() => window.location.reload(), 2500);
    }
    setLoading(false);
};