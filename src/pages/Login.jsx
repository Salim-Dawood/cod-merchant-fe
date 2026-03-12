import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth } from '../lib/auth';

async function requestResetLinkByEmail(email) {
  const attempts = await Promise.allSettled([
    auth.forgotPassword('platform', email),
    auth.forgotPassword('merchant', email),
    auth.forgotPassword('buyer', email)
  ]);
  return attempts.some((result) => result.status === 'fulfilled');
}

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetActor, setResetActor] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isReset = params.get('reset') === '1';
    const actor = params.get('actor') || '';
    const token = params.get('token') || '';
    if (isReset && token && ['platform', 'merchant', 'buyer'].includes(actor)) {
      setMode('reset-password');
      setResetActor(actor);
      setResetToken(token);
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      return;
    }
    if (mode === 'reset-password') {
      setMode('login');
      setResetActor('');
      setResetToken('');
    }
  }, [location.search, mode]);

  const validateForm = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (mode === 'login' || mode === 'request-reset' || mode === 'client-register') {
      if (!trimmedEmail || !emailValid) {
        nextErrors.email = 'Enter a valid email address.';
      }
    }

    if (mode === 'login' || mode === 'client-register' || mode === 'reset-password') {
      if (trimmedPassword.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters.';
      }
    }

    if (mode === 'client-register') {
      if (!clientFirstName.trim()) {
        nextErrors.clientFirstName = 'First name is required.';
      }
      if (!clientLastName.trim()) {
        nextErrors.clientLastName = 'Last name is required.';
      }
    }

    if (mode === 'reset-password' && confirmPassword.trim() !== trimmedPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 ? '' : 'Please fix the highlighted fields.';
  };

  const validateField = (key, value) => {
    const trimmed = typeof value === 'string' ? value.trim() : value;
    switch (key) {
      case 'email': {
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(trimmed));
        return !trimmed || !emailValid ? 'Enter a valid email address.' : '';
      }
      case 'password':
        if (mode === 'request-reset') {
          return '';
        }
        return !trimmed || String(trimmed).length < 6 ? 'Password must be at least 6 characters.' : '';
      case 'clientFirstName':
        return mode === 'client-register' && !trimmed ? 'First name is required.' : '';
      case 'clientLastName':
        return mode === 'client-register' && !trimmed ? 'Last name is required.' : '';
      case 'confirmPassword':
        return mode === 'reset-password' && String(value) !== password ? 'Passwords do not match.' : '';
      default:
        return '';
    }
  };

  const handleFieldChange = (key, value, setter) => {
    setter(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      const message = validateField(key, value);
      if (message) {
        next[key] = message;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const parseServerError = (message, data) => {
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') {
        return { message: data.message, errors: data.errors || {} };
      }
      if (typeof data.error === 'string') {
        return { message: data.error, errors: data.errors || {} };
      }
      if (data.errors && typeof data.errors === 'object') {
        return { message: '', errors: data.errors };
      }
    }
    if (typeof message === 'string' && message.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(message);
        return parseServerError('', parsed);
      } catch {
        return { message, errors: {} };
      }
    }
    return { message: message || 'Request failed', errors: {} };
  };

  const attemptAutoLogin = async () => {
    try {
      await auth.login(email, password);
      const profile = await auth.me().catch(() => null);
      if (profile?.platform_role_id) {
        await onSuccess?.('platform');
        navigate('/platform/platform-admins', { replace: true });
        return true;
      }
    } catch {
      // try next login type
    }

    try {
      await auth.loginMerchant(email, password);
      await onSuccess?.('merchant');
      navigate('/merchant/merchants', { replace: true });
      return true;
    } catch {
      // try next login type
    }

    try {
      await auth.loginClient(email, password);
      await onSuccess?.('client');
      navigate('/merchant/merchants', { replace: true });
      return true;
    } catch {
      return false;
    }
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
      setFieldErrors({});

      if (mode === 'reset-password') {
        await auth.resetPassword(resetActor, resetToken, password);
        setSuccess('Password reset successful. You can now sign in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        navigate('/login', { replace: true });
        return;
      }

      if (mode === 'request-reset') {
        await requestResetLinkByEmail(email.trim());
        setSuccess('If the account exists, a reset link was sent to your email.');
        setMode('login');
        return;
      }

      if (mode === 'client-register') {
        await auth.registerClient({
          first_name: clientFirstName,
          last_name: clientLastName,
          email,
          password,
          phone: clientPhone
        });
        setSuccess('Buyer account registered. You can now log in.');
        setMode('login');
        return;
      }

      const loggedIn = await attemptAutoLogin();
      if (!loggedIn) {
        throw new Error('Invalid email or password.');
      }
    } catch (err) {
      const parsed = parseServerError(err?.message, err?.data);
      const nextErrors = {};
      if (parsed.errors) {
        Object.entries(parsed.errors).forEach(([key, value]) => {
          const message = Array.isArray(value) ? value[0] : value;
          if (typeof message === 'string') {
            nextErrors[key] = message;
          }
        });
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      }
      setError(parsed.message || 'Request failed');
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
    <div className="login-page min-h-screen px-4 py-12 text-[var(--ink)]">
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
                A unified command layer for merchants, branches, buyers, and platform admins.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">Workflow</p>
                <p className="mt-2 text-base font-semibold">One login, role aware</p>
                <p className="mt-2 text-xs text-[var(--muted-ink)]">
                  Sign in once with email and password, then land on the right dashboard automatically.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--muted-ink)]">Recovery</p>
                <p className="mt-2 text-base font-semibold">Reset by email</p>
                <p className="mt-2 text-xs text-[var(--muted-ink)]">
                  Enter your email and receive a reset link without choosing your account type first.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel rounded-[32px] p-6 sm:p-8 lg:p-10">
          <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
            <div>
              <h2 className="font-display text-2xl">
                {mode === 'reset-password'
                  ? 'Set New Password'
                  : mode === 'request-reset'
                  ? 'Reset Password'
                  : mode === 'client-register'
                  ? 'Buyer Registration'
                  : 'Sign In'}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                {mode === 'reset-password'
                  ? 'Enter your new password below.'
                  : mode === 'request-reset'
                  ? 'Enter your email and we will send a reset link.'
                  : mode === 'client-register'
                  ? 'Create a buyer account with your personal details.'
                  : 'Use your email and password. You will be redirected automatically based on your role.'}
              </p>
            </div>

            {mode !== 'reset-password' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setSuccess('');
                    setError('');
                  }}
                  className={modeButtonClass('login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('client-register');
                    setSuccess('');
                    setError('');
                    setPassword('');
                  }}
                  className={modeButtonClass('client-register')}
                >
                  Buyer Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('request-reset');
                    setSuccess('');
                    setError('');
                    setPassword('');
                  }}
                  className={modeButtonClass('request-reset')}
                >
                  Reset Password
                </button>
              </div>
            )}

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

            {mode === 'client-register' && (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    First Name
                    <Input
                      type="text"
                      value={clientFirstName}
                      onChange={(event) => handleFieldChange('clientFirstName', event.target.value, setClientFirstName)}
                      className={fieldErrors.clientFirstName ? 'border-red-300 focus-visible:ring-red-200' : ''}
                    />
                    {fieldErrors.clientFirstName && (
                      <span className="text-xs text-red-600">{fieldErrors.clientFirstName}</span>
                    )}
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    Last Name
                    <Input
                      type="text"
                      value={clientLastName}
                      onChange={(event) => handleFieldChange('clientLastName', event.target.value, setClientLastName)}
                      className={fieldErrors.clientLastName ? 'border-red-300 focus-visible:ring-red-200' : ''}
                    />
                    {fieldErrors.clientLastName && (
                      <span className="text-xs text-red-600">{fieldErrors.clientLastName}</span>
                    )}
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Phone (optional)
                  <Input
                    type="text"
                    value={clientPhone}
                    onChange={(event) => setClientPhone(event.target.value)}
                  />
                </label>
              </div>
            )}

            {mode !== 'reset-password' && (
              <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                Email
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => handleFieldChange('email', event.target.value, setEmail)}
                  className={fieldErrors.email ? 'border-red-300 focus-visible:ring-red-200' : ''}
                />
                {fieldErrors.email && (
                  <span className="text-xs text-red-600">{fieldErrors.email}</span>
                )}
              </label>
            )}

            {mode !== 'request-reset' && (
              <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                {mode === 'reset-password' ? 'New Password' : 'Password'}
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => handleFieldChange('password', event.target.value, setPassword)}
                    className={`pr-16 ${fieldErrors.password ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-ink)] hover:text-[var(--ink)]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="text-xs text-red-600">{fieldErrors.password}</span>
                )}
              </label>
            )}

            {mode === 'reset-password' && (
              <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                Confirm Password
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => handleFieldChange('confirmPassword', event.target.value, setConfirmPassword)}
                  className={fieldErrors.confirmPassword ? 'border-red-300 focus-visible:ring-red-200' : ''}
                />
                {fieldErrors.confirmPassword && (
                  <span className="text-xs text-red-600">{fieldErrors.confirmPassword}</span>
                )}
              </label>
            )}

            <div className="grid gap-3">
              <Button type="submit" disabled={loading}>
                {loading
                  ? 'Submitting...'
                  : mode === 'request-reset'
                  ? 'Send Reset Link'
                  : mode === 'reset-password'
                  ? 'Reset Password'
                  : mode === 'client-register'
                  ? 'Create Buyer'
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
