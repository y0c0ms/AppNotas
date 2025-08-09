const Store = require('electron-store');

const authStore = new Store({ name: 'auth' });

const DEFAULT_API_BASE = 'https://appnotas-7pof.onrender.com';

function getApiBase() {
  return authStore.get('apiBase', DEFAULT_API_BASE);
}

function setApiBase(url) {
  if (typeof url === 'string' && url.startsWith('http')) {
    authStore.set('apiBase', url);
  }
}

async function http(method, path, body, accessToken) {
  const res = await fetch(getApiBase() + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (e) { throw new Error(`Invalid JSON from ${path}`); }
  if (!res.ok) throw new Error(json?.error || res.statusText);
  return json;
}

async function register(email, password, device) {
  const result = await http('POST', '/v1/auth/register', { email, password, device });
  authStore.set('userId', result.userId);
  authStore.set('deviceId', result.deviceId);
  authStore.set('refreshToken', result.refreshToken);
  authStore.set('email', email);
  return result;
}

async function login(email, password, device) {
  const result = await http('POST', '/v1/auth/login', { email, password, device });
  authStore.set('userId', result.userId);
  authStore.set('deviceId', result.deviceId);
  authStore.set('refreshToken', result.refreshToken);
  authStore.set('email', email);
  return result;
}

async function refresh() {
  const userId = authStore.get('userId');
  const deviceId = authStore.get('deviceId');
  const refreshToken = authStore.get('refreshToken');
  if (!userId || !deviceId || !refreshToken) throw new Error('not_authenticated');
  const result = await http('POST', '/v1/auth/refresh', { userId, deviceId, refreshToken });
  authStore.set('refreshToken', result.refreshToken);
  return result.accessToken;
}

async function logout() {
  const refreshToken = authStore.get('refreshToken');
  if (refreshToken) {
    try { await http('POST', '/v1/auth/logout', { refreshToken }); } catch {}
  }
  authStore.delete('refreshToken');
  return { ok: true };
}

function currentIdentity() {
  return {
    userId: authStore.get('userId') || null,
    deviceId: authStore.get('deviceId') || null,
    email: authStore.get('email') || null,
  };
}

module.exports = {
  getApiBase,
  setApiBase,
  register,
  login,
  refresh,
  logout,
  currentIdentity,
};


