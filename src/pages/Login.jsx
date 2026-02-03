import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth } from '../lib/auth';

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantCountry, setMerchantCountry] = useState('');
  const [merchantCity, setMerchantCity] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (mode === 'register') {
      if (!merchantName.trim()) {
        return 'Merchant name is required.';
      }
    }

    if (!trimmedEmail || !emailValid) {
      return 'Enter a valid email address.';
    }

    if (trimmedPassword.length < 6) {
      return 'Password must be at least 6 characters.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      if (mode === 'register') {
        await auth.register({
          name: merchantName,
          email: merchantEmail || email,
          phone: merchantPhone,
          country: merchantCountry,
          city: merchantCity,
          address: merchantAddress,
          admin_email: email,
          admin_password: password
        });
        setSuccess('Merchant registered. You can now log in as a platform admin.');
        setMode('merchant');
      } else if (mode === 'merchant') {
        await auth.loginMerchant(email, password);
        await onSuccess?.('merchant');
        navigate('/merchant/merchants', { replace: true });
      } else {
        await auth.login(email, password);
        await onSuccess?.('platform');
        navigate('/platform/platform-admins', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const modeButtonClass = (value) =>
    `flex-1 rounded-2xl border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition ${
      mode === value
        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)] shadow-sm'
        : 'border-[var(--border)] text-[var(--muted-ink)] hover:bg-[var(--surface-soft)]'
    }`;

  return (
    <div className="min-h-screen px-4 py-12 text-[var(--ink)]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="glass-panel relative overflow-hidden rounded-[32px] p-6 sm:p-8 lg:p-10">
          <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-[var(--accent)]/20 blur-3xl" />
          <div className="absolute -bottom-24 left-10 h-60 w-60 rounded-full bg-[var(--sun)]/20 blur-3xl" />
          <div className="relative z-10 flex h-full flex-col">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.4em] text-[var(--muted-ink)]">
                Merchant Office
              </p>
              <h1 className="font-display mt-4 text-4xl leading-tight">
                COD Merchant Studio
              </h1>
              <p className="mt-4 text-sm text-[var(--muted-ink)]">
                A unified command layer for merchants, branches, and platform admins. Keep every storefront aligned from one workspace.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">Workflow</p>
                <p className="mt-2 text-base font-semibold">Plan, assign, deploy</p>
                <p className="mt-2 text-xs text-[var(--muted-ink)]">
                  Move from onboarding to role assignment in one flow.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">Coverage</p>
                <p className="mt-2 text-base font-semibold">Every branch in sync</p>
                <p className="mt-2 text-xs text-[var(--muted-ink)]">
                  Centralize permissions and keep stores consistent.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-ink)]">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--ink)]">Launch Tip</p>
              <p className="mt-2 leading-relaxed">
                Use the seeded admin credentials to get started, then rotate passwords before going live.
              </p>
            </div>
          </div>
        </div>

        <div className="surface-panel rounded-[32px] p-6 sm:p-8 lg:p-10">
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div>
              <h2 className="font-display text-2xl">
                {mode === 'register'
                  ? 'Merchant Registration'
                  : mode === 'merchant'
                  ? 'Merchant Login'
                  : 'Admin Login'}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                {mode === 'register'
                  ? 'Create a merchant profile and primary admin.'
                  : mode === 'merchant'
                  ? 'Use your merchant admin email and password.'
                  : 'Use your platform admin email and password.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('admin');
                  setSuccess('');
                }}
                className={modeButtonClass('admin')}
              >
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('merchant');
                  setSuccess('');
                }}
                className={modeButtonClass('merchant')}
              >
                Merchant Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                }}
                className={modeButtonClass('register')}
              >
                Merchant Register
              </button>
            </div>

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Merchant Name
                  <Input
                    type="text"
                    value={merchantName}
                    onChange={(event) => setMerchantName(event.target.value)}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Merchant Email
                  <Input
                    type="email"
                    value={merchantEmail}
                    onChange={(event) => setMerchantEmail(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Merchant Phone
                  <Input
                    type="text"
                    value={merchantPhone}
                    onChange={(event) => setMerchantPhone(event.target.value)}
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    Country
                    <Input
                      type="text"
                      value={merchantCountry}
                      onChange={(event) => setMerchantCountry(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    City
                    <Input
                      type="text"
                      value={merchantCity}
                      onChange={(event) => setMerchantCity(event.target.value)}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Address
                  <Input
                    type="text"
                    value={merchantAddress}
                    onChange={(event) => setMerchantAddress(event.target.value)}
                  />
                </label>
              </div>
            )}

            <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {mode === 'merchant'
                ? 'Merchant Email'
                : mode === 'register'
                ? 'Owner Email'
                : 'Admin Email'}
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {mode === 'merchant'
                ? 'Merchant Password'
                : mode === 'register'
                ? 'Owner Password'
                : 'Admin Password'}
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-16"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-ink)] hover:text-[var(--ink)]"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <div className="grid gap-3">
              <Button type="submit" disabled={loading}>
                {loading
                  ? 'Submitting...'
                  : mode === 'register'
                  ? 'Create Merchant'
                  : 'Sign In'}
              </Button>
              <p className="text-xs text-[var(--muted-ink)]">
                By continuing, you confirm you have permission to access this workspace.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
