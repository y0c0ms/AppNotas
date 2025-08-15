import { useEffect, useRef, useState } from 'react'
// import { fetchAndCacheNotes } from '../lib/notesApi'
import { db } from '../lib/db'
import { getSession } from '../lib/session'
import Header from '../components/Header'
import LazyList from '../components/LazyList'
import { continueMarkdownListOnEnter, insertPrefixAtCursor } from '../lib/md'
import { updateSharing, leaveNote } from '../lib/shareApi'
import { upsertLocalNote, updateLocalFields } from '../lib/notes'
import { updateNotePrefs } from '../lib/notesPrefs'
import { syncNow } from '../lib/sync'
import '../styles/core.css'
import '../styles/header.css'
import '../styles/notes.css'
import '../styles/components.css'
import Swipeable from '../components/Swipe'
import Collapsible from '../components/Collapsible'

export default function SharedPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [collabInput, setCollabInput] = useState<string>('')
  const [confirm, setConfirm] = useState<string | null>(null)
  // filters
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<'all'|'mine'|'others'>('all')
  const [typeFilter, setTypeFilter] = useState<'all'|'list'|'note'>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  // no global date pickers

  useEffect(() => {
    reload()
    const onFetched = () => reload()
    window.addEventListener('notes:fetched', onFetched)
    return () => window.removeEventListener('notes:fetched', onFetched)
  }, [])

  async function reload() {
    // Prefer local cache to avoid hammering API; initial fetch happens elsewhere
    try { const s = await getSession(); setCurrentUserId(s?.userId ?? null) } catch {}
    const s = await getSession()
    const all = await db.notes.orderBy('updatedAt').reverse().toArray()
    const filtered = all.filter(n => !n.deletedAt && (n.userId !== s?.userId || n.isShared))
    setNotes(filtered)
  }

  return (
    <>
      <Header />
      <main>
        <div className="filters-row">
          <input className="search-input" placeholder="Search shared notes..." value={query} onChange={e => setQuery(e.target.value)} onInput={(e)=>{ const v=(e.target as HTMLInputElement).value; clearTimeout((window as any).__qs); (window as any).__qs=setTimeout(()=>setQuery(v),250) }} />
          <div className="quick-filters">
            <button className={`chip ${ownerFilter==='all'?'active':''}`} onClick={()=>setOwnerFilter('all')}>All</button>
            <button className={`chip ${ownerFilter==='mine'?'active':''}`} onClick={()=>setOwnerFilter('mine')}>Mine</button>
            <button className={`chip ${ownerFilter==='others'?'active':''}`} onClick={()=>setOwnerFilter('others')}>Others</button>
            <button className={`chip ${typeFilter==='all'?'active':''}`} onClick={()=>setTypeFilter('all')}>All types</button>
            <button className={`chip ${typeFilter==='note'?'active':''}`} onClick={()=>setTypeFilter('note')}>Notes</button>
            <button className={`chip ${typeFilter==='list'?'active':''}`} onClick={()=>setTypeFilter('list')}>Lists</button>
            {(ownerFilter!=='all'||typeFilter!=='all'||query) && (
              <button className="chip clear-chip" onClick={()=>{ setQuery(''); setOwnerFilter('all'); setTypeFilter('all') }}>Clear</button>
            )}
          </div>
        </div>
        <div className="group-header">Pinned</div>
        <div className="notes-list" id="sharedNotesListPinned">
          <LazyList items={notes
            .filter(n => n.pinned)
            .filter(n => (n.title+n.content).toLowerCase().includes(query.toLowerCase()))
            .filter(n => ownerFilter==='all' ? true : (ownerFilter==='mine' ? n.userId===currentUserId : n.userId!==currentUserId))
            .filter(n => typeFilter==='all' ? true : (typeFilter==='list' ? n.isList : !n.isList))
          } renderItem={(n: any) => (
            <Swipeable onSwipeLeft={async () => {
              const me = await getSession()
              if (n.userId === me?.userId) {
                const now = new Date().toISOString()
                await upsertLocalNote({ id: n.id, deletedAt: now, updatedAt: now }); await syncNow(); await reload()
              } else {
                setConfirm(n.id)
              }
            }} onSwipeRight={async () => { await updateLocalFields(n.id, { pinned: !n.pinned }); await updateNotePrefs(n.id, { pinned: !n.pinned }); await reload() }}>
              <SharedCard key={n.id} note={n} editingId={editingId} setEditingId={setEditingId} collabInput={collabInput} setCollabInput={setCollabInput} onReload={reload} setConfirm={setConfirm} currentUserId={currentUserId} />
            </Swipeable>
          )} />
        </div>
        <div className="group-header">Others</div>
        <div className="notes-list" id="sharedNotesListOthers">
          <LazyList items={notes
            .filter(n => !n.pinned)
            .filter(n => (n.title+n.content).toLowerCase().includes(query.toLowerCase()))
            .filter(n => ownerFilter==='all' ? true : (ownerFilter==='mine' ? n.userId===currentUserId : n.userId!==currentUserId))
            .filter(n => typeFilter==='all' ? true : (typeFilter==='list' ? n.isList : !n.isList))
          } renderItem={(n: any) => (
            <Swipeable onSwipeLeft={async () => {
              const me = await getSession()
              if (n.userId === me?.userId) {
                const now = new Date().toISOString()
                await upsertLocalNote({ id: n.id, deletedAt: now, updatedAt: now }); await syncNow(); await reload()
              } else {
                setConfirm(n.id)
              }
            }} onSwipeRight={async () => { await updateLocalFields(n.id, { pinned: !n.pinned }); await updateNotePrefs(n.id, { pinned: !n.pinned }); await reload() }}>
              <SharedCard key={n.id} note={n} editingId={editingId} setEditingId={setEditingId} collabInput={collabInput} setCollabInput={setCollabInput} onReload={reload} setConfirm={setConfirm} currentUserId={currentUserId} />
            </Swipeable>
          )} />
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
    ? ['#1E3A8A', '#0F766E', '#7C3AED', '#9D174D', '#A16207', '#14532D']
    : ['#ffffff', '#deeaff', '#ddffe7', '#ffdddd', '#fff59d', '#eddeff']
  const [showColors, setShowColors] = useState(false)
  const parseChecklist = (content: string) => (content || '').split('\n').map((raw, idx) => {
    const mChecked = /^\s*\[x\]\s*/i.exec(raw)
    const mUnchecked = /^\s*\[\s?\]\s*/.exec(raw)
    if (mChecked) return { index: idx, checked: true, text: raw.slice(mChecked[0].length) }
    if (mUnchecked) return { index: idx, checked: false, text: raw.slice(mUnchecked[0].length) }
    return { index: idx, checked: false, text: raw }
  })
  const toggleChecklist = async (noteId: string, content: string, itemIndex: number) => {
    const items = parseChecklist(content)
    items[itemIndex] = { ...items[itemIndex], checked: !items[itemIndex].checked }
    const newContent = [...items.filter(i=>!i.checked), ...items.filter(i=>i.checked)]
      .map(i => (i.checked ? `[x] ${i.text}` : `[ ] ${i.text}`)).join('\n')
    await upsertLocalNote({ id: noteId, content: newContent })
    await onReload()
  }
  const toPlainTextFromChecklist = (content: string) => parseChecklist(content).map(i => i.checked ? `${i.text} ✓` : i.text).join('\n')
  return (
    <div className="note-card">
      <div className="note-content">
        <div className="note-text" style={{ width: '100%' }}>
          {!isEditing ? (
            <div>
              <div style={{ fontWeight: 600 }}>{note.title}</div>
           {!note.isList ? (
              <Collapsible text={note.content} />
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
                  {parseChecklist(note.content).map((it) => (
                    <li key={it.index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <input type="checkbox" checked={it.checked} onChange={() => toggleChecklist(note.id, note.content, it.index)} />
                      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'normal', overflowWrap: 'anywhere', textDecoration: it.checked ? 'line-through' as const : 'none', opacity: it.checked ? 0.7 : 1 }}>{it.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              {note.userId === currentUserId ? (
                <input className="edit-text-input" defaultValue={note.title} style={{ marginBottom: 8 }} onChange={async (e) => { await upsertLocalNote({ id: note.id, title: e.target.value }); await onReload() }} />
              ) : (
                <input className="edit-text-input" defaultValue={note.title} style={{ marginBottom: 8 }} readOnly />
              )}
              {!note.isList ? (
                <>
                  <div className="note-input-toolbar">
                    <button onClick={e => { e.preventDefault(); if (taRef.current) insertPrefixAtCursor(taRef.current, '• ') }}>•</button>
                    <button onClick={e => { e.preventDefault(); if (taRef.current) insertPrefixAtCursor(taRef.current, '1. ') }}>1.</button>
                  </div>
                  <textarea ref={taRef} className="edit-text-input" defaultValue={note.content} onKeyDown={continueMarkdownListOnEnter as any} />
                </>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
                  {parseChecklist(note.content).map((it, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={it.checked} onChange={async () => {
                        const items = parseChecklist(note.content)
                        items[idx] = { ...items[idx], checked: !items[idx].checked }
                        const unchecked = items.filter(i=>!i.checked)
                        const checked = items.filter(i=>i.checked)
                        const newContent = [...unchecked, ...checked].map(i => (i.checked ? `[x] ${i.text}` : `[ ] ${i.text}`)).join('\n')
                        await upsertLocalNote({ id: note.id, content: newContent })
                        await onReload()
                      }} />
                      <input type="text" defaultValue={it.text} onChange={async (e) => {
                        const items = parseChecklist(note.content)
                        items[idx] = { ...items[idx], text: e.target.value }
                        const unchecked = items.filter(i=>!i.checked)
                        const checked = items.filter(i=>i.checked)
                        const newContent = [...unchecked, ...checked].map(i => (i.checked ? `[x] ${i.text}` : `[ ] ${i.text}`)).join('\n')
                        await upsertLocalNote({ id: note.id, content: newContent })
                        await onReload()
                      }} style={{ textDecoration: it.checked ? 'line-through' : 'none', opacity: it.checked ? 0.7 : 1 }} />
                    </li>
                  ))}
                  <li style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" disabled />
                    <input type="text" placeholder="Add item" onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (!val) return
                        const items = parseChecklist(note.content)
                        items.push({ index: items.length, checked: false, text: val })
                        const newContent = items.map(i => (i.checked ? `[x] ${i.text}` : `[ ] ${i.text}`)).join('\n')
                        await upsertLocalNote({ id: note.id, content: newContent })
                        ;(e.target as HTMLInputElement).value = ''
                        await onReload()
                      }
                    }} />
                  </li>
                </ul>
              )}
            </>
          )}
        </div>
        <div className="note-actions" style={{ display: 'flex', gap: 8 }}>
          <button className={`icon-btn pin-btn ${note.pinned ? 'pinned' : ''}`} aria-pressed={note.pinned} title="Pin" onClick={async () => { await updateLocalFields(note.id, { pinned: !note.pinned }); await updateNotePrefs(note.id, { pinned: !note.pinned }); await onReload() }}>📌</button>
          <button className="edit-note" title="Edit note" onClick={() => setEditingId(isEditing ? null : note.id)}>✏️</button>
          <button className="delete-note" title="Delete or Leave" onClick={async () => {
            const me = await getSession()
            if (note.userId === me?.userId) {
              const now = new Date().toISOString()
              await upsertLocalNote({ id: note.id, deletedAt: now, updatedAt: now })
              await syncNow(); await onReload()
            } else {
              setConfirm(note.id)
            }
          }}>🗑</button>
        </div>
      </div>
      {/* color palette toggled below */}
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
          {note.dueAt ? (
            <>
              <button onClick={async () => { await upsertLocalNote({ id: note.id, dueAt: null }); await syncNow(); await onReload() }}>Remove date</button>
              <input type="datetime-local" aria-label="Due date" value={note.dueAt ? new Date(new Date(note.dueAt).getTime() - new Date(note.dueAt).getTimezoneOffset()*60000).toISOString().slice(0,16) : ''} onChange={async (e) => {
                const v = e.target.value
                await upsertLocalNote({ id: note.id, dueAt: v ? new Date(v).toISOString() : null }); await onReload()
              }} style={{ height: 28 }} />
            </>
          ) : (
            <input type="datetime-local" aria-label="Due date" onChange={async (e) => {
              const v = e.target.value
              await upsertLocalNote({ id: note.id, dueAt: v ? new Date(v).toISOString() : null }); await onReload()
            }} style={{ height: 28 }} />
          )}
          <button title={note.isList ? 'Switch to Note' : 'Switch to List'} onClick={async () => {
            if (note.isList) {
              const plain = toPlainTextFromChecklist(note.content)
              await upsertLocalNote({ id: note.id, isList: false, content: plain }); await updateNotePrefs(note.id, { isList: false })
            } else {
              const lines = (note.content || '').split('\n')
              const rebuilt = lines.map((l: string) => {
                const trimmed = l.trimEnd()
                if (trimmed.endsWith('✓')) return `[x] ${trimmed.replace(/\s*✓$/, '')}`
                return `[ ] ${l}`
              }).join('\n')
              await upsertLocalNote({ id: note.id, isList: true, content: rebuilt }); await updateNotePrefs(note.id, { isList: true })
            }
            await onReload()
          }}>{note.isList ? '📝' : '☑'}</button>
          <button title="Color" onClick={() => setShowColors(v => !v)} style={{ width: 28, height: 28, borderRadius: 16, background: note.color, border: '1px solid var(--border-color)' }} />
          {showColors && (
            <div style={{ width: '100%' }}>
              <div className="color-selector" style={{ marginTop: 6 }}>
                <div className="color-options">
                  {colorPresets.map(c => (
                    <button key={c} className="color-option" style={{ background: c }} onClick={async () => { await upsertLocalNote({ id: note.id, color: c }); await updateNotePrefs(note.id, { colorOverride: c }); setShowColors(false); await onReload() }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <button className="primary-btn" onClick={async () => {
            try {
              const val = taRef.current?.value ?? note.content
              // Do NOT auto-derive title; preserve existing title unless explicitly edited elsewhere
              await upsertLocalNote({ id: note.id, content: val })
              const emails = collabInput.split(',').map((s: string) => s.trim()).filter(Boolean)
              if (note.userId === currentUserId && emails.length) {
                await updateSharing(note.id, { addCollaborators: emails })
              }
            } catch (e) {
              console.warn('Save failed', (e as any)?.message)
            } finally {
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


