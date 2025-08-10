import { logout } from '../lib/auth'
import { syncNow } from '../lib/sync'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import '../clean.css'

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [syncing, setSyncing] = useState(false)
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
    } finally {
      setSyncing(false)
    }
  }

  return (
    <header>
      <div className="app-logo">
        <img className="app-icon" src="/icons/icon-192.png" alt="AppNotas" />
        <strong>AppNotas</strong>
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
    </header>
  )
}


