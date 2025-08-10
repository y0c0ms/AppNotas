import { useState } from 'react'
import { register as registerUser } from '../lib/auth'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(undefined)
    try {
      await registerUser(email, password, { name: navigator.userAgent, platform: 'web' })
      location.href = '/notes'
    } catch (e: any) {
      setError(e?.message || 'Register failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '40px auto' }}>
      <h1>Register</h1>
      <form onSubmit={submit}>
        <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button disabled={loading} type="submit">{loading ? 'Creating…' : 'Create account'}</button>
      </form>
    </div>
  )
}


