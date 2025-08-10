import { getApi } from './auth'
import { db, type NoteRecord } from './db'

type ServerNote = {
  id: string
  userId: string
  title: string
  content: string
  color: string
  posX: number
  posY: number
  width: number
  height: number
  zIndex: number
  pinned: boolean
  archived: boolean
  dueAt?: string | null
  recurrenceRule?: string | null
  reminderAt?: string | null
  deletedAt?: string | null
  updatedAt: string
  isShared: boolean
}

function mapServerNote(n: ServerNote): NoteRecord {
  return {
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
    dueAt: n.dueAt ?? null,
    recurrenceRule: n.recurrenceRule ?? null,
    reminderAt: n.reminderAt ?? null,
    deletedAt: n.deletedAt ?? null,
    isShared: n.isShared,
    updatedAt: n.updatedAt
  }
}

export async function fetchAndCacheNotes() {
  const api = getApi()
  const res = await api.get('notes').json<{ own: ServerNote[]; shared: ServerNote[] }>()
  const all = [...(res.own || []), ...(res.shared || [])]
  await db.transaction('rw', db.notes, async () => {
    for (const n of all) {
      await db.notes.put(mapServerNote(n))
    }
  })
  return all.length
}


