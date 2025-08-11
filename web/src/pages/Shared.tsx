import { useEffect, useRef, useState } from 'react'
import { fetchAndCacheNotes, fetchNotesLists } from '../lib/notesApi'
// import { db } from '../lib/db'
import { getSession } from '../lib/session'
import Header from '../components/Header'
import { continueMarkdownListOnEnter, insertPrefixAtCursor } from '../lib/md'
import { updateSharing, leaveNote } from '../lib/shareApi'
import { upsertLocalNote } from '../lib/notes'
import { syncNow } from '../lib/sync'
import '../clean.css'

export default function SharedPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [collabInput, setCollabInput] = useState<string>('')
  const [confirm, setConfirm] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    reload()
  }, [])

  async function reload() {
    // Server is the source of truth for shared visibility
    try { await fetchAndCacheNotes() } catch {}
    const lists = await fetchNotesLists().catch(() => ({ own: [], shared: [] }))
    try { const s = await getSession(); setCurrentUserId(s?.userId ?? null) } catch {}
    // const s = await getSession()
    // Build shared view from server lists: shared with me + my own notes that are shared
    const ownShared = (lists.own || []).filter(n => n.isShared && !n.deletedAt)
    const sharedWithMe = (lists.shared || []).filter(n => !n.deletedAt)
    const dedup = new Map<string, any>()
    for (const n of [...ownShared, ...sharedWithMe]) dedup.set(n.id, n)
    const result = Array.from(dedup.values()).map(n => ({ ...n, ownerEmail: n.user?.email }))
    setNotes(result)
  }

  return (
    <>
      <Header />
      <main>
        <div className="notes-list" id="sharedNotesList">
          {notes.map(n => (
            <SharedCard key={n.id} note={n} editingId={editingId} setEditingId={setEditingId} collabInput={collabInput} setCollabInput={setCollabInput} onReload={reload} setConfirm={setConfirm} currentUserId={currentUserId} />
          ))}
        </div>
        {confirm && (
          <div className="note-popup" role="dialog" aria-modal="true">
            <div>Remove yourself from this shared note?</div>
            <div className="actions">
              <button onClick={() => setConfirm(null)}>Cancel</button>
              <button className="secondary-btn" onClick={async () => { await leaveNote(confirm); setConfirm(null); await reload(); }}>Remove me</button>
            </div>
          </div>
        )}
    </main>
    </>
  )
}
function SharedCard({ note, editingId, setEditingId, collabInput, setCollabInput, onReload, setConfirm, currentUserId }: any) {
  const isEditing = editingId === note.id
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const dark = document.body.classList.contains('dark-mode')
  const colorPresets = dark
    ? ['#2d2e40', '#3a4157', '#2f4f4f', '#4b3a3a', '#394a3a', '#38404d']
    : ['#ffffff', '#deeaff', '#ddffe7', '#ffdddd', '#fff59d', '#eddeff']
  const [showColors, setShowColors] = useState(false)
  return (
    <div className="note-card">
      <div className="note-content">
        <div className="note-text" style={{ width: '100%' }}>
          {!isEditing ? (
            <div>
              <div style={{ fontWeight: 600 }}>{note.title}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
            </div>
          ) : (
            <>
              {note.userId === currentUserId && (
                <input className="edit-text-input" defaultValue={note.title} style={{ marginBottom: 8 }} readOnly />
              )}
              <div className="note-input-toolbar">
                <button onClick={e => { e.preventDefault(); if (taRef.current) insertPrefixAtCursor(taRef.current, '• ') }}>•</button>
                <button onClick={e => { e.preventDefault(); if (taRef.current) insertPrefixAtCursor(taRef.current, '1. ') }}>1.</button>
              </div>
              <textarea ref={taRef} className="edit-text-input" defaultValue={note.content} onKeyDown={continueMarkdownListOnEnter as any} />
            </>
          )}
        </div>
        <div className="note-actions" style={{ display: 'flex', gap: 8 }}>
          <button title="Pin" onClick={async () => { await upsertLocalNote({ id: note.id, pinned: !note.pinned }); await syncNow(); await onReload() }}>📌</button>
          <button title="Color" onClick={() => setShowColors(s => !s)} style={{ width: 28, height: 28, borderRadius: 16, background: note.color, border: '1px solid var(--border-color)' }} />
          <button title="Add/Edit date" onClick={async () => {
            const current = note.dueAt ? new Date(note.dueAt) : null
            let value = prompt('Set date/time (YYYY-MM-DDTHH:mm). Empty to clear:', current ? new Date(current.getTime() - current.getTimezoneOffset()*60000).toISOString().slice(0,16) : '')
            if (value === null) return
            value = value.trim()
            await upsertLocalNote({ id: note.id, dueAt: value ? new Date(value).toISOString() : null }); await syncNow(); await onReload()
          }}>📅</button>
          <button title={note.isList ? 'Switch to Note' : 'Switch to List'} onClick={async () => { await upsertLocalNote({ id: note.id, isList: !note.isList }); await syncNow(); await onReload() }}>{note.isList ? '📝' : '☑'}</button>
          <button className="edit-note" title="Edit note" onClick={() => setEditingId(isEditing ? null : note.id)}>✏️</button>
        </div>
      </div>
      {showColors && (
        <div className="color-selector" style={{ marginTop: 6 }}>
          <div className="color-options">
            {colorPresets.map(c => (
              <button key={c} className="color-option" style={{ background: c }} onClick={async () => { await upsertLocalNote({ id: note.id, color: c }); setShowColors(false); await syncNow(); await onReload() }} />
            ))}
          </div>
        </div>
      )}
      {isEditing && (
        <div className="note-edit-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {note.userId === currentUserId && (
            <>
              <label className="share-toggle">
                <input type="checkbox" defaultChecked={!!note.isShared} onChange={async (e) => { await updateSharing(note.id, { isShared: e.target.checked }); }} /> Share this note
              </label>
              <div className="share-row">
                <input type="text" placeholder="Collaborator emails, comma separated" value={collabInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCollabInput(e.target.value)} />
              </div>
            </>
          )}
          <button className="primary-btn" onClick={async () => {
            try {
              const val = taRef.current?.value ?? note.content
              let newTitle = note.title
              if (note.userId === currentUserId) {
                const first = (val || '').split('\n')[0]?.slice(0, 60) || note.title
                newTitle = first
              }
              await upsertLocalNote({ id: note.id, content: val, title: newTitle })
              const emails = collabInput.split(',').map((s: string) => s.trim()).filter(Boolean)
              if (note.userId === currentUserId && emails.length) {
                await updateSharing(note.id, { addCollaborators: emails })
              }
            } catch (e) {
              console.warn('Save failed', (e as any)?.message)
            } finally {
              // Close editor immediately for snappy UX; sync / reload in background
              setEditingId(null)
              setCollabInput('')
              try { await syncNow() } catch {}
              setTimeout(() => { onReload().catch?.(()=>{}) }, 200)
            }
          }}>Save</button>
          <button className="secondary-btn" onClick={async () => {
            const me = await getSession()
            if (note.userId === me?.userId) {
              const now = new Date().toISOString()
              await upsertLocalNote({ id: note.id, deletedAt: now, updatedAt: now })
              await syncNow()
              setEditingId(null)
              await onReload()
            } else {
              // show confirmation popup
              setConfirm(note.id)
            }
          }}>Delete</button>
          <div style={{ fontSize: '.9rem', opacity: .8 }}>
            {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''} {note.ownerEmail ? ` • Owner: ${note.ownerEmail}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}


