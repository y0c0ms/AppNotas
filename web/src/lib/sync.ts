import { db, type PendingOp } from './db'
import { getApi } from './auth'

export async function queueOp(op: PendingOp) {
  await db.pendingOps.put(op)
}

export async function syncNow() {
  const api = getApi()
  const state = (await db.syncState.get('state')) || { id: 'state', clientCursor: 0 }
  const ops = await db.pendingOps.toArray()
  try {
    const res = await api.post('sync', { json: { clientCursor: state.clientCursor, ops } }).json<any>()
    const appliedIds = new Set((res.applied as any[]).map((a: any) => a.id))
    for (const op of ops) {
      if (appliedIds.has(op.id)) await db.pendingOps.delete(op.id)
    }
    for (const ch of res.changes as any[]) {
      if (ch.entity !== 'note') continue
      const n = ch.note
      const existing = await db.notes.get(n.id)
      await db.notes.put({
        id: n.id,
        userId: n.userId,
        title: n.title,
        content: n.content,
        color: n.color,
        posX: n.posX,
        posY: n.posY,
        width: n.width,
        height: n.height,
        zIndex: n.zIndex,
        pinned: n.pinned,
        archived: n.archived,
        dueAt: n.dueAt ? new Date(n.dueAt).toISOString() : null,
        recurrenceRule: n.recurrenceRule ?? null,
        reminderAt: n.reminderAt ? new Date(n.reminderAt).toISOString() : null,
        deletedAt: n.deletedAt ? new Date(n.deletedAt).toISOString() : null,
        isShared: n.isShared,
        // keep local-only flags
        isList: existing?.isList ?? false,
        updatedAt: new Date(n.updatedAt).toISOString()
      })
    }
    await db.syncState.put({ id: 'state', clientCursor: res.newCursor })
    // After applying server changes, broadcast to listeners; debounce handled by fetch layer
    window.dispatchEvent(new Event('notes:fetched'))
  } catch (e) {
    // swallow; show UI toast in caller if needed
  }
}


