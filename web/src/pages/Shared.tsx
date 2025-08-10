import { useEffect, useRef, useState } from 'react'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { db } from '../lib/db'
import { getSession } from '../lib/session'
import Header from '../components/Header'
import { continueMarkdownListOnEnter, insertPrefixAtCursor } from '../lib/md'
import { updateSharing, leaveNote } from '../lib/shareApi'
import { upsertLocalNote } from '../lib/notes'
import '../clean.css'

export default function SharedPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [collabInput, setCollabInput] = useState<string>('')

  useEffect(() => {
    (async () => {
      await fetchAndCacheNotes().catch(() => {})
      const s = await getSession()
      const all = await db.notes.orderBy('updatedAt').reverse().toArray()
      const shared = all.filter(n => n.isShared || n.userId !== s?.userId)
      setNotes(shared)
    })()
  }, [])

  return (
    <>
      <Header />
      <main>
        <div className="notes-list" id="sharedNotesList">
          {notes.map(n => (
            <SharedCard key={n.id} note={n} editingId={editingId} setEditingId={setEditingId} collabInput={collabInput} setCollabInput={setCollabInput} />
          ))}
        </div>
    </main>
    </>
  )
}

function SharedCard({ note, editingId, setEditingId, collabInput, setCollabInput }: any) {
  const isEditing = editingId === note.id
  const taRef = useRef<HTMLTextAreaElement | null>(null)
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
              <div className="note-input-toolbar">
                <button onClick={e => { e.preventDefault(); if (taRef.current) insertPrefixAtCursor(taRef.current, '• ') }}>•</button>
                <button onClick={e => { e.preventDefault(); if (taRef.current) insertPrefixAtCursor(taRef.current, '1. ') }}>1.</button>
              </div>
              <textarea ref={taRef} className="edit-text-input" defaultValue={note.content} onKeyDown={continueMarkdownListOnEnter as any} />
            </>
          )}
        </div>
        <div className="note-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="edit-note" title="Edit note" onClick={() => setEditingId(isEditing ? null : note.id)}>✏️</button>
        </div>
      </div>
      {isEditing && (
        <div className="note-edit-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="share-toggle">
            <input type="checkbox" defaultChecked={!!note.isShared} onChange={async (e) => { await updateSharing(note.id, { isShared: e.target.checked }); }} /> Share this note
          </label>
          <div className="share-row">
            <input type="text" placeholder="Collaborator emails, comma separated" value={collabInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCollabInput(e.target.value)} />
          </div>
          <button className="primary-btn" onClick={async () => {
            const emails = collabInput.split(',').map((s: string) => s.trim()).filter(Boolean)
            if (emails.length) await updateSharing(note.id, { addCollaborators: emails })
            const val = taRef.current?.value ?? note.content
            await upsertLocalNote({ id: note.id, content: val, title: val.split('\n')[0]?.slice(0, 60) || note.title })
            setEditingId(null)
          }}>Save</button>
          <button className="secondary-btn" onClick={async () => { await leaveNote(note.id); setEditingId(null) }}>Delete</button>
          <div style={{ fontSize: '.9rem', opacity: .8 }}>
            {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''} {note.ownerEmail ? ` • Owner: ${note.ownerEmail}` : ''}
          </div>
        </div>
      )}
    </div>
  )
}


