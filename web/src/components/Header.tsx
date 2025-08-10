import { logout } from '../lib/auth'

export default function Header() {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
      <div>AppNotas</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={async () => { await logout(); location.href = '/login' }}>Logout</button>
      </div>
    </header>
  )
}


