import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Role } from '@saanpaw/shared';

/**
 * Sign-in for the two mobile modules.
 * The Developer module lives in the web console, so `MobileRole` leaves it out
 * and a developer login cannot be added here by accident.
 */

const SESSION_KEY = 'saanpaw.session';

/** Roles the mobile app allows. No `developer` on purpose. */
export type MobileRole = Extract<Role, 'user' | 'shelter_admin'>;

/** Demo logins, pre-filled on each login screen. */
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
        // Reject a leftover "developer" session from an older build.
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
        const account = DEMO_ACCOUNTS[r];
        const ok = email.trim().toLowerCase() === account.email && password === account.password;
        if (!ok) throw new Error('Incorrect email or password for this module.');
        await AsyncStorage.setItem(SESSION_KEY, r);
        setRole(r);
      },
      signOut: async () => {
        await AsyncStorage.removeItem(SESSION_KEY);
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
