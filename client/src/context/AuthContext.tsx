import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { LoginResponse } from '../types';

interface AuthState {
  user: LoginResponse | null;
  loading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const STORAGE_KEY = 'drv_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  async function login(userName: string, password: string) {
    const res = await api.login(userName, password);
    setUser(res);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res));
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
