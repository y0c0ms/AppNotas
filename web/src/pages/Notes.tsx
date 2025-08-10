import { useEffect, useRef, useState } from 'react'
import { listLocalNotes, upsertLocalNote, deleteLocalNote } from '../lib/notes'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { updateSharing } from '../lib/shareApi'
import { useToast } from '../components/Toast'
import Header from '../components/Header'
import { syncNow } from '../lib/sync'
import '../clean.css'
import { insertPrefixAtCursor, continueMarkdownListOnEnter, toggleTaskAtCursor } from '../lib/md'

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  // Collaborator email input moved to shared view; not used here
  const { Toast, show } = useToast()
  // const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [shareChecked, setShareChecked] = useState(false)
  const [shareEmails, setShareEmails] = useState('')
  const addTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  // share editor per-note
  const [shareEditId, setShareEditId] = useState<string | null>(null)
  const [shareEditChecked, setShareEditChecked] = useState(false)
  const [shareEditEmails, setShareEditEmails] = useState('')
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
            <div className="note-input-toolbar">
              <button onClick={e => { e.preventDefault(); if (addTextareaRef.current) insertPrefixAtCursor(addTextareaRef.current, '• ') }}>•</button>
              <button onClick={e => { e.preventDefault(); if (addTextareaRef.current) insertPrefixAtCursor(addTextareaRef.current, '1. ') }}>1.</button>
              <button onClick={e => { e.preventDefault(); if (addTextareaRef.current) toggleTaskAtCursor(addTextareaRef.current) }}>☑</button>
            </div>
            <textarea ref={addTextareaRef} id="noteInput" placeholder="Write your note..." value={newContent} onChange={e => setNewContent(e.target.value)} onKeyDown={continueMarkdownListOnEnter as any} />
            <div className="share-toggle">
              <input id="shareNoteCheck" type="checkbox" checked={shareChecked} onChange={e => setShareChecked(e.target.checked)} /> Share this note
            </div>
            <div className="share-row" id="shareEmailsRow" style={{ display: shareChecked ? 'block' : 'none' }}>
              <input id="shareEmails" placeholder="Collaborator emails, comma separated" value={shareEmails} onChange={e => setShareEmails(e.target.value)} />
            </div>
            <div className="auth-actions-row">
              <button className="primary-btn add-btn" onClick={async () => {
                const id = crypto.randomUUID()
                const isShared = shareChecked
                const collaborators = shareEmails.split(',').map(s => s.trim()).filter(Boolean)
                await upsertLocalNote({ id, title: newTitle || 'Untitled', content: newContent, isShared })
                if (isShared && collaborators.length) {
                  try {
                    // Ensure the note exists on the server before sharing
                    await syncNow()
                    await updateSharing(id, { isShared: true, addCollaborators: collaborators })
                  } catch {}
                }
                setNewTitle(''); setNewContent(''); setShareChecked(false); setShareEmails(''); setShowAdd(false); await refresh(); show('Note added', 'success')
              }}>Add</button>
            </div>
          </div>
        </div>

        <div className="notes-columns">
          <div className="notes-column">
            <div className="column-header">Notes without dates</div>
            <div className="notes-list">
              {notes.filter(n => !n.dueAt && !n.isShared).map(n => (
                <div key={n.id} className="note-card" style={{ backgroundColor: n.color }}>
                  <div className="note-content">
                    <div className="note-text" style={{ width: '100%' }}>
                      <input className="edit-text-input" value={n.title} onChange={async e => { await upsertLocalNote({ id: n.id, title: e.target.value }); await refresh() }} />
                      <textarea className="edit-text-input" value={n.content} onChange={async e => { await upsertLocalNote({ id: n.id, content: e.target.value }); await refresh() }} />
                    </div>
                    <div className="note-actions" style={{ display: 'flex', gap: 8 }}>
                      <button title="Color" onClick={async () => { await upsertLocalNote({ id: n.id, color: nextColor(n.color) }); await refresh() }}>🎨</button>
                      <button title="Share" onClick={() => { setShareEditId(n.id); setShareEditChecked(!!n.isShared); setShareEditEmails('') }}>🤝</button>
                      <button className="delete-note" title="Delete" onClick={async () => {
                        await deleteLocalNote(n.id)
                        // enqueue delete op already done in deleteLocalNote
                        await syncNow()
                        await refresh()
                        show('Note moved to trash', 'success')
                      }}>🗑</button>
                    </div>
                  </div>
                {shareEditId === n.id && (
                  <div className="note-edit-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                    <label className="share-toggle"><input type="checkbox" checked={shareEditChecked} onChange={e => setShareEditChecked(e.target.checked)} /> Share this note</label>
                    {shareEditChecked && (
                      <div className="share-row"><input placeholder="Collaborator emails, comma separated" value={shareEditEmails} onChange={e => setShareEditEmails(e.target.value)} /></div>
                    )}
                    <button className="primary-btn" onClick={async () => {
                      const emails = shareEditEmails.split(',').map(s => s.trim()).filter(Boolean)
                      try { await updateSharing(n.id, { isShared: shareEditChecked, addCollaborators: emails }); show('Sharing updated', 'success') } catch { show('Share update failed', 'error') }
                      finally { setShareEditId(null); await refresh() }
                    }}>Save</button>
                    <button className="secondary-btn" onClick={() => setShareEditId(null)}>Close</button>
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
          <div className="notes-column">
            <div className="column-header">Notes with dates</div>
            <div className="notes-list">
              {notes.filter(n => !!n.dueAt && !n.isShared).map(n => (
                <div key={n.id} className="note-card" style={{ backgroundColor: n.color }}>
                  <div className="note-content">
                    <div className="note-text" style={{ width: '100%' }}>
                      <input className="edit-text-input" value={n.title} onChange={async e => { await upsertLocalNote({ id: n.id, title: e.target.value }); await refresh() }} />
                      <textarea className="edit-text-input" value={n.content} onChange={async e => { await upsertLocalNote({ id: n.id, content: e.target.value }); await refresh() }} />
                    </div>
                    <div className="note-actions" style={{ display: 'flex', gap: 8 }}>
                      <button title="Color" onClick={async () => { await upsertLocalNote({ id: n.id, color: nextColor(n.color) }); await refresh() }}>🎨</button>
                      <button title="Share" onClick={() => { setShareEditId(n.id); setShareEditChecked(!!n.isShared); setShareEditEmails('') }}>🤝</button>
                      <button className="delete-note" title="Delete" onClick={async () => {
                        await deleteLocalNote(n.id)
                        await syncNow()
                        await refresh()
                        show('Note moved to trash', 'success')
                      }}>🗑</button>
                    </div>
                  </div>
                  <div className="note-meta">
                    <div className="note-meta-date">
                      {formatDateTime(n.dueAt as string)}
                    </div>
                  </div>
                  {shareEditId === n.id && (
                    <div className="note-edit-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                      <label className="share-toggle"><input type="checkbox" checked={shareEditChecked} onChange={e => setShareEditChecked(e.target.checked)} /> Share this note</label>
                      {shareEditChecked && (
                        <div className="share-row"><input placeholder="Collaborator emails, comma separated" value={shareEditEmails} onChange={e => setShareEditEmails(e.target.value)} /></div>
                      )}
                      <button className="primary-btn" onClick={async () => {
                        const emails = shareEditEmails.split(',').map(s => s.trim()).filter(Boolean)
                        try { await updateSharing(n.id, { isShared: shareEditChecked, addCollaborators: emails }); show('Sharing updated', 'success') } catch { show('Share update failed', 'error') }
                        finally { setShareEditId(null); await refresh() }
                      }}>Save</button>
                      <button className="secondary-btn" onClick={() => setShareEditId(null)}>Close</button>
                    </div>
                  )}
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


