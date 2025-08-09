// E2E smoke test for hosted API: register → refresh → sync(upsert/pull/update/delete)
// Usage: node scripts/smoke-test.js https://appnotas-7pof.onrender.com

const base = process.argv[2] || process.env.API_BASE || 'http://localhost:4000';

async function http(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { throw new Error(`Invalid JSON from ${path}: ${text}`); }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}: ${JSON.stringify(json)}`);
  return json;
}

function isoNow() {
  return new Date().toISOString();
}

(async () => {
  const ts = Date.now();
  const email = `user${ts}@example.com`;
  const password = `Passw0rd!${ts}`;

  console.log('Base:', base);
  console.log('Registering:', email);
  const reg = await http('POST', '/v1/auth/register', {
    email,
    password,
    device: { name: 'PC', platform: 'windows' },
  });
  const { userId, deviceId } = reg;
  let accessToken = reg.accessToken;
  let refreshToken = reg.refreshToken;
  console.log('Registered userId:', userId);
  console.log('Device:', deviceId);

  // Refresh
  const ref = await http('POST', '/v1/auth/refresh', {
    userId, deviceId, refreshToken,
  });
  accessToken = ref.accessToken;
  refreshToken = ref.refreshToken;
  console.log('Refreshed token (prefix):', accessToken.slice(0, 20) + '...');

  // Sync - upsert note
  const noteId = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `note-${ts}`;
  let clientCursor = 0;
  let result = await http('POST', '/v1/sync', {
    clientCursor,
    deviceId,
    ops: [{
      type: 'upsert',
      entity: 'note',
      id: noteId,
      updatedAt: isoNow(),
      data: {
        title: 'First', content: 'Hello', color: '#fff59d',
        position: { x: 10, y: 20 }, size: { w: 300, h: 200 }, zIndex: 0,
        pinned: false, archived: false, dueAt: null, recurrenceRule: null, reminderAt: null, deletedAt: null,
      }
    }]
  }, accessToken);
  console.log('Upsert applied count:', result.applied?.length || 0, 'newCursor:', result.newCursor);
  clientCursor = result.newCursor || clientCursor;

  // Pull
  result = await http('POST', '/v1/sync', { clientCursor, deviceId, ops: [] }, accessToken);
  console.log('Pull changes count:', result.changes?.length || 0, 'newCursor:', result.newCursor);
  clientCursor = result.newCursor || clientCursor;

  // Update
  result = await http('POST', '/v1/sync', {
    clientCursor,
    deviceId,
    ops: [{ type: 'upsert', entity: 'note', id: noteId, updatedAt: isoNow(), data: { title: 'First (edited)', content: 'Hello again' } }]
  }, accessToken);
  console.log('Update applied count:', result.applied?.length || 0, 'newCursor:', result.newCursor);
  clientCursor = result.newCursor || clientCursor;

  // Delete
  result = await http('POST', '/v1/sync', {
    clientCursor,
    deviceId,
    ops: [{ type: 'delete', entity: 'note', id: noteId, updatedAt: isoNow(), data: {} }]
  }, accessToken);
  console.log('Delete applied count:', result.applied?.length || 0, 'newCursor:', result.newCursor);
  clientCursor = result.newCursor || clientCursor;

  // Logout
  const lo = await http('POST', '/v1/auth/logout', { refreshToken });
  console.log('Logout ok:', lo.ok === true);

  console.log('Smoke test OK');
})().catch(err => {
  console.error('Smoke test FAILED:', err.message);
  process.exit(1);
});


