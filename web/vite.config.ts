import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiBase = env.VITE_API_BASE || ''
  let apiOrigin = ''
  try { apiOrigin = apiBase ? new URL(apiBase).origin : '' } catch {}

  const escapeForRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const apiPattern = apiOrigin ? new RegExp(`^${escapeForRegExp(apiOrigin)}/.*`) : undefined

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg'],
        manifest: {
          name: 'AppNotas',
          short_name: 'AppNotas',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#0b0b0b',
          theme_color: '#0b0b0b',
          description: 'Notes with sharing and sync',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
          ],
          categories: ['productivity'],
          orientation: 'portrait-primary'
        },
        workbox: {
          navigateFallback: '/index.html',
          runtimeCaching: [
            ...(apiPattern ? [{
              urlPattern: apiPattern,
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200, 401, 403] },
              }
            }] : []),
            {
              urlPattern: ({ request }) => ['style', 'script', 'font', 'image'].includes(request.destination),
              handler: 'StaleWhileRevalidate' as const,
              options: { cacheName: 'assets-cache' }
            }
          ]
        }
      })
    ],
  }
})
