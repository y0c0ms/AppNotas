import { useEffect, useState } from 'react'
import { listLocalNotes, upsertLocalNote, deleteLocalNote } from '../lib/notes'
import { syncNow } from '../lib/sync'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { updateSharing, leaveNote } from '../lib/shareApi'
import { useToast } from '../components/Toast'
// import Header from '../components/Header'
import '../clean.css'

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [collabEmail, setCollabEmail] = useState('')
  const { Toast, show } = useToast()
  // const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

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
      <header className="header">
        <div className="app-logo">
          <img className="app-icon" src="/icons/icon-192.png" alt="AppNotas" />
          <h1>AppNotas</h1>
        </div>
        <div className="header-actions">
          <div className="split-group">
            <button id="syncNowBtn" className="split-left" onClick={async () => { await syncNow(); await refresh(); show('Synced', 'success') }}>Sync now</button>
            <button className="split-right" onClick={() => setShowAdd(s => !s)}>Add note</button>
          </div>
          <button onClick={async () => { await syncNow(); location.reload() }}>Refresh</button>
        </div>
      </header>

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

        <div className="notes-list">
          {notes.map(n => (
            <div key={n.id} className="note-card">
              <div className="note-content">
                <div className="note-text" style={{ width: '100%' }}>
                  <input className="edit-text-input" value={n.title} onChange={async e => { await upsertLocalNote({ id: n.id, title: e.target.value }); await refresh() }} />
                  <textarea className="edit-text-input" value={n.content} onChange={async e => { await upsertLocalNote({ id: n.id, content: e.target.value }); await refresh() }} />
                </div>
                <div className="note-actions">
                  <button className="delete-note" title="Delete" onClick={async () => { await deleteLocalNote(n.id); await refresh(); show('Note moved to trash', 'success') }}>🗑</button>
                </div>
              </div>
              <div className="note-meta">
                <div className="note-meta-item">
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input type="checkbox" checked={!!n.isShared} onChange={async e => {
                      try { await updateSharing(n.id, { isShared: e.target.checked }); show('Sharing updated', 'success') } catch { show('Failed to update share', 'error') }
                      await refresh()
                    }} /> Shared
                  </label>
                </div>
                <div className="share-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input placeholder="Collaborator email" value={collabEmail} onChange={e => setCollabEmail(e.target.value)} />
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
              </div>
            </div>
          ))}
        </div>
      </main>
      <Toast />
    </div>
  )
}


