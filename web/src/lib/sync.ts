import { db, type PendingOp } from './db'
import { getApi } from './auth'

export async function queueOp(op: PendingOp) {
  await db.pendingOps.put(op)
}

export async function syncNow() {
  const api = getApi()
  const state = (await db.syncState.get('state')) || { id: 'state', clientCursor: 0 }
  const ops = await db.pendingOps.orderBy('updatedAt').toArray()
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
      // Do not overwrite newer local changes (e.g., recent delete not yet applied server-side)
      try {
        if (existing?.updatedAt && new Date(existing.updatedAt).getTime() > new Date(n.updatedAt).getTime()) {
          continue
        }
      } catch {}
      const prefs = ch.prefs as { pinned?: boolean; isList?: boolean; colorOverride?: string | null } | undefined
      await db.notes.put({
        id: n.id,
        userId: n.userId,
        title: n.title,
        content: n.content,
        posX: n.posX,
        posY: n.posY,
        width: n.width,
        height: n.height,
        zIndex: n.zIndex,
        pinned: typeof prefs?.pinned === 'boolean' ? prefs.pinned : n.pinned,
        archived: n.archived,
        dueAt: n.dueAt ? new Date(n.dueAt).toISOString() : null,
        recurrenceRule: n.recurrenceRule ?? null,
        reminderAt: n.reminderAt ? new Date(n.reminderAt).toISOString() : null,
        deletedAt: n.deletedAt ? new Date(n.deletedAt).toISOString() : null,
        isShared: n.isShared,
        // keep local-only flags, unless server returned a user pref
        isList: typeof prefs?.isList === 'boolean' ? prefs.isList : (existing?.isList ?? false),
        color: prefs?.colorOverride || n.color,
        updatedAt: new Date(n.updatedAt).toISOString()
      })
    }
    await db.syncState.put({ id: 'state', clientCursor: res.newCursor })
    // After applying server changes, broadcast to listeners; debounce handled by fetch layer
    window.dispatchEvent(new Event('notes:fetched'))
  } catch (e) {
    // Ensure pending ops are retained on error; surface an event for optional UI
    try { window.dispatchEvent(new Event('sync:error')) } catch {}
  }
}


