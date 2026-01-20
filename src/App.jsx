import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import CrudPage from './components/CrudPage';
import resources from './lib/resources';

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
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/merchant/merchants" replace />} />
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<CrudPage resource={route.resource} />}
          />
        ))}
      </Route>
    </Routes>
  );
}
