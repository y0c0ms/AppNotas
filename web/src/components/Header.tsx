import { logout } from '../lib/auth'
import '../clean.css'

export default function Header() {
  return (
    <header>
      <div className="app-logo">
        <img className="app-icon" src="/icons/icon-192.png" alt="AppNotas" />
        <strong>AppNotas</strong>
      </div>
      <div className="header-actions">
        <nav className="header-tabs">
          <a className="tab" href="/notes">Notes</a>
          <a className="tab" href="/shared">My Shared Notes</a>
        </nav>
        <div className="split-group">
          <a className="split-left" href="#" onClick={(e) => { e.preventDefault(); location.reload() }}>Sync</a>
          <button className="split-right" onClick={async () => { await logout(); location.href = '/login' }}>Log out</button>
        </div>
      </div>
    </header>
  )
}


