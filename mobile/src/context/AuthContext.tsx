import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Role } from '@saanpaw/shared';
import { apiRequest } from '../services/api';

const SESSION_KEY = 'saanpaw.session';
const TOKEN_KEY = 'saanpaw.token';

export type MobileRole = Extract<Role, 'user' | 'shelter_admin'>;

export const DEMO_ACCOUNTS: Record<MobileRole, { email: string; password: string; label: string }> = {
  user: { email: 'user@saanpaw.ph', password: 'saanpaw123', label: 'Pet owner / community member' },
  shelter_admin: {
    email: 'shelter@saanpaw.ph',
    password: 'saanpaw123',
    label: 'SJDM City Animal Care Center',
  },
};

interface AuthState {
  role: MobileRole | null;
  loading: boolean;
  signIn: (role: MobileRole, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<MobileRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((stored) => {
        setRole(stored === 'user' || stored === 'shelter_admin' ? stored : null);
      })
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      role,
      loading,
      signIn: async (r, email, password) => {
        const response = await apiRequest<{ token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ role: r, email, password }),
        });

        await AsyncStorage.setItem(SESSION_KEY, r);
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        setRole(r);
      },
      signOut: async () => {
        await AsyncStorage.removeItem(SESSION_KEY);
        await AsyncStorage.removeItem(TOKEN_KEY);
        setRole(null);
      },
    }),
    [role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
