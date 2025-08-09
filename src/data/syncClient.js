// Minimal sync client placeholder; wire up to /v1/sync later
const Store = require('electron-store');
const { randomUUID } = require('crypto');
const { refresh, currentIdentity, getApiBase } = require('./authClient');

const cfg = new Store({ name: 'sync' });

function getDeviceId() {
  let id = cfg.get('deviceId');
  if (!id) {
    id = randomUUID();
    cfg.set('deviceId', id);
  }
  return id;
}

async function getFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

async function syncOnce(accessToken, payload) {
  const clientCursor = cfg.get('cursor', 0);
  const deviceId = getDeviceId();
  const body = { clientCursor, deviceId, ops: payload.ops || [] };
  const doFetch = await getFetch();
  const res = await doFetch(`${getApiBase()}/v1/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`sync failed: ${res.status}`);
  const json = await res.json();
  cfg.set('cursor', json.newCursor || clientCursor);
  return json;
}

async function syncOnceWithRefresh(accessToken, payload) {
  try {
    return await syncOnce(accessToken, payload);
  } catch (e) {
    if (e && String(e.message).includes('unauthorized')) {
      const newAccess = await refresh();
      return await syncOnce(newAccess, payload);
    }
    throw e;
  }
}

module.exports = { syncOnceWithRefresh, getDeviceId };


