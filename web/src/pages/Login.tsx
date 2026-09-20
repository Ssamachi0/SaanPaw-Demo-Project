import { useState, type FormEvent } from 'react';
import { Banner, Button } from '@/components/ui';
import { DEMO_DEVELOPER, useAuth } from '@/auth';

/** Developer Module - Login. Accounts are provisioned, so there is no sign-up. */
export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(DEMO_DEVELOPER.email);
  const [password, setPassword] = useState(DEMO_DEVELOPER.password);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark" aria-hidden>
          🐾
        </div>
        <div>
          <h1>Developer Console</h1>
          <p className="sub">
            Shelter approvals, report moderation, and system management for SaanPaw &mdash; San Jose
            Del Monte, Bulacan.
          </p>
        </div>

        {error ? (
          <Banner tone="danger" title="Cannot sign in">
            {error}
          </Banner>
        ) : null}

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            autoComplete="username"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit">Sign in</Button>

        <Banner tone="info" title="Demo credentials pre-filled">
          {DEMO_DEVELOPER.email} / {DEMO_DEVELOPER.password}
        </Banner>

        <p style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center' }}>
          The Pet Owner and Shelter Admin modules are in the SaanPaw mobile app.
        </p>
      </form>
    </div>
  );
}
