'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AppUser, UserRole } from '@/lib/types';
import {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  onAuthChange,
  getAuthErrorMessage,
} from '@/lib/auth';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const appUser = await signInWithEmail(email, password);
      setUser(appUser);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      const appUser = await signUpWithEmail(email, password, name, role);
      setUser(appUser);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOutUser();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
