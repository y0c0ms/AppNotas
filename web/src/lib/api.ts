import Ky, { type KyInstance } from 'ky'

const API_BASE = (import.meta as any).env.VITE_API_BASE as string

export function createApi(
  getAccessToken: () => string | undefined,
  onUnauthorized?: () => Promise<boolean>
) {
  let api: KyInstance
  api = Ky.create({
    prefixUrl: API_BASE,
    hooks: {
      beforeRequest: [
        (req) => {
          const token = getAccessToken()
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


