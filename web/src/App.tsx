import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/Login'
import NotesPage from './pages/Notes'
import SharedPage from './pages/Shared'
import CalendarPage from './pages/Calendar'
import RegisterPage from './pages/Register'
import { useEffect, useState } from 'react'
import { isAuthenticated } from './lib/session'
import { syncNow } from './lib/sync'
import './styles/core.css'
import './styles/header.css'
import './styles/notes.css'
import './styles/calendar.css'
import './styles/auth.css'
import './styles/components.css'

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  useEffect(() => { isAuthenticated().then(setAuthed) }, [])
  useEffect(() => {
    const onChange = () => { isAuthenticated().then(setAuthed) }
    window.addEventListener('auth:changed', onChange)
    const onExpired = () => {
      setAuthed(false)
      const modal = document.createElement('div')
      modal.className = 'note-popup'
      modal.setAttribute('role','dialog')
      modal.setAttribute('aria-modal','true')
      modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
          <div>Your session expired. Please log in again.</div>
          <button id="closeExpire" class="icon-btn" aria-label="Close">✕</button>
        </div>
        <div class="actions"><button id="reloginBtn" class="primary-btn">Log in</button></div>`
      document.body.appendChild(modal)
      const btn = modal.querySelector('#reloginBtn') as HTMLButtonElement
      const close = modal.querySelector('#closeExpire') as HTMLButtonElement
      btn?.addEventListener('click', () => {
        try { window.location.hash = '#/login' } catch {}
        setTimeout(() => modal.remove(), 0)
      })
      close?.addEventListener('click', () => modal.remove())
    }
    window.addEventListener('auth:expired', onExpired)
    return () => { window.removeEventListener('auth:changed', onChange); window.removeEventListener('auth:expired', onExpired) }
  }, [])
  useEffect(() => {
    const onFocus = () => { syncNow().catch(() => {}) }
    window.addEventListener('focus', onFocus)
    const t = setInterval(() => { syncNow().catch(() => {}) }, 5 * 60 * 1000)
    return () => { window.removeEventListener('focus', onFocus); clearInterval(t) }
  }, [])
  if (authed === null) return null
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to={authed ? '/notes' : '/login'} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/notes" element={authed ? <NotesPage /> : <Navigate to="/login" replace />} />
        <Route path="/shared" element={authed ? <SharedPage /> : <Navigate to="/login" replace />} />
        <Route path="/calendar" element={authed ? <CalendarPage /> : <Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}

export default App
