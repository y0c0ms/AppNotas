const { randomUUID } = require('crypto');
const Store = require('electron-store');

const notesStore = new Store({ name: 'notes' });
const syncStore = new Store({ name: 'sync' });

function ensureDeviceId() {
  let id = syncStore.get('deviceId');
  if (!id) {
    id = randomUUID();
    syncStore.set('deviceId', id);
  }
  if (typeof syncStore.get('cursor') !== 'number') syncStore.set('cursor', 0);
  return id;
}

function migrate() {
  const notes = notesStore.get('notes', []);
  const nowIso = new Date().toISOString();
  const migrated = notes.map(n => {
    const id = n.id || randomUUID();
    return { ...n, id, updatedAt: nowIso, dirty: true, pendingOp: 'upsert' };
  });
  notesStore.set('notes', migrated);
  ensureDeviceId();
}

module.exports = { migrate, ensureDeviceId };


