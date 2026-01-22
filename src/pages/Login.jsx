import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth } from '../lib/auth';

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@cod-merchant.local');
  const [password, setPassword] = useState('change-me');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      await auth.login(email, password);
      onSuccess?.();
      navigate('/platform/platform-admins', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-10 text-[var(--ink)]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 lg:flex-row">
        <div className="soft-panel flex-1 rounded-3xl p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--muted-ink)]">
            Platform Access
          </p>
          <h1 className="font-display mt-4 text-4xl leading-tight">
            Welcome back to your command center.
          </h1>
          <p className="mt-4 text-sm text-[var(--muted-ink)]">
            Log in with a platform admin account to manage permissions, approve merchants, and
            maintain system governance.
          </p>
          <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
            <p className="font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">Tip</p>
            <p className="mt-2 leading-relaxed">
              Use the seeded admin credentials to get started, then update the password after login.
            </p>
          </div>
        </div>

        <div className="surface-panel flex-1 rounded-3xl p-8">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div>
              <h2 className="font-display text-2xl">Admin Login</h2>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                Use your platform admin email and password.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
              Email
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
              Password
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <Button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
