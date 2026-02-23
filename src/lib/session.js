const STORAGE_KEYS = {
  mode: 'auth_mode',
  platform: {
    access: 'platform_access_token',
    refresh: 'platform_refresh_token'
  },
  merchant: {
    access: 'merchant_access_token',
    refresh: 'merchant_refresh_token'
  },
  client: {
    access: 'client_access_token',
    refresh: 'client_refresh_token'
  }
};

export function setAuthMode(mode) {
  if (!mode) {
    return;
  }
  localStorage.setItem(STORAGE_KEYS.mode, mode);
}

export function getAuthMode() {
  return localStorage.getItem(STORAGE_KEYS.mode) || '';
}

export function setAuthTokens(mode, tokens = {}) {
  if (!mode || !STORAGE_KEYS[mode]) {
    return;
  }
  const { access_token, refresh_token } = tokens;
  if (access_token) {
    localStorage.setItem(STORAGE_KEYS[mode].access, access_token);
  }
  if (refresh_token) {
    localStorage.setItem(STORAGE_KEYS[mode].refresh, refresh_token);
  }
}

export function getAccessToken(mode = getAuthMode()) {
  if (!mode || !STORAGE_KEYS[mode]) {
    return '';
  }
  return localStorage.getItem(STORAGE_KEYS[mode].access) || '';
}

export function getRefreshToken(mode = getAuthMode()) {
  if (!mode || !STORAGE_KEYS[mode]) {
    return '';
  }
  return localStorage.getItem(STORAGE_KEYS[mode].refresh) || '';
}

export function clearAuthTokens(mode = getAuthMode()) {
  if (!mode || !STORAGE_KEYS[mode]) {
    return;
  }
  localStorage.removeItem(STORAGE_KEYS[mode].access);
  localStorage.removeItem(STORAGE_KEYS[mode].refresh);
}
