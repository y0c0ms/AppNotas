import { useEffect, useState } from 'react'
import { listLocalNotes, upsertLocalNote, deleteLocalNote } from '../lib/notes'
import { syncNow } from '../lib/sync'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { updateSharing, leaveNote } from '../lib/shareApi'
import { useToast } from '../components/Toast'
import Header from '../components/Header'

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [collabEmail, setCollabEmail] = useState('')
  const { Toast, show } = useToast()
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const list = await listLocalNotes()
    setNotes(list)
  }

  useEffect(() => {
    (async () => {
      await fetchAndCacheNotes().catch(() => {})
      await refresh()
      setLoading(false)
    })()
  }, [])

  return (
    <div style={{ maxWidth: 720, margin: '20px auto', padding: 12 }}>
      <Header />
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!n.isShared} onChange={async e => {
                    try { await updateSharing(n.id, { isShared: e.target.checked }); show('Sharing updated', 'success') } catch { show('Failed to update share', 'error') }
                    await refresh()
                  }} /> Shared
                </label>
                <input placeholder="Add collaborator email" value={collabEmail} onChange={e => setCollabEmail(e.target.value)} style={{ maxWidth: 260 }} />
                <button onClick={async () => {
                  if (!collabEmail) return
                  try { await updateSharing(n.id, { addCollaborators: [collabEmail] }); setCollabEmail(''); show('Collaborator added', 'success') } catch { show('Failed to add', 'error') }
                  await refresh()
                }}>Add</button>
                <button onClick={async () => {
                  if (!collabEmail) return
                  try { await updateSharing(n.id, { removeCollaborators: [collabEmail] }); setCollabEmail(''); show('Collaborator removed', 'success') } catch { show('Failed to remove', 'error') }
                  await refresh()
                }}>Remove</button>
                <button onClick={async () => { try { await leaveNote(n.id); show('Left shared note', 'success') } catch { show('Failed to leave', 'error') } await refresh() }}>Leave</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { await deleteLocalNote(n.id); await refresh() }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Toast />
    </div>
  )
}


