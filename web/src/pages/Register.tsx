import { useState } from 'react'
import { register as registerUser } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import '../clean.css'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(undefined)
    try {
      await registerUser(email, password, { name: navigator.userAgent, platform: 'web' })
      navigate('/notes', { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Register failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <div className="auth-view" style={{ display: 'block' }}>
        <div className="auth-card">
          <h2>Create account</h2>
          <div className="auth-sub">Start using AppNotas</div>
          <form className="auth-form" onSubmit={submit}>
            <label>
              <span>Email</span>
              <input placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label>
              <span>Password</span>
              <input placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-actions-row">
              <a className="secondary-btn" href="/login" style={{ textAlign: 'center', textDecoration: 'none' }}>Back</a>
              <button className="primary-btn" disabled={loading} type="submit">{loading ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}


