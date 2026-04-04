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

  