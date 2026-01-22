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
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    auth
      .refresh()
      .then(() => auth.me())
      .then((profile) => {
        if (isMounted) {
          setAuthed(true);
          setPermissions(profile.permissions || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthed(false);
          setPermissions([]);
        }
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

  const handleLogin = async () => {
    const profile = await auth.me();
    setAuthed(true);
    setPermissions(profile.permissions || []);
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
    } finally {
      setAuthed(false);
      setPermissions([]);
    }
  };

  const allowedRoutes = useMemo(() => {
    return routes.filter((route) => {
      const perm = route.resource.permissions?.read;
      return !perm || permissions.includes(perm);
    });
  }, [permissions]);

  const defaultPath = allowedRoutes[0]?.path || routes[0]?.path || '/login';

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onSuccess={handleLogin} />} />
      <Route
        path="/"
        element={
          authReady ? (
            authed ? (
              <Layout onLogout={handleLogout} permissions={permissions} />
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
