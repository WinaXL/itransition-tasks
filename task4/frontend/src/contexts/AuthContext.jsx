import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken]     = useState(() => localStorage.getItem('token') || null);
  const [kickMsg, setKickMsg] = useState('');

  const login = useCallback((tokenVal, userData) => {
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('user',  JSON.stringify(userData));
    setToken(tokenVal);
    setUser(userData);
    setKickMsg('');
  }, []);

  // Called when the middleware returns 401/403 with { kicked: true }.
  const kick = useCallback((message) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setKickMsg(message || 'Your session has ended. Please log in again.');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, kick, kickMsg, setKickMsg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
