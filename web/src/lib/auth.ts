import Ky from 'ky'
import { db } from './db'
import { createApi, type LoginResponse } from './api'

const API_BASE = (import.meta as any).env.VITE_API_BASE as string

let inMemoryAccessToken: string | undefined

const raw = Ky.create({ prefixUrl: API_BASE })
const api = createApi(() => inMemoryAccessToken, async () => {
  const r = await refresh()
  return !!r?.accessToken
})

export async function register(email: string, password: string, device: { name: string; platform: string }) {
  const res = await raw.post('auth/register', { json: { email, password, device } }).json<LoginResponse>()
  await persistSession({ ...res, email })
  return res
}

export async function login(email: string, password: string, device: { name: string; platform: string }) {
  const res = await raw.post('auth/login', { json: { email, password, device } }).json<LoginResponse>()
  await persistSession({ ...res, email })
  return res
}

export async function refresh(): Promise<{ accessToken: string; refreshToken: string } | undefined> {
  const session = await db.session.get('session')
  if (!session?.refreshToken || !session.userId || !session.deviceId) return
  const res = await raw.post('auth/refresh', { json: { userId: session.userId, deviceId: session.deviceId, refreshToken: session.refreshToken } }).json<{ accessToken: string; refreshToken: string }>()
  inMemoryAccessToken = res.accessToken
  await db.session.put({ id: 'session', userId: session.userId, deviceId: session.deviceId, accessToken: res.accessToken, refreshToken: res.refreshToken })
  return res
}

export async function logout() {
  const session = await db.session.get('session')
  if (session?.refreshToken) {
    try { await raw.post('auth/logout', { json: { refreshToken: session.refreshToken } }) } catch {}
  }
  inMemoryAccessToken = undefined
  await db.session.delete('session')
}

async function persistSession(r: LoginResponse & { email?: string }) {
  inMemoryAccessToken = r.accessToken
  await db.session.put({ id: 'session', userId: r.userId, deviceId: r.deviceId, accessToken: r.accessToken, refreshToken: r.refreshToken, email: r.email })
}

export function getApi() {
  return api
}

export async function getAccessToken() {
  if (inMemoryAccessToken) return inMemoryAccessToken
  const session = await db.session.get('session')
  inMemoryAccessToken = session?.accessToken
  return inMemoryAccessToken
}


