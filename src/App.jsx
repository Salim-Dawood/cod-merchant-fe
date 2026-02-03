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
    auth
      .refresh()
      .then(() => auth.me())
      .then((profile) => {
        if (isMounted) {
          setAuthed(true);
          setAuthType('platform');
          setPermissions(profile.permissions || []);
          setProfile(profile);
        }
      })
      .catch(() => {
        auth
          .refreshMerchant()
          .then(() => auth.meMerchant())
          .then(() => {
            if (isMounted) {
              setAuthed(true);
              setAuthType('merchant');
              setPermissions([]);
              return auth.meMerchant();
            }
          })
          .then((merchantProfile) => {
            if (isMounted && merchantProfile) {
              setProfile(merchantProfile);
            }
          })
          .catch(() => {
            if (isMounted) {
              setAuthed(false);
              setAuthType(null);
              setPermissions([]);
              setProfile(null);
            }
          })
          .finally(() => {
            if (isMounted) {
              setAuthReady(true);
            }
          });
      })
      .finally(() => {
        if (isMounted) {
          setAuthReady(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (type) => {
    if (type === 'merchant') {
      const merchantProfile = await auth.meMerchant();
      setAuthed(true);
      setAuthType('merchant');
      setPermissions([]);
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
      return routes.filter((route) => route.path.startsWith('/merchant/'));
    }
    return routes.filter((route) => {
      const perm = route.resource.permissions?.read;
      return !perm || permissions.includes(perm);
    });
  }, [permissions, authType]);

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
            element={<CrudPage resource={route.resource} permissions={permissions} />}
          />
        ))}
      </Route>
    </Routes>
  );
}
