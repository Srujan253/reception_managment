import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('eventhq_user');
    const token = localStorage.getItem('eventhq_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('eventhq_token', token);
    localStorage.setItem('eventhq_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('eventhq_token');
    localStorage.removeItem('eventhq_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isManager = ['admin', 'manager'].includes(user?.role);
  const isStaff = ['admin', 'manager', 'staff'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
