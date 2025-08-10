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

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  useEffect(() => { isAuthenticated().then(setAuthed) }, [])
  useEffect(() => {
    const onChange = () => { isAuthenticated().then(setAuthed) }
    window.addEventListener('auth:changed', onChange)
    return () => window.removeEventListener('auth:changed', onChange)
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
