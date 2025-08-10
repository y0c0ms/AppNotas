import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../lib/auth'
import '../clean.css'

export default function LoginPage() {
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
      await login(email, password, { name: navigator.userAgent, platform: 'web' })
      navigate('/notes', { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <div className="auth-view" id="authView" style={{ display: 'block' }}>
        <div className="auth-card">
          <h2>Welcome back</h2>
          <div className="auth-sub">Sign in to continue</div>
          <form className="auth-form" onSubmit={submit}>
            <label>
              <span>Email</span>
              <input placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label>
              <span>Password</span>
              <input placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            {error && <div className="auth-error" id="authError">{error}</div>}
            <div className="auth-actions-row">
              <button className="primary-btn" disabled={loading} type="submit">{loading ? 'Signing in…' : 'Login'}</button>
              <Link className="secondary-btn" to="/register" style={{ textAlign: 'center', textDecoration: 'none' }}>Register</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}


