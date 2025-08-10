import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import './App.css'
import LoginPage from './pages/Login'
import NotesPage from './pages/Notes'
import { useEffect, useState } from 'react'
import { isAuthenticated } from './lib/session'

function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  useEffect(() => { isAuthenticated().then(setAuthed) }, [])
  if (authed === null) return null
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={authed ? '/notes' : '/login'} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div>Register TBD</div>} />
        <Route path="/notes" element={authed ? <NotesPage /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
