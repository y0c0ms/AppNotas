import Dexie, { type Table } from 'dexie'

export type NoteRecord = {
  id: string
  userId: string
  ownerEmail?: string
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
  isList?: boolean
}

export type PendingOp = {
  id: string
  type: 'upsert' | 'delete'
  entity: 'note'
  updatedAt: string
  data?: any
}

export type SyncState = {
  id: 'state'
  clientCursor: number
}

export type Session = {
  id: 'session'
  userId?: string
  deviceId?: string
  accessToken?: string
  refreshToken?: string
  email?: string
}

export class AppDb extends Dexie {
  notes!: Table<NoteRecord, string>
  pendingOps!: Table<PendingOp, string>
  syncState!: Table<SyncState, string>
  session!: Table<Session, string>

  constructor() {
    super('appnotas')
    this.version(1).stores({
      notes: 'id, updatedAt, deletedAt, userId',
      pendingOps: 'id, updatedAt',
      syncState: 'id',
      session: 'id'
    })
    // bump to v2 to introduce isList flag (no index change)
    this.version(2).stores({
      notes: 'id, updatedAt, deletedAt, userId',
      pendingOps: 'id, updatedAt',
      syncState: 'id',
      session: 'id'
    }).upgrade(async tx => {
      const all = await tx.table('notes').toArray()
      for (const n of all) {
        if (typeof (n as any).isList === 'undefined') {
          ;(n as any).isList = false
          await tx.table('notes').put(n)
        }
      }
    })
  }
}

export const db = new AppDb()


