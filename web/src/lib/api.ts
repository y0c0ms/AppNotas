import Ky, { type KyInstance } from 'ky'

const envBase = (import.meta as any).env?.VITE_API_BASE as string | undefined
const API_BASE = envBase && envBase.length > 0 ? envBase : 'https://appnotas-7pof.onrender.com/v1'

export function createApi(
  getAccessToken: () => string | undefined | Promise<string | undefined>,
  onUnauthorized?: () => Promise<boolean>
) {
  let api: KyInstance
  api = Ky.create({
    prefixUrl: API_BASE,
    hooks: {
      beforeRequest: [
        async (req) => {
          const token = await getAccessToken()
          if (token) req.headers.set('Authorization', `Bearer ${token}`)
        }
      ],
      afterResponse: [
        async (request, options, response) => {
          if (response.status === 401 && onUnauthorized) {
            const ok = await onUnauthorized()
            if (ok) {
              return api(request, options)
            }
          }
          return response
        }
      ]
    }
  })
  return api
}

export type LoginResponse = {
  userId: string
  deviceId: string
  accessToken: string
  refreshToken: string
}


