import { getAccessToken, getAuthMode } from './session';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

async function request(path, options = {}) {
  const authMode = getAuthMode();
  const scopedPath =
    authMode === 'merchant'
    && !path.startsWith('/platform/')
    && !path.startsWith('/merchant/')
    && !path.startsWith('/buyer/')
    && !path.startsWith('/public/')
      ? `/merchant${path}`
      : path;
  const url = `${API_BASE_URL}${scopedPath}`;
  const isPlatform = scopedPath.startsWith('/platform/');
  const tokenMode = isPlatform ? 'platform' : authMode === 'client' ? 'client' : 'merchant';
  const accessToken = getAccessToken(tokenMode);
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {})
    },
    credentials: 'include',
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    const message =
      (data && (data.message || data.error || data.title)) ||
      text ||
      `Request failed: ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data || text || null;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  list: (resource) => request(`/${resource}`),
  get: (resource, id) => request(`/${resource}/${id}`),
  create: (resource, data) => request(`/${resource}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (resource, id, data) => request(`/${resource}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  remove: (resource, id) => request(`/${resource}/${id}`, {
    method: 'DELETE'
  }),
  publicList: (resource) => request(`/public/${resource}`),
  publicCreate: (resource, data) => request(`/public/${resource}`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  publicUpdate: (resource, id, data) => request(`/public/${resource}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  publicRemove: (resource, id) => request(`/public/${resource}/${id}`, {
    method: 'DELETE'
  })
};
