import { useEffect, useState } from 'react'

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const [kind, setKind] = useState<'success' | 'error' | 'info'>('info')
  function show(message: string, k: 'success' | 'error' | 'info' = 'info') {
    setKind(k)
    setMsg(message)
  }
  function Toast() {
    useEffect(() => {
      if (!msg) return
      const t = setTimeout(() => setMsg(null), 2500)
      return () => clearTimeout(t)
    }, [msg])
    if (!msg) return null
    const bg = kind === 'success' ? '#166534' : kind === 'error' ? '#7f1d1d' : '#1f2937'
    return (
      <div aria-live="polite" style={{ position: 'fixed', bottom: 16, left: 16, background: bg, color: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.4)' }}>{msg}</div>
    )
  }
  return { show, Toast }
}


