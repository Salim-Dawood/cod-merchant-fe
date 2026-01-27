export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

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
  })
};
