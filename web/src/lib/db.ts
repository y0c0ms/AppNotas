import Dexie, { type Table } from 'dexie'

export type NoteRecord = {
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
  }
}

export const db = new AppDb()


