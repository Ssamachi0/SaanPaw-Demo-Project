import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Sign-in for the console. Only the developer role exists here - the other two
 * modules are in the mobile app. Checked against the demo account for now.
 */

const SESSION_KEY = 'saanpaw.console.session';

export const DEMO_DEVELOPER = {
  email: 'dev@saanpaw.ph',
  password: 'saanpaw123',
  name: 'System Developer',
};

interface AuthState {
  signedIn: boolean;
  signIn: (email: string, password: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const readStoredSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'developer';
  } catch {
    // Private browsing and blocked site data both throw.
    return false;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(readStoredSession);

  const value = useMemo<AuthState>(
    () => ({
      signedIn,
      signIn: (email, password) => {
        const ok =
          email.trim().toLowerCase() === DEMO_DEVELOPER.email && password === DEMO_DEVELOPER.password;
        if (!ok) throw new Error('Incorrect email or password.');
        try {
          sessionStorage.setItem(SESSION_KEY, 'developer');
        } catch {
          /* session still valid in memory */
        }
        setSignedIn(true);
      },
      signOut: () => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
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
