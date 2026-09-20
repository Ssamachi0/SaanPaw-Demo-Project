import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from './lib/api';

const SESSION_KEY = 'saanpaw.console.session';
const TOKEN_KEY = 'saanpaw.console.token';

/**
 * The static GitHub Pages build has no backend. With this set, sign-in checks the demo
 * account below and the console runs on its built-in sample data instead of calling the API.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === '1';

export const DEMO_DEVELOPER = {
  email: 'dev@saanpaw.ph',
  password: 'saanpaw123',
  name: 'System Developer',
};

interface AuthState {
  signedIn: boolean;
  /** Bearer token for the data store. Null when signed out, and in demo mode. */
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

/** `null` is signed out. A signed-in demo session has no token. */
type Session = { token: string | null } | null;

const AuthContext = createContext<AuthState | undefined>(undefined);

const readStoredSession = (): Session => {
  try {
    if (sessionStorage.getItem(SESSION_KEY) !== 'developer') return null;
    if (DEMO_MODE) return { token: null };
    // A session without a token (from before sign-in used the API) cannot call the server.
    const token = sessionStorage.getItem(TOKEN_KEY);
    return token ? { token } : null;
  } catch {
    // Private browsing and blocked site data both throw.
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(readStoredSession);

  const value = useMemo<AuthState>(
    () => ({
      signedIn: session !== null,
      token: session?.token ?? null,
      signIn: async (email, password) => {
        let token: string | null = null;
        if (DEMO_MODE) {
          if (email.trim().toLowerCase() !== DEMO_DEVELOPER.email || password !== DEMO_DEVELOPER.password) {
            throw new Error('Incorrect email or password.');
          }
        } else {
          const response = await apiRequest<{ token: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ role: 'developer', email, password }),
          });
          token = response.token;
        }

        try {
          sessionStorage.setItem(SESSION_KEY, 'developer');
          if (token) sessionStorage.setItem(TOKEN_KEY, token);
        } catch {
          // session still valid in memory
        }
        setSession({ token });
      },
      signOut: () => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          /* nothing to clear */
        }
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
