import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

const API_BASE = '/api';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bharatchain_token'));
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef(null);

  useEffect(() => {
    if (token) fetchProfile();
    else setLoading(false);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && user) {
        // Tab hidden — start 60s logout timer
        logoutTimerRef.current = setTimeout(() => {
          console.log('⏰ Auto-logout: tab was closed/hidden for 60 seconds');
          logout();
        }, 60000);
      } else {
        // Tab visible again — cancel timer
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
          logoutTimerRef.current = null;
        }
      }
    };

     document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [user]);

const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (phone, password, name, role, email, walletAddress) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, name, role, email, walletAddress })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setToken(data.token); setUser(data.user);
    localStorage.setItem('bharatchain_token', data.token);
    return data;
  };

   const login = async (phone, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setToken(data.token); setUser(data.user);
    localStorage.setItem('bharatchain_token', data.token);
    return data;
  };

  const logout = useCallback(() => {
    setUser(null); setToken(null);
    localStorage.removeItem('bharatchain_token');
  }, []);

  const updateWallet = async (walletAddress) => {
    const res = await fetch(`${API_BASE}/auth/wallet`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ walletAddress })
    });
    if (res.ok) setUser(prev => ({ ...prev, wallet_address: walletAddress }));
  };

