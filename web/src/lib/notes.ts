import { db, type NoteRecord } from './db'
import { getSession } from './session'
import { queueOp } from './sync'

export async function listLocalNotes(): Promise<NoteRecord[]> {
  const session = await getSession()
  const all = await db.notes.orderBy('updatedAt').reverse().toArray()
  const visible = all.filter(n => !n.deletedAt)
  if (!session?.userId) return visible
  return visible.filter(n => n.userId === session.userId)
}

export async function upsertLocalNote(partial: Partial<NoteRecord> & { id: string }) {
  const now = new Date().toISOString()
  const prev = await db.notes.get(partial.id)
  const session = await getSession()
  const rec: NoteRecord = {
    id: partial.id,
    userId: partial.userId || prev?.userId || (session?.userId || ''),
    title: partial.title ?? prev?.title ?? '',
    content: partial.content ?? prev?.content ?? '',
    color: partial.color ?? prev?.color ?? '#fff59d',
    posX: partial.posX ?? prev?.posX ?? 0,
    posY: partial.posY ?? prev?.posY ?? 0,
    width: partial.width ?? prev?.width ?? 300,
    height: partial.height ?? prev?.height ?? 200,
    zIndex: partial.zIndex ?? prev?.zIndex ?? 0,
    pinned: partial.pinned ?? prev?.pinned ?? false,
    archived: partial.archived ?? prev?.archived ?? false,
    dueAt: partial.dueAt ?? prev?.dueAt ?? null,
    recurrenceRule: partial.recurrenceRule ?? prev?.recurrenceRule ?? null,
    reminderAt: partial.reminderAt ?? prev?.reminderAt ?? null,
    deletedAt: partial.deletedAt ?? prev?.deletedAt ?? null,
    isShared: partial.isShared ?? prev?.isShared ?? false,
    isList: partial.isList ?? prev?.isList ?? false,
    updatedAt: now
  }
  await db.notes.put(rec)
  const { isList, ...serverData } = rec as any
  await queueOp({ id: rec.id, type: 'upsert', entity: 'note', updatedAt: rec.updatedAt, data: serverData })
  return rec
}

export async function deleteLocalNote(id: string) {
  const now = new Date().toISOString()
  const rec = await db.notes.get(id)
  if (!rec) return
  rec.deletedAt = now
  rec.updatedAt = now
  await db.notes.put(rec)
  await queueOp({ id, type: 'delete', entity: 'note', updatedAt: now })
}


