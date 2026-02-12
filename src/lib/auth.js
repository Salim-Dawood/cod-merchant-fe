import { API_BASE_URL } from './api';
import { getAccessToken, getRefreshToken, setAuthMode, setAuthTokens, clearAuthTokens } from './session';

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const accessToken = getAccessToken();
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
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const auth = {
  login: async (email, password) => {
    const data = await request('/platform/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthMode('platform');
    setAuthTokens('platform', data);
    return data;
  },
  loginMerchant: async (email, password) => {
    const data = await request('/merchant/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthMode('merchant');
    setAuthTokens('merchant', data);
    return data;
  },
  register: (payload) =>
    request('/merchant/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  registerClient: (payload) =>
    request('/merchant/auth/register-client', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  refresh: async () => {
    const refreshToken = getRefreshToken('platform');
    const data = await request('/platform/auth/refresh', {
      method: 'POST',
      headers: refreshToken ? { Authorization: `Bearer ${refreshToken}` } : undefined
    });
    setAuthMode('platform');
    setAuthTokens('platform', data);
    return data;
  },
  refreshMerchant: async () => {
    const refreshToken = getRefreshToken('merchant');
    const data = await request('/merchant/auth/refresh', {
      method: 'POST',
      headers: refreshToken ? { Authorization: `Bearer ${refreshToken}` } : undefined
    });
    setAuthMode('merchant');
    setAuthTokens('merchant', data);
    return data;
  },
  me: () =>
    request('/platform/auth/me', {
      method: 'GET'
    }),
  meMerchant: () =>
    request('/merchant/auth/me', {
      method: 'GET'
    }),
  logout: async () => {
    const data = await request('/platform/auth/logout', {
      method: 'POST'
    });
    clearAuthTokens('platform');
    return data;
  },
  logoutMerchant: async () => {
    const data = await request('/merchant/auth/logout', {
      method: 'POST'
    });
    clearAuthTokens('merchant');
    return data;
  }
};
