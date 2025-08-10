import { useEffect, useState } from 'react'
import { listLocalNotes, upsertLocalNote, deleteLocalNote } from '../lib/notes'
import { syncNow } from '../lib/sync'

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const list = await listLocalNotes()
    setNotes(list)
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 720, margin: '20px auto', padding: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={async () => { await syncNow(); await refresh() }}>Sync now</button>
        <button onClick={async () => { const id = crypto.randomUUID(); await upsertLocalNote({ id, title: 'New note', content: '' }); await refresh() }}>New note</button>
      </div>
      {loading ? <div>Loading…</div> : (
        <ul>
          {notes.map(n => (
            <li key={n.id} style={{ border: '1px solid #333', margin: '8px 0', padding: 8 }}>
              <input value={n.title} onChange={async e => { await upsertLocalNote({ id: n.id, title: e.target.value }); await refresh() }} />
              <textarea value={n.content} onChange={async e => { await upsertLocalNote({ id: n.id, content: e.target.value }); await refresh() }} />
              <button onClick={async () => { await deleteLocalNote(n.id); await refresh() }}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


