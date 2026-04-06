import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('iconic_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('iconic_token');
    if (token) {
      api.me().then(data => {
        setUser(data.user);
        localStorage.setItem('iconic_user', JSON.stringify(data.user));
      }).catch(() => {
        // Token invalid — auto-login as admin
        autoLogin();
      }).finally(() => setLoading(false));
    } else {
      // No token — auto-login as admin (no password required)
      autoLogin();
    }
  }, []);

  async function autoLogin() {
    try {
      const data = await api.login('neil@stingrai.com', 'iconic2026');
      localStorage.setItem('iconic_token', data.token);
      localStorage.setItem('iconic_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch {
      // If auto-login fails, just set a fake admin user so the UI renders
      const fakeUser = { id: 1, email: 'neil@stingrai.com', name: 'Neil', role: 'admin', status: 'offline' };
      setUser(fakeUser);
      localStorage.setItem('iconic_user', JSON.stringify(fakeUser));
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('iconic_token', data.token);
    localStorage.setItem('iconic_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('iconic_token');
    localStorage.removeItem('iconic_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
