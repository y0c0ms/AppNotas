import { db } from './db'

export async function isAuthenticated() {
  const s = await db.session.get('session')
  return !!(s?.accessToken && s?.userId)
}


