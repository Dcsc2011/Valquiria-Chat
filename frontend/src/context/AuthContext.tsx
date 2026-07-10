import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { client } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    username: string;
    password: string;
    confirmPassword: string;
    bio?: string;
    avatar?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('vq_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = localStorage.getItem('vq_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await client.get('/auth/me');
        setUser(res.data.user);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('vq_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await client.post('/auth/login', { username, password });
    localStorage.setItem('vq_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (data: {
      name: string;
      username: string;
      password: string;
      confirmPassword: string;
      bio?: string;
      avatar?: string;
    }) => {
      const res = await client.post('/auth/register', data);
      localStorage.setItem('vq_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // ignora falhas de rede no logout
    }
    localStorage.removeItem('vq_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  return ctx;
}
