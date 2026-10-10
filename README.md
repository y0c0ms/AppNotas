# AppNotas

A full-stack notes app with sharing and offline sync, built as a Vite/React PWA and an Express + Prisma API.

Live demo: https://appnotas-7pof.onrender.com

## Features

- Personal notes: create, edit, color, and soft-delete
- Optional due dates with week and month calendar views (web)
- Share notes with collaborators by email; owners can revoke sharing; collaborators can leave
- Offline-first: local IndexedDB cache (Dexie) with mutations synced to the server when online
- Per-device sync with conflict detection
- Installable PWA with service worker and manifest

## Security

- Passwords hashed with Argon2id
- Short-lived JWT access tokens and opaque refresh tokens per device, rotated on refresh
- All notes routes require a Bearer token; shared access is enforced in the database
- Prisma ORM over PostgreSQL
- CORS restricted to `CORS_ORIGIN`; Helmet, compression, and rate limiting enabled on the API

## Stack

- API: Express, Prisma 5, PostgreSQL, TypeScript
- Web: Vite, React 19, React Router, Dexie, ky, Workbox (vite-plugin-pwa), Zod

## Repository layout

- `server/`: Express API, Prisma schema and migrations, sync and sharing routes
- `web/`: Vite + React PWA

## Run it

Requires Node 18+ and PostgreSQL (the `server/docker-compose.yml` starts one on `localhost:5432`, user/password/db `app`).

```bash
# API
cd server
npm install
export DATABASE_URL="postgresql://app:app@localhost:5432/app"
export DIRECT_URL="$DATABASE_URL"
export JWT_SECRET="change-me"
npm run migrate
npm run dev            # or: npm run build && npm start

# Web (in another terminal)
cd web
npm install
export VITE_API_BASE="http://localhost:4000/v1"
npm run dev
```

The API listens on `PORT` (default 4000). `npm install` in `server/` runs `prisma generate` automatically.

## Deploy

- API: Render Web Service (Node 18+)
  - Env: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN=https://your-web`
- Database: Neon (PostgreSQL)
- Web: Render Static Site
  - Root: `web`; Build: `npm ci && npm run build`; Publish: `dist`
  - Env: `VITE_API_BASE=https://your-api/v1`

## PWA notes

- After deploys, hard refresh to update the service worker.
- For SPA routes, the static host needs a rewrite `/* /index.html 200` (`web/public/_redirects` provides this for Netlify-style hosts).

## License

MIT
