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
  /** Bearer token for the data store. */
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const readStoredToken = () => {
  try {
    // A session without a token (from before sign-in used the API) cannot call the server.
    return sessionStorage.getItem(SESSION_KEY) === 'developer' ? sessionStorage.getItem(TOKEN_KEY) : null;
  } catch {
    // Private browsing and blocked site data both throw.
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);

  const value = useMemo<AuthState>(
    () => ({
      signedIn: token !== null,
      token,
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
        setToken(response.token);
      },
      signOut: () => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          /* nothing to clear */
        }
        setToken(null);
      },
    }),
    [token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
