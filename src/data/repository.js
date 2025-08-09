// Minimal repository scaffold to prepare for sync integration
const { randomUUID } = require('crypto');
const Store = require('electron-store');

const store = new Store({ name: 'notes' });

function getAll() {
  return store.get('notes', []);
}

function upsert(note) {
  const notes = getAll();
  const nowIso = new Date().toISOString();
  const id = note.id || randomUUID();
  const idx = notes.findIndex(n => n.id === id);
  const updated = { ...note, id, updatedAt: nowIso, dirty: true, pendingOp: 'upsert' };
  if (idx >= 0) notes[idx] = updated; else notes.push(updated);
  store.set('notes', notes);
  return updated;
}

function remove(id) {
  const notes = getAll();
  const idx = notes.findIndex(n => n.id === id);
  if (idx >= 0) {
    const n = { ...notes[idx], deletedAt: new Date().toISOString(), dirty: true, pendingOp: 'delete' };
    notes[idx] = n;
    store.set('notes', notes);
    return true;
  }
  return false;
}

function buildOps() {
  const notes = getAll();
  const ops = [];
  for (const n of notes) {
    if (!n.dirty) continue;
    if (n.pendingOp === 'upsert') {
      ops.push({
        type: 'upsert',
        entity: 'note',
        id: n.id,
        updatedAt: n.updatedAt || new Date().toISOString(),
        data: {
          title: n.text || '',
          content: n.text || '',
          color: n.color || '#fff59d',
          position: { x: 0, y: 0 },
          size: { w: 300, h: 200 },
          zIndex: 0,
          pinned: false,
          archived: false,
          dueAt: n.date ? new Date(n.date).toISOString() : null,
          recurrenceRule: n.isRecurring ? 'FREQ=WEEKLY' : null,
          reminderAt: null,
          deletedAt: n.deletedAt || null,
        }
      });
    } else if (n.pendingOp === 'delete') {
      ops.push({ type: 'delete', entity: 'note', id: n.id, updatedAt: n.updatedAt || new Date().toISOString(), data: {} });
    }
  }
  return ops;
}

function ackApplied(applied) {
  if (!applied || applied.length === 0) return;
  const notes = getAll();
  const map = new Map(applied.map(a => [a.id, a]));
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const a = map.get(n.id);
    if (!a) continue;
    notes[i] = { ...n, dirty: false, pendingOp: null, updatedAt: a.updatedAt };
  }
  store.set('notes', notes);
}

function applyServerChange(change) {
  if (!change || change.entity !== 'note') return;
  const notes = getAll();
  const idx = notes.findIndex(n => n.id === change.id);
  if (change.type === 'delete') {
    if (idx >= 0) {
      notes.splice(idx, 1);
      store.set('notes', notes);
    }
    return;
  }
  const server = change.note;
  const updated = {
    id: server.id,
    text: server.title || server.content || '',
    color: server.color || 'default',
    date: server.dueAt ? new Date(server.dueAt).toISOString().split('T')[0] : undefined,
    time: server.reminderAt ? new Date(server.reminderAt).toISOString().split('T')[1]?.slice(0,5) : undefined,
    isRecurring: !!server.recurrenceRule,
    showInCalendar: !!server.dueAt,
    updatedAt: server.updatedAt,
    dirty: false,
    pendingOp: null,
  };
  if (idx >= 0) notes[idx] = updated; else notes.push(updated);
  store.set('notes', notes);
}

function getCursorStore() {
  const meta = new Store({ name: 'sync' });
  return meta;
}

module.exports = { getAll, upsert, remove, buildOps, ackApplied, applyServerChange, getCursorStore };

module.exports = { getAll, upsert, remove };


