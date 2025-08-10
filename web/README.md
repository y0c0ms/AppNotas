# AppNotas Web (PWA)

Installable offline-first PWA for AppNotas.

Tech
- Vite + React + TypeScript
- Dexie (IndexedDB) for offline cache
- ky for HTTP
- vite-plugin-pwa + Workbox

Environment
- `VITE_API_BASE` must point to the API, e.g. `https://appnotas-XXX.onrender.com/v1`.

Scripts
- `npm run dev` – dev server
- `npm run build` – production build (outputs to `dist/`)

Deploy (Render Static Site)
- Root: `web`
- Build: `npm ci && npm run build`
- Publish: `dist`
- Env: `VITE_API_BASE`

