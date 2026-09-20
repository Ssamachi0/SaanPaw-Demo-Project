import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from './lib/api';

const SESSION_KEY = 'saanpaw.console.session';
const TOKEN_KEY = 'saanpaw.console.token';

export const DEMO_DEVELOPER = {
  email: 'dev@saanpaw.ph',
  password: 'saanpaw123',
  name: 'System Developer',
};

interface AuthState {
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const readStoredSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'developer';
  } catch {
    return false;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(readStoredSession);

  const value = useMemo<AuthState>(
    () => ({
      signedIn,
      signIn: async (email, password) => {
        const response = await apiRequest<{ token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ role: 'developer', email, password }),
        });

        try {
          sessionStorage.setItem(SESSION_KEY, 'developer');
          sessionStorage.setItem(TOKEN_KEY, response.token);
        } catch {
          // session still valid in memory
        }
        setSignedIn(true);
      },
      signOut: () => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          /* nothing to clear */
        }
        setSignedIn(false);
      },
    }),
    [signedIn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
