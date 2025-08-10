import Ky from 'ky'
import { db } from './db'
import { createApi, type LoginResponse } from './api'

const API_BASE = (import.meta as any).env.VITE_API_BASE as string

let inMemoryAccessToken: string | undefined
let refreshInFlight: Promise<boolean> | null = null

const raw = Ky.create({ prefixUrl: API_BASE })
const api = createApi(() => inMemoryAccessToken, async () => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const r = await refresh().catch(() => undefined)
      return !!r?.accessToken
    })()
    const done = await refreshInFlight
    refreshInFlight = null
    return done
  }
  return refreshInFlight
})

export async function register(email: string, password: string, device: { name: string; platform: string }) {
  const res = await raw.post('auth/register', { json: { email, password, device } }).json<LoginResponse>()
  await persistSession({ ...res, email })
  notifyAuthChanged()
  return res
}

export async function login(email: string, password: string, device: { name: string; platform: string }) {
  const res = await raw.post('auth/login', { json: { email, password, device } }).json<LoginResponse>()
  await persistSession({ ...res, email })
  notifyAuthChanged()
  return res
}

export async function refresh(): Promise<{ accessToken: string; refreshToken: string } | undefined> {
  const session = await db.session.get('session')
  if (!session?.refreshToken || !session.userId || !session.deviceId) return
  try {
    const res = await raw.post('auth/refresh', { json: { userId: session.userId, deviceId: session.deviceId, refreshToken: session.refreshToken } }).json<{ accessToken: string; refreshToken: string }>()
    inMemoryAccessToken = res.accessToken
    await db.session.put({ id: 'session', userId: session.userId, deviceId: session.deviceId, accessToken: res.accessToken, refreshToken: res.refreshToken, email: session.email })
    return res
  } catch (e: any) {
    // If refresh token is invalid/expired, force logout
    await logout()
    try { location.href = '/login' } catch {}
    return undefined
  }
}

export async function logout() {
  const session = await db.session.get('session')
  if (session?.refreshToken) {
    try { await raw.post('auth/logout', { json: { refreshToken: session.refreshToken } }) } catch {}
  }
  inMemoryAccessToken = undefined
  await db.session.delete('session')
  notifyAuthChanged()
}

async function persistSession(r: LoginResponse & { email?: string }) {
  inMemoryAccessToken = r.accessToken
  await db.session.put({ id: 'session', userId: r.userId, deviceId: r.deviceId, accessToken: r.accessToken, refreshToken: r.refreshToken, email: r.email })
}

export function getApi() { return api }

export async function getAccessToken() {
  if (inMemoryAccessToken) return inMemoryAccessToken
  const session = await db.session.get('session')
  if (session?.accessToken) {
    inMemoryAccessToken = session.accessToken
    return inMemoryAccessToken
  }
  // No token in memory or storage; try a refresh once if refresh token exists
  if (session?.refreshToken && session.userId && session.deviceId) {
    const r = await refresh().catch(() => undefined)
    return r?.accessToken
  }
  return undefined
}

function notifyAuthChanged() {
  try { window.dispatchEvent(new CustomEvent('auth:changed')) } catch {}
}


