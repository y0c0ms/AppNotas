import { logout } from '../lib/auth'
import { syncNow } from '../lib/sync'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import '../clean.css'

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [syncing, setSyncing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === null ? true : saved === 'true'
  })

  useEffect(() => {
    document.body.classList.toggle('dark-mode', dark)
    localStorage.setItem('darkMode', String(dark))
  }, [dark])

  async function doSync() {
    try {
      setSyncing(true)
      await syncNow()
      // Also refresh lists so shared notes are up-to-date for collaborators
      await fetchAndCacheNotes().catch(() => {})
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header>
      <div className="app-logo">
        <img className="app-icon" src="/icons/icon-192.png" alt="App icon" />
        <button
          className="add-header-btn"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('notes:openAdd'))
          }}
        >
          + Add a Note
        </button>
        <button className="burger" aria-label="Menu" onClick={() => setMenuOpen(s => !s)}>☰</button>
      </div>
      <div className="header-actions">
        <nav className="header-tabs tabs">
          <Link className={`tab ${pathname.startsWith('/notes') ? 'active' : ''}`} to="/notes">Notes</Link>
          <Link className={`tab ${pathname.startsWith('/shared') ? 'active' : ''}`} to="/shared">My Shared Notes</Link>
          <Link className={`tab ${pathname.startsWith('/calendar') ? 'active' : ''}`} to="/calendar">Calendar</Link>
        </nav>
        <div className="split-group">
          <button id="syncNowBtn" className="split-left" onClick={doSync} disabled={syncing}>
            {syncing ? <span className="spinner" aria-hidden="true"></span> : '⟳'} Sync
          </button>
          <button className="split-right" onClick={() => setDark((v) => !v)} title="Toggle dark mode">{dark ? '🌙' : '☀️'}</button>
        </div>
        <button onClick={async () => { await logout(); navigate('/login', { replace: true }) }}>Log out</button>
      </div>
      <aside className={`side-drawer ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)}>
        <div className="drawer" onClick={e => e.stopPropagation()}>
          <nav className="drawer-nav">
            <Link to="/notes" onClick={() => setMenuOpen(false)}>Notes</Link>
            <Link to="/shared" onClick={() => setMenuOpen(false)}>My Shared Notes</Link>
            <Link to="/calendar" onClick={() => setMenuOpen(false)}>Calendar</Link>
            <button onClick={doSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</button>
            <button onClick={() => setDark((v) => !v)}>{dark ? 'Dark' : 'Light'} mode</button>
            <button onClick={async () => { await logout(); navigate('/login', { replace: true }) }}>Log out</button>
          </nav>
        </div>
      </aside>
    </header>
  )
}


