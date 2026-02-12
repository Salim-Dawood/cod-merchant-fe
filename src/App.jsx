import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import CrudPage from './components/CrudPage';
import resources from './lib/resources';
import { auth } from './lib/auth';
import LoginPage from './pages/Login';

const routes = [
  ...resources.platform.map((resource) => ({
    path: `/platform/${resource.key}`,
    resource
  })),
  ...resources.merchant.map((resource) => ({
    path: `/merchant/${resource.key}`,
    resource
  }))
];

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authType, setAuthType] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const finishAuthed = (type, profile) => {
      if (!isMounted || !profile) {
        return false;
      }
      setAuthed(true);
      setAuthType(type);
      setPermissions(profile.permissions || []);
      setProfile(profile);
      return true;
    };

    const handleFailure = () => {
      if (isMounted) {
        setAuthed(false);
        setAuthType(null);
        setPermissions([]);
        setProfile(null);
      }
    };

    const setReady = () => {
      if (isMounted) {
        setAuthReady(true);
      }
    };

    const attemptMerchant = () =>
      auth
        .refreshMerchant()
        .then(() => auth.meMerchant())
        .then((merchantProfile) => finishAuthed('merchant', merchantProfile))
        .catch(() => false);

    const attemptPlatform = () =>
      auth
        .refresh()
        .then(() => auth.me())
        .then((profile) => finishAuthed('platform', profile))
        .catch(() => false);

    attemptMerchant()
      .then((ok) => (ok ? true : attemptPlatform()))
      .then((ok) => {
        if (!ok) {
          handleFailure();
        }
      })
      .finally(setReady);

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (type) => {
    if (type === 'merchant') {
      const merchantProfile = await auth.meMerchant();
      setAuthed(true);
      setAuthType('merchant');
      setPermissions(merchantProfile.permissions || []);
      setProfile(merchantProfile);
      return;
    }
    const profile = await auth.me();
    setAuthed(true);
    setAuthType('platform');
    setPermissions(profile.permissions || []);
    setProfile(profile);
  };

  const handleLogout = async () => {
    try {
      if (authType === 'merchant') {
        await auth.logoutMerchant();
      } else {
        await auth.logout();
      }
    } finally {
      setAuthed(false);
      setAuthType(null);
      setPermissions([]);
      setProfile(null);
    }
  };

  const allowedRoutes = useMemo(() => {
    if (authType === 'merchant') {
      const roleName = profile?.role_name ? String(profile.role_name).toLowerCase() : '';
      if (roleName === 'client') {
        return routes.filter((route) =>
          ['/merchant/merchants', '/merchant/products', '/merchant/categories'].includes(route.path)
        );
      }
      return routes.filter((route) => route.path.startsWith('/merchant/'));
    }
    return routes.filter((route) => {
      const perm = route.resource.permissions?.read;
      return !perm || permissions.includes(perm);
    });
  }, [permissions, authType, profile]);

  const defaultPath = allowedRoutes[0]?.path || routes[0]?.path || '/login';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onSuccess={handleLogin} />} />
      <Route
        path="/"
        element={
          authReady ? (
            authed ? (
              <Layout
                onLogout={handleLogout}
                permissions={permissions}
                authType={authType}
                profile={profile}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          ) : (
            <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted-ink)]">
              Loading session...
            </div>
          )
        }
      >
        <Route index element={<Navigate to={defaultPath} replace />} />
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<CrudPage resource={route.resource} permissions={permissions} authType={authType} profile={profile} />}
          />
        ))}
      </Route>
    </Routes>
  );
}
