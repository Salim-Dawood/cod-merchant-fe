import { API_BASE_URL } from './api';

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include',
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const auth = {
  login: (email, password) =>
    request('/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  loginMerchant: (email, password) =>
    request('/merchant/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (payload) =>
    request('/merchant/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  refresh: () =>
    request('/platform/auth/refresh', {
      method: 'POST'
    }),
  refreshMerchant: () =>
    request('/merchant/auth/refresh', {
      method: 'POST'
    }),
  me: () =>
    request('/platform/auth/me', {
      method: 'GET'
    }),
  meMerchant: () =>
    request('/merchant/auth/me', {
      method: 'GET'
    }),
  logout: () =>
    request('/platform/auth/logout', {
      method: 'POST'
    }),
  logoutMerchant: () =>
    request('/merchant/auth/logout', {
      method: 'POST'
    })
};
