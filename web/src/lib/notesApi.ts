import { getApi } from './auth'
import { db, type NoteRecord } from './db'
import { getSession } from './session'

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
  user?: { email: string }
}

function mapServerNote(n: ServerNote): NoteRecord {
  return {
    id: n.id,
    userId: n.userId,
    ownerEmail: n.user?.email,
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

let inflight: Promise<number> | null = null
let lastFetchMs = 0
const FETCH_COOLDOWN_MS = 1000

export async function fetchAndCacheNotes() {
  const now = Date.now()
  if (inflight) return inflight
  if (now - lastFetchMs < FETCH_COOLDOWN_MS) return 0
  inflight = (async () => {
  const { own, shared } = await fetchNotesLists()
  const all = [...(own || []), ...(shared || [])]
  const s = await getSession()
  await db.transaction('rw', db.notes, async () => {
    for (const n of all) {
      const mapped = mapServerNote(n)
      // Tag owner email if we know it
      const existing = await db.notes.get(mapped.id)
      await db.notes.put({ ...mapped, isList: existing?.isList ?? false, ownerEmail: mapped.userId === s?.userId ? (s?.email || mapped.ownerEmail) : mapped.ownerEmail })
    }
  })
  lastFetchMs = Date.now()
  inflight = null
  return all.length
  })()
  return inflight
}

export async function fetchNotesLists() {
  const api = getApi()
  const res = await api.get('notes').json<{ own: ServerNote[]; shared: ServerNote[] }>()
  return res
}


