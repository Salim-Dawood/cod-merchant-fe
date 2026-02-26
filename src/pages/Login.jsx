import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth } from '../lib/auth';

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantCountry, setMerchantCountry] = useState('');
  const [merchantCity, setMerchantCity] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [buyerCompanyName, setBuyerCompanyName] = useState('');
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState('admin');
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
      setMode('admin');
      setResetActor('');
      setResetToken('');
    }
  }, [location.search, mode]);

  const loginActor = useMemo(() => {
    if (mode === 'merchant') {
      return 'merchant';
    }
    if (mode === 'client') {
      return 'buyer';
    }
    return 'platform';
  }, [mode]);

  const validateForm = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    const isResetMode = mode === 'reset-password';

    if (mode === 'register') {
      if (!merchantName.trim()) {
        nextErrors.merchantName = 'Merchant name is required.';
      }
    }
    if (mode === 'client-register') {
      if (!buyerCompanyName.trim()) {
        nextErrors.buyerCompanyName = 'Company name is required.';
      }
      if (!clientFirstName.trim()) {
        nextErrors.clientFirstName = 'First name is required.';
      }
      if (!clientLastName.trim()) {
        nextErrors.clientLastName = 'Last name is required.';
      }
    }

    if (!isResetMode && (!trimmedEmail || !emailValid)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (trimmedPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    if (isResetMode && confirmPassword.trim() !== trimmedPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 ? '' : 'Please fix the highlighted fields.';
  };

  const validateField = (key, value) => {
    const trimmed = typeof value === 'string' ? value.trim() : value;
    switch (key) {
      case 'merchantName':
        return mode === 'register' && !trimmed ? 'Merchant name is required.' : '';
      case 'merchantEmail':
        if (!trimmed) {
          return '';
        }
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(trimmed))
          ? ''
          : 'Enter a valid email address.';
      case 'email': {
        const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(trimmed));
        return !trimmed || !emailValid ? 'Enter a valid email address.' : '';
      }
      case 'password':
        return !trimmed || String(trimmed).length < 6 ? 'Password must be at least 6 characters.' : '';
      case 'clientFirstName':
        return mode === 'client-register' && !trimmed ? 'First name is required.' : '';
      case 'clientLastName':
        return mode === 'client-register' && !trimmed ? 'Last name is required.' : '';
      case 'buyerCompanyName':
        return mode === 'client-register' && !trimmed ? 'Company name is required.' : '';
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

  const normalizeFieldKey = (key) => {
    if (key === 'admin_email') {
      return 'email';
    }
    if (key === 'admin_password') {
      return 'password';
    }
    if (key === 'merchant_email') {
      return 'merchantEmail';
    }
    if (key === 'merchant_phone') {
      return 'merchantPhone';
    }
    if (key === 'merchant_name') {
      return 'merchantName';
    }
    if (key === 'merchant_city') {
      return 'merchantCity';
    }
    if (key === 'merchant_country') {
      return 'merchantCountry';
    }
    if (key === 'merchant_address') {
      return 'merchantAddress';
    }
    if (key === 'first_name') {
      return 'clientFirstName';
    }
    if (key === 'last_name') {
      return 'clientLastName';
    }
    if (key === 'company_name') {
      return 'buyerCompanyName';
    }
    return key;
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
        setMode(resetActor === 'merchant' ? 'merchant' : resetActor === 'buyer' ? 'client' : 'admin');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        navigate('/login', { replace: true });
      } else if (mode === 'register') {
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
      } else if (mode === 'client-register') {
        await auth.registerClient({
          company_name: buyerCompanyName,
          first_name: clientFirstName,
          last_name: clientLastName,
          email,
          password,
          phone: clientPhone
        });
        setSuccess('Buyer account registered. You can now log in.');
        setMode('client');
      } else if (mode === 'merchant') {
        await auth.loginMerchant(email, password);
        await onSuccess?.('merchant');
        navigate('/merchant/merchants', { replace: true });
      } else if (mode === 'client') {
        await auth.loginClient(email, password);
        await onSuccess?.('client');
        navigate('/merchant/merchants', { replace: true });
      } else {
        await auth.login(email, password);
        const profile = await auth.me().catch(() => null);
        if (!profile?.platform_role_id) {
          await auth.logout().catch(() => {});
          throw new Error('Please login as merchant.');
        }
        await onSuccess?.('platform');
        navigate('/platform/platform-admins', { replace: true });
      }
    } catch (err) {
      const parsed = parseServerError(err?.message, err?.data);
      const nextErrors = {};
      if (parsed.errors) {
        Object.entries(parsed.errors).forEach(([key, value]) => {
          const mappedKey = normalizeFieldKey(key);
          const message = Array.isArray(value) ? value[0] : value;
          if (typeof message === 'string') {
            nextErrors[mappedKey] = message;
          }
        });
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      }
      if (mode === 'admin') {
        const base = parsed.message || 'Admin login failed.';
        setError(`${base} If you are a merchant, use Merchant Login.`);
      } else {
        setError(parsed.message || 'Request failed');
      }
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

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFieldErrors((prev) => ({ ...prev, email: 'Enter your email first.' }));
      setError('Enter your email, then click Forgot password.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await auth.forgotPassword(loginActor, trimmedEmail);
      setSuccess('If the account exists, a reset link was sent to your email.');
    } catch (err) {
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

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
          <form className="grid gap-5" onSubmit={handleSubmit} noValidate>
            <div>
              <h2 className="font-display text-2xl">
                {mode === 'reset-password'
                  ? 'Reset Password'
                  : mode === 'register'
                  ? 'Merchant Registration'
                  : mode === 'client-register'
                  ? 'Buyer Registration'
                  : mode === 'merchant'
                  ? 'Merchant Login'
                  : mode === 'client'
                  ? 'Buyer Login'
                  : 'Admin Login'}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-ink)]">
                {mode === 'reset-password'
                  ? 'Enter a new password for your account.'
                  : mode === 'register'
                  ? 'Create a merchant profile and primary admin.'
                  : mode === 'client-register'
                  ? 'Create a buyer company account and primary buyer user.'
                  : mode === 'merchant'
                  ? 'Use your merchant admin email and password.'
                  : mode === 'client'
                  ? 'Use your buyer email and password.'
                  : 'Use your platform admin email and password.'}
              </p>
            </div>

            {mode !== 'reset-password' && (
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
                  setMode('client');
                  setSuccess('');
                }}
                className={modeButtonClass('client')}
              >
                Buyer Login
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
              <button
                type="button"
                onClick={() => {
                  setMode('client-register');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                }}
                className={modeButtonClass('client-register')}
              >
                Buyer Register
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

            {mode === 'register' && (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Merchant Name
                  <Input
                    type="text"
                    value={merchantName}
                    onChange={(event) => handleFieldChange('merchantName', event.target.value, setMerchantName)}
                    className={fieldErrors.merchantName ? 'border-red-300 focus-visible:ring-red-200' : ''}
                  />
                  {fieldErrors.merchantName && (
                    <span className="text-xs text-red-600">{fieldErrors.merchantName}</span>
                  )}
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Merchant Email
                  <Input
                    type="email"
                    value={merchantEmail}
                    onChange={(event) =>
                      handleFieldChange('merchantEmail', event.target.value, setMerchantEmail)
                    }
                    className={fieldErrors.merchantEmail ? 'border-red-300 focus-visible:ring-red-200' : ''}
                  />
                  {fieldErrors.merchantEmail && (
                    <span className="text-xs text-red-600">{fieldErrors.merchantEmail}</span>
                  )}
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Merchant Phone
                  <Input
                    type="text"
                    value={merchantPhone}
                    onChange={(event) => setMerchantPhone(event.target.value)}
                    className={fieldErrors.merchantPhone ? 'border-red-300 focus-visible:ring-red-200' : ''}
                  />
                  {fieldErrors.merchantPhone && (
                    <span className="text-xs text-red-600">{fieldErrors.merchantPhone}</span>
                  )}
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    Country
                    <Input
                      type="text"
                      value={merchantCountry}
                      onChange={(event) => setMerchantCountry(event.target.value)}
                      className={fieldErrors.merchantCountry ? 'border-red-300 focus-visible:ring-red-200' : ''}
                    />
                    {fieldErrors.merchantCountry && (
                      <span className="text-xs text-red-600">{fieldErrors.merchantCountry}</span>
                    )}
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    City
                    <Input
                      type="text"
                      value={merchantCity}
                      onChange={(event) => setMerchantCity(event.target.value)}
                      className={fieldErrors.merchantCity ? 'border-red-300 focus-visible:ring-red-200' : ''}
                    />
                    {fieldErrors.merchantCity && (
                      <span className="text-xs text-red-600">{fieldErrors.merchantCity}</span>
                    )}
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Address
                  <Input
                    type="text"
                    value={merchantAddress}
                    onChange={(event) => setMerchantAddress(event.target.value)}
                    className={fieldErrors.merchantAddress ? 'border-red-300 focus-visible:ring-red-200' : ''}
                  />
                  {fieldErrors.merchantAddress && (
                    <span className="text-xs text-red-600">{fieldErrors.merchantAddress}</span>
                  )}
                </label>
              </div>
            )}
            {mode === 'client-register' && (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                  Company Name
                  <Input
                    type="text"
                    value={buyerCompanyName}
                    onChange={(event) =>
                      handleFieldChange('buyerCompanyName', event.target.value, setBuyerCompanyName)
                    }
                    className={fieldErrors.buyerCompanyName ? 'border-red-300 focus-visible:ring-red-200' : ''}
                  />
                  {fieldErrors.buyerCompanyName && (
                    <span className="text-xs text-red-600">{fieldErrors.buyerCompanyName}</span>
                  )}
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
                    First Name
                    <Input
                      type="text"
                      value={clientFirstName}
                      onChange={(event) =>
                        handleFieldChange('clientFirstName', event.target.value, setClientFirstName)
                      }
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
                      onChange={(event) =>
                        handleFieldChange('clientLastName', event.target.value, setClientLastName)
                      }
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
              {mode === 'merchant'
                ? 'Merchant Email'
                : mode === 'register'
                ? 'Owner Email'
                : mode === 'client' || mode === 'client-register'
                ? 'Buyer Email'
                : 'Admin Email'}
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

            <label className="grid gap-2 text-sm font-medium text-[var(--muted-ink)]">
              {mode === 'reset-password'
                ? 'New Password'
                : mode === 'merchant'
                ? 'Merchant Password'
                : mode === 'register'
                ? 'Owner Password'
                : mode === 'client' || mode === 'client-register'
                ? 'Buyer Password'
                : 'Admin Password'}
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

            {mode !== 'register' && mode !== 'client-register' && mode !== 'reset-password' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="justify-self-start text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)] hover:underline disabled:opacity-60"
              >
                Forgot Password?
              </button>
            )}

            <div className="grid gap-3">
              <Button type="submit" disabled={loading}>
                {loading
                  ? 'Submitting...'
                  : mode === 'reset-password'
                  ? 'Reset Password'
                  : mode === 'register'
                  ? 'Create Merchant'
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
