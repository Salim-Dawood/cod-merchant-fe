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
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    const error = new Error(
      (data && (data.message || data.error || data.title)) || text || `Request failed: ${response.status}`
    );
    error.status = response.status;
    error.data = data || text || null;
    throw error;
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
    clearAuthTokens('merchant');
    clearAuthTokens('client');
    setAuthMode('platform');
    setAuthTokens('platform', data);
    return data;
  },
  loginMerchant: async (email, password) => {
    const data = await request('/merchant/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    clearAuthTokens('platform');
    clearAuthTokens('client');
    setAuthMode('merchant');
    setAuthTokens('merchant', data);
    return data;
  },
  loginClient: async (email, password) => {
    const data = await request('/buyer/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    clearAuthTokens('platform');
    clearAuthTokens('merchant');
    setAuthMode('client');
    setAuthTokens('client', data);
    return data;
  },
  register: (payload) =>
    request('/merchant/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  registerClient: (payload) =>
    request('/buyer/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  refresh: async () => {
    const refreshToken = getRefreshToken('platform');
    const data = await request('/platform/auth/refresh', {
      method: 'POST',
      headers: refreshToken ? { Authorization: `Bearer ${refreshToken}` } : undefined
    });
    clearAuthTokens('merchant');
    clearAuthTokens('client');
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
    clearAuthTokens('platform');
    clearAuthTokens('client');
    setAuthMode('merchant');
    setAuthTokens('merchant', data);
    return data;
  },
  refreshClient: async () => {
    const refreshToken = getRefreshToken('client');
    const data = await request('/buyer/auth/refresh', {
      method: 'POST',
      headers: refreshToken ? { Authorization: `Bearer ${refreshToken}` } : undefined
    });
    clearAuthTokens('platform');
    clearAuthTokens('merchant');
    setAuthMode('client');
    setAuthTokens('client', data);
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
  meClient: () =>
    request('/buyer/auth/me', {
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
  },
  logoutClient: async () => {
    const data = await request('/buyer/auth/logout', {
      method: 'POST'
    });
    clearAuthTokens('client');
    return data;
  },
  forgotPassword: (actor, email) =>
    request(`/${actor}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
  resetPassword: (actor, token, password) =>
    request(`/${actor}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, password })
    })
};
