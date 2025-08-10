import { useEffect, useState } from 'react'
import { listLocalNotes, upsertLocalNote, deleteLocalNote } from '../lib/notes'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { updateSharing } from '../lib/shareApi'
import { useToast } from '../components/Toast'
import Header from '../components/Header'
import '../clean.css'

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  // Collaborator email input moved to shared view; not used here
  const { Toast, show } = useToast()
  // const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const colorOptions = ['#ffffff', '#deeaff', '#ddffe7', '#ffdddd', '#eddeff']
  const nextColor = (current?: string) => {
    const i = Math.max(0, colorOptions.indexOf(current || '#ffffff'))
    return colorOptions[(i + 1) % colorOptions.length]
  }

  async function refresh() {
    const list = await listLocalNotes()
    setNotes(list)
  }

  useEffect(() => {
    (async () => {
      await fetchAndCacheNotes().catch(() => {})
      await refresh()
    })()
  }, [])

  return (
    <div>
      <Header />

      <main>
        <div className="add-note-container">
          <button className="toggle-add-note" onClick={() => setShowAdd(s => !s)}>
            <span className="plus-icon">＋</span>
            {showAdd ? 'Close' : 'Add a Note'}
          </button>
          <div className={`add-note-form ${showAdd ? 'open' : ''}`}>
            <input id="noteTitleInput" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea id="noteInput" placeholder="Write your note..." value={newContent} onChange={e => setNewContent(e.target.value)} />
            <div className="auth-actions-row">
              <button className="primary-btn add-btn" onClick={async () => {
                const id = crypto.randomUUID()
                await upsertLocalNote({ id, title: newTitle || 'Untitled', content: newContent })
                setNewTitle(''); setNewContent(''); setShowAdd(false); await refresh(); show('Note added', 'success')
              }}>Add</button>
            </div>
          </div>
        </div>

        <div className="notes-columns">
          <div className="notes-column">
            <div className="column-header">Notes without dates</div>
            <div className="notes-list">
              {notes.filter(n => !n.dueAt).map(n => (
                <div key={n.id} className="note-card" style={{ backgroundColor: n.color }}>
                  <div className="note-content">
                    <div className="note-text" style={{ width: '100%' }}>
                      <input className="edit-text-input" value={n.title} onChange={async e => { await upsertLocalNote({ id: n.id, title: e.target.value }); await refresh() }} />
                      <textarea className="edit-text-input" value={n.content} onChange={async e => { await upsertLocalNote({ id: n.id, content: e.target.value }); await refresh() }} />
                    </div>
                    <div className="note-actions" style={{ display: 'flex', gap: 8 }}>
                      <button title="Color" onClick={async () => { await upsertLocalNote({ id: n.id, color: nextColor(n.color) }); await refresh() }}>🎨</button>
                      <button title="Share" onClick={async () => { try { await updateSharing(n.id, { isShared: !n.isShared }); show(n.isShared ? 'Sharing off' : 'Sharing on', 'success') } catch { show('Failed to toggle share', 'error') } await refresh() }}>🤝</button>
                      <button className="delete-note" title="Delete" onClick={async () => { await deleteLocalNote(n.id); await refresh(); show('Note moved to trash', 'success') }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="notes-column">
            <div className="column-header">Notes with dates</div>
            <div className="notes-list">
              {notes.filter(n => !!n.dueAt).map(n => (
                <div key={n.id} className="note-card" style={{ backgroundColor: n.color }}>
                  <div className="note-content">
                    <div className="note-text" style={{ width: '100%' }}>
                      <input className="edit-text-input" value={n.title} onChange={async e => { await upsertLocalNote({ id: n.id, title: e.target.value }); await refresh() }} />
                      <textarea className="edit-text-input" value={n.content} onChange={async e => { await upsertLocalNote({ id: n.id, content: e.target.value }); await refresh() }} />
                    </div>
                    <div className="note-actions" style={{ display: 'flex', gap: 8 }}>
                      <button title="Color" onClick={async () => { await upsertLocalNote({ id: n.id, color: nextColor(n.color) }); await refresh() }}>🎨</button>
                      <button title="Share" onClick={async () => { try { await updateSharing(n.id, { isShared: !n.isShared }); show(n.isShared ? 'Sharing off' : 'Sharing on', 'success') } catch { show('Failed to toggle share', 'error') } await refresh() }}>🤝</button>
                      <button className="delete-note" title="Delete" onClick={async () => { await deleteLocalNote(n.id); await refresh(); show('Note moved to trash', 'success') }}>🗑</button>
                    </div>
                  </div>
                  <div className="note-meta">
                    <div className="note-meta-date">
                      {formatDateTime(n.dueAt as string)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Toast />
    </div>
  )
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso)
    const date = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(d)
    const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d)
    return `${date}  ${time}`
  } catch { return iso }
}


