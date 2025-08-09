# CleanAppNotas

<img src="public/favicon.png" alt="CleanAppNotas Logo" width="100"/>

A lightweight, efficient note-taking application with calendar integration and minimalist design.

## 🚀 Features

- **Intuitive Note Management**: Create, edit, and organize notes with ease
- **Drag & Drop**: Reorder notes naturally
- **Optional Date/Time & Recurrence**: Add scheduling metadata when needed
- **Calendar Integration**: View notes by day, week, or month (week shows current day in second column)
- **Color Categories**: Organize notes with customizable color coding
- **Dark/Light Mode**: Switch between themes based on your preference
- **System Tray Integration**: Quick access without cluttering your taskbar
- **Auto-start on Windows**: Starts minimized to tray on login (configurable)
- **Offline First**: Works without internet; data stored locally with periodic auto-save

## 📥 Quick Installation

1. Download the installer from the [releases](releases) directory
2. Run `CleanAppNotas-Setup-1.0.0.exe`
3. Launch from desktop or start menu

## 🔧 Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
# Install dependencies
npm install

# Start in development mode
npm start

# Build installer
npm run build
```

## 🧭 Vision & Roadmap

Goal: Keep the fast, minimalist desktop app while adding optional, secure cloud sync and an Android companion app.

- **Phase 1: Sync-Ready Data Layer (local)**
  - Abstract persistence (localStorage → repository interface)
  - Add auto-save and safe backups (done), add schema versioning and migrations
- **Phase 2: API + Database**
  - REST API with JWT (or sessions) for accounts
  - Notes CRUD, delta-based sync (timestamp + version), basic conflict strategy (LWW initially)
  - Database: PostgreSQL or SQLite + Prisma/Knex; migrations and indexing
- **Phase 3: Security**
  - HTTPS/TLS, secure cookie or short-lived JWT + refresh tokens
  - Encryption at rest on server (transparent)
  - Optional end-to-end encryption (E2EE) with a per-user key derived via Argon2id; keys stored locally/OS keystore; zero-knowledge server
- **Phase 4: Android App**
  - Offline cache (Room/SQLDelight), background sync, parity with desktop core features
- **Phase 5: Extras**
  - Push notifications, attachments/images, import/export, sharing

## 🔐 Security & Privacy

- **Transport**: HTTPS/TLS only
- **Auth**: Email/password with Argon2id; option for OAuth later
- **Tokens**: Short-lived access tokens + refresh tokens (secure cookie / HttpOnly)
- **Server encryption**: At-rest encryption on DB or volume level
- **E2EE (optional)**: Client-side encryption keys never leave the device (libsodium/crypto.subtle); server stores only ciphertext
- **Logging/Telemetry**: Minimal, opt-in; redact PII; no plaintext content in logs

## 🧪 Current App Audit Checklist (to prepare for sync)

- **State model**: Each note has stable `id`, `text`, `date`, `time`, `isRecurring`, `showInCalendar`, `color`
- **IDs**: Ensure globally unique (UUID v4) to avoid collisions across devices
- **Repository abstraction**: Introduce `NotesRepository` (local) to swap in remote sync later
- **Schema versioning**: Track `notes_schema_version`; add migrations for new fields
- **Conflict policy**: Decide LWW now, design hooks for E2EE-friendly merges
- **IPC boundaries**: Review `main.js` vs `renderer` communication; add typed channels if needed
- **Resilience**: Crash-safe saves, backups, retry logic for sync
- **Packaging**: Ensure auto-start, tray behavior, and graceful shutdown save
- **Performance**: Profiling when idle/backgrounded (already present), test with large note sets

## ✅ Next Steps (this repo)

- Add a `data/` module exposing a `NotesRepository` interface (local impl uses localStorage)
- Introduce schema version + migration helper
- Add UUIDs for new notes
- Wire a “Sync” toggle (disabled until API is ready)
- Prepare an environment config layer for future API base URL and feature flags

## 📚 Documentation

- [Installation Guide](INSTALL.md)
- [Repository Setup](REPOSITORY-SETUP.md)
- [Changelog](CHANGELOG.md)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ for productivity</p>