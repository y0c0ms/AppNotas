import { useEffect, useRef, useState } from 'react'
import { listLocalNotes, upsertLocalNote, deleteLocalNote } from '../lib/notes'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { updateSharing } from '../lib/shareApi'
import { useToast } from '../components/Toast'
import Header from '../components/Header'
import { syncNow } from '../lib/sync'
import '../styles/core.css'
import '../styles/header.css'
import '../styles/notes.css'
import '../styles/components.css'
import { insertPrefixAtCursor, continueMarkdownListOnEnter } from '../lib/md'
import { updateNotePrefs } from '../lib/notesPrefs'
import LazyList from '../components/LazyList'
import Swipeable from '../components/Swipe'
import Collapsible from '../components/Collapsible'

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  // Collaborator email input moved to shared view; not used here
  const { Toast, show } = useToast()
  // const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newIsList, setNewIsList] = useState(false)
  const [shareChecked, setShareChecked] = useState(false)
  const [shareEmails, setShareEmails] = useState('')
  const addTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [showNewDate, setShowNewDate] = useState(false)
  const [newDueAt, setNewDueAt] = useState('')
  const [newColor, setNewColor] = useState<string>('#ffffff')
  const [showNewColorPicker, setShowNewColorPicker] = useState(false)
  const [colorPickerNoteId, setColorPickerNoteId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // Removed shared filter from Notes tab (kept on Shared tab)
  const [filterType, setFilterType] = useState<'all'|'list'|'note'>('all')
  const [dateFilter, setDateFilter] = useState<'all'|'date'|'noDate'>('all')
  const upsertTimers = useRef<Map<string, any>>(new Map())
  const debouncedUpsert = (id: string, patch: any, delay = 400) => {
    const m = upsertTimers.current
    if (m.has(id)) clearTimeout(m.get(id))
    const t = setTimeout(async () => { await upsertLocalNote({ id, ...patch }); await refresh() }, delay)
    m.set(id, t)
  }
  // expanded editor per-note (share, color, date, list)
  const [shareEditId, setShareEditId] = useState<string | null>(null)
  const [shareEditChecked, setShareEditChecked] = useState(false)
  const [shareEditEmails, setShareEditEmails] = useState('')
  // kept for reference; presets now adapt to theme
  // legacy helper no longer used; color is chosen via presets

  const getColorPresets = () => {
    const dark = document.body.classList.contains('dark-mode')
    return dark
      ? ['#1E3A8A', '#0F766E', '#7C3AED', '#9D174D', '#A16207', '#14532D']
      : ['#ffffff', '#deeaff', '#ddffe7', '#ffdddd', '#fff59d', '#eddeff']
  }

  function parseChecklist(content: string) {
    const lines = (content || '').split('\n')
    return lines.map((raw, idx) => {
      const mChecked = /^\s*\[x\]\s*/i.exec(raw)
      const mUnchecked = /^\s*\[\s?\]\s*/.exec(raw)
      if (mChecked) return { index: idx, checked: true, text: raw.slice(mChecked[0].length) }
      if (mUnchecked) return { index: idx, checked: false, text: raw.slice(mUnchecked[0].length) }
      return { index: idx, checked: false, text: raw }
    })
  }
  // Use a check symbol ✓ to mark completed when converting to plain note
  const toPlainTextFromChecklist = (content: string) => parseChecklist(content).map(i => i.checked ? `${i.text} ✓` : i.text).join('\n')

  async function toggleChecklist(noteId: string, content: string, itemIndex: number) {
    const items = parseChecklist(content)
    const toggled = { ...items[itemIndex], checked: !items[itemIndex].checked }
    items[itemIndex] = toggled
    // move checked items to end
    const unchecked = items.filter(i => !i.checked)
    const checked = items.filter(i => i.checked)
    const newContent = [...unchecked, ...checked].map(i => (i.checked ? `[x] ${i.text}` : `[ ] ${i.text}`)).join('\n')
    await upsertLocalNote({ id: noteId, content: newContent })
    // don't fetch immediately; local refresh only
    await refresh()
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
    const open = () => setShowAdd(true)
    window.addEventListener('notes:openAdd', open as any)
    const mql = window.matchMedia('(max-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else if ((mql as any).addListener) (mql as any).addListener(onChange)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAdd(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('notes:openAdd', open as any)
  }, [])

  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = showAdd ? 'hidden' : ''
    }
  }, [isMobile, showAdd])

  // Ensure initial navigation lands on /notes with router, not full page
  // No-op with HashRouter

  return (
    <div>
      <Header />

      <main>
        <div className="filters-row">
          <input className="search-input" placeholder="Search notes..." value={query} onChange={e => setQuery(e.target.value)} onInput={(e) => { const v=(e.target as HTMLInputElement).value; clearTimeout((window as any).__q); (window as any).__q=setTimeout(()=>setQuery(v), 250) }} />
          <div className="quick-filters">
            <button className={`chip ${dateFilter==='all'?'active':''}`} onClick={()=>setDateFilter('all')}>All</button>
            <button className={`chip ${dateFilter==='date'?'active':''}`} onClick={()=>setDateFilter('date')}>Date</button>
            <button className={`chip ${dateFilter==='noDate'?'active':''}`} onClick={()=>setDateFilter('noDate')}>No date</button>
            <button className={`chip ${filterType==='all'?'active':''}`} onClick={()=>setFilterType('all')}>All types</button>
            <button className={`chip ${filterType==='note'?'active':''}`} onClick={()=>setFilterType('note')}>Notes</button>
            <button className={`chip ${filterType==='list'?'active':''}`} onClick={()=>setFilterType('list')}>Lists</button>
            {(dateFilter!=='all'||filterType!=='all'||query) && (
              <button className="chip clear-chip" onClick={()=>{ setQuery(''); setFilterType('all'); setDateFilter('all') }}>Clear</button>
            )}
          </div>
        </div>
        <div className="add-note-container">
          {/* Removed in-page add button; header button controls sheet */}
          {!isMobile && (
          <div className={`add-note-form ${showAdd ? 'open' : ''}`}>
            <input id="noteTitleInput" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <div className="note-input-toolbar">
              <button onClick={e => { e.preventDefault(); if (addTextareaRef.current) insertPrefixAtCursor(addTextareaRef.current, '• ') }}>•</button>
              <button onClick={e => { e.preventDefault(); if (addTextareaRef.current) insertPrefixAtCursor(addTextareaRef.current, '1. ') }}>1.</button>
              <button title="Toggle list" onClick={e => { e.preventDefault(); setNewIsList(v => !v) }}>{newIsList ? '📝' : '☑'}</button>
              <button title="Add date" onClick={e => { e.preventDefault(); setShowNewDate(s => !s) }}>📅</button>
              <button title="Color" onClick={e => { e.preventDefault(); setShowNewColorPicker(s => !s) }} style={{
                width: 28, height: 28, borderRadius: 16, background: newColor, border: '1px solid var(--border-color)'
              }} />
            </div>
            <textarea ref={addTextareaRef} id="noteInput" placeholder="Write your note..." value={newContent} onChange={e => setNewContent(e.target.value)} onKeyDown={continueMarkdownListOnEnter as any} />
            {showNewDate && (
              <div className="date-row" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="datetime-local" value={newDueAt} onChange={e => setNewDueAt(e.target.value)} />
                <button onClick={() => { setNewDueAt('') }}>Clear</button>
              </div>
            )}
            {showNewColorPicker && (
              <div className="color-selector">
                <div className="color-options">
                  {getColorPresets().map(c => (
                    <button key={c} className="color-option" style={{ background: c }} onClick={() => { setNewColor(c); setShowNewColorPicker(false) }} />
                  ))}
                </div>
              </div>
            )}
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
                await upsertLocalNote({ id, title: newTitle || 'Untitled', content: newContent, isShared, isList: newIsList, dueAt: newDueAt ? new Date(newDueAt).toISOString() : null, color: newColor })
                if (isShared && collaborators.length) {
                  try {
                    // Ensure the note exists on the server before sharing
                    await syncNow()
                    await updateSharing(id, { isShared: true, addCollaborators: collaborators })
                  } catch {}
                }
                setNewTitle(''); setNewContent(''); setNewIsList(false); setShareChecked(false); setShareEmails(''); setShowNewDate(false); setNewDueAt(''); setShowAdd(false); setNewColor('#ffffff'); setShowNewColorPicker(false); await refresh(); show('Note added', 'success')
              }}>Add</button>
            </div>
          </div>
          )}
        </div>
        {isMobile && (
          <>
            <div className={`bottom-sheet-overlay ${showAdd ? 'open' : ''}`} onClick={() => setShowAdd(false)} />
            <div className={`bottom-sheet ${showAdd ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Add a note">
              <div className="sheet-header">
                <div className="sheet-handle" />
                <button className="sheet-close" onClick={() => setShowAdd(false)}>✕</button>
              </div>
              <div className="sheet-body">
                <input id="noteTitleInput" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <div className="note-input-toolbar">
                  <label style={{ marginRight: 8 }}>
                    <input type="checkbox" checked={newIsList} onChange={e => setNewIsList(e.target.checked)} /> List
                  </label>
                  <button onClick={e => { e.preventDefault(); if (addTextareaRef.current) insertPrefixAtCursor(addTextareaRef.current, '• ') }}>•</button>
                  <button onClick={e => { e.preventDefault(); if (addTextareaRef.current) insertPrefixAtCursor(addTextareaRef.current, '1. ') }}>1.</button>
                  <button title="Add date" onClick={e => { e.preventDefault(); setShowNewDate(s => !s) }}>📅</button>
                  <button title="Color" onClick={e => { e.preventDefault(); setShowNewColorPicker(s => !s) }} style={{
                    width: 28, height: 28, borderRadius: 16, background: newColor, border: '1px solid var(--border-color)'
                  }} />
                </div>
                <textarea ref={addTextareaRef} id="noteInput" placeholder="Write your note..." value={newContent} onChange={e => setNewContent(e.target.value)} onKeyDown={continueMarkdownListOnEnter as any} />
                {showNewDate && (
                  <div className="date-row" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="datetime-local" value={newDueAt} onChange={e => setNewDueAt(e.target.value)} />
                    <button onClick={() => { setNewDueAt('') }}>Clear</button>
                  </div>
                )}
                {showNewColorPicker && (
                  <div className="color-selector">
                    <div className="color-options">
                      {getColorPresets().map(c => (
                        <button key={c} className="color-option" style={{ background: c }} onClick={() => { setNewColor(c); setShowNewColorPicker(false) }} />
                      ))}
                    </div>
                  </div>
                )}
                <div className="share-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button title="Share" onClick={() => setShareChecked(v => !v)}>{shareChecked ? '🤝 On' : '🤝 Off'}</button>
                  {shareChecked && (
                    <input id="shareEmails" placeholder="Collaborator emails, comma separated" value={shareEmails} onChange={e => setShareEmails(e.target.value)} />
                  )}
                </div>
              </div>
              <div className="sheet-footer">
                <button className="primary-btn" onClick={async () => {
                  const id = crypto.randomUUID()
                  const isShared = shareChecked
                  const collaborators = shareEmails.split(',').map(s => s.trim()).filter(Boolean)
                  await upsertLocalNote({ id, title: newTitle || 'Untitled', content: newContent, isShared, isList: newIsList, dueAt: newDueAt ? new Date(newDueAt).toISOString() : null, color: newColor })
                  if (isShared && collaborators.length) {
                    try {
                      await syncNow()
                      await updateSharing(id, { isShared: true, addCollaborators: collaborators })
                    } catch {}
                  }
                  setNewTitle(''); setNewContent(''); setNewIsList(false); setShareChecked(false); setShareEmails(''); setShowNewDate(false); setNewDueAt(''); setShowAdd(false); setNewColor('#ffffff'); setShowNewColorPicker(false); await refresh(); show('Note added', 'success')
                }}>Add</button>
              </div>
            </div>
          </>
        )}

        <div className="notes-columns">
          <div className="notes-column">
            <div className="column-header">{dateFilter==='date' ? 'Date Notes' : dateFilter==='noDate' ? 'No Date' : 'All Notes'}</div>
            <div className="group-header">Pinned</div>
            <div className="notes-list">
              <LazyList
                items={notes
                  .filter(n => dateFilter==='all' ? true : (dateFilter==='date' ? !!n.dueAt : !n.dueAt))
                  .filter(n => filterType==='all' ? true : (filterType==='list' ? n.isList : !n.isList))
                  .filter(n => (n.title+n.content).toLowerCase().includes(query.toLowerCase()))
                  .filter(n => n.pinned && !n.isShared)
                  .sort((a,b)=> (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))}
                renderItem={(n:any) => (
                <Swipeable key={n.id} onSwipeLeft={async () => { await deleteLocalNote(n.id); await syncNow(); await refresh(); show('Note moved to trash', 'success') }} onSwipeRight={async () => { await upsertLocalNote({ id: n.id, pinned: !n.pinned }); await refresh() }}>
                <div className="note-card" style={{ backgroundColor: n.color }}>
                  <div className="note-content">
                    <div className="note-text" style={{ width: '100%' }}>
                      <input className="edit-text-input" value={n.title} onChange={e => { debouncedUpsert(n.id, { title: e.target.value }) }} />
                      <div className="note-actions" style={{ display: 'flex', gap: 8, margin: '6px 0' }}>
                        <button className={`icon-btn pin-btn ${n.pinned ? 'pinned' : ''}`} aria-pressed={n.pinned} title="Pin" onClick={async () => { await upsertLocalNote({ id: n.id, pinned: !n.pinned }); await updateNotePrefs(n.id, { pinned: !n.pinned }); await refresh() }}>📌</button>
                        <button className="icon-btn delete-note" title="Delete" onClick={async () => {
                          await deleteLocalNote(n.id)
                          await syncNow()
                          await refresh()
                          show('Note moved to trash', 'success')
                        }}>🗑</button>
                        <button className="edit-note" title="Edit" onClick={() => { setShareEditId(shareEditId === n.id ? null : n.id); setShareEditChecked(!!n.isShared); setShareEditEmails('') }}>✏️</button>
                      </div>
                      {!n.isList && (
                        <textarea className="edit-text-input" value={n.content} onChange={e => { debouncedUpsert(n.id, { content: e.target.value }) }} />
                      )}
                      {n.isList && (
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
                          {parseChecklist(n.content).map((it) => (
                            <li key={it.index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input type="checkbox" checked={it.checked} onChange={() => toggleChecklist(n.id, n.content, it.index)} />
                              <span style={{ textDecoration: it.checked ? 'line-through' as const : 'none', opacity: it.checked ? 0.7 : 1 }}>{it.text}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {shareEditId === n.id && (
                      <div className="note-edit-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                        <div>
                          <input type="datetime-local" aria-label="Due date" onChange={async (e) => {
                            const v = e.target.value
                            await upsertLocalNote({ id: n.id, dueAt: v ? new Date(v).toISOString() : null }); await refresh()
                          }} />
                        </div>
                        <button title={n.isList ? 'Switch to Note' : 'Switch to List'} onClick={async () => {
                          if (n.isList) {
                            const plain = toPlainTextFromChecklist(n.content)
                            await upsertLocalNote({ id: n.id, isList: false, content: plain }); await updateNotePrefs(n.id, { isList: false })
                          } else {
                            // convert back to checklist: any line that ends with ✓ becomes checked
                            const lines = (n.content || '').split('\n')
                            const rebuilt = lines.map((l: string) => {
                              const trimmed = l.trimEnd()
                              if (trimmed.endsWith('✓')) return `[x] ${trimmed.replace(/\s*✓$/, '')}`
                              return `[ ] ${l}`
                            }).join('\n')
                            await upsertLocalNote({ id: n.id, isList: true, content: rebuilt }); await updateNotePrefs(n.id, { isList: true })
                          }
                          await refresh()
                        }}>{n.isList ? '📝' : '☑'}</button>
                       <button title="Color" onClick={() => setColorPickerNoteId(p => p === n.id ? null : n.id)} style={{ width: 28, height: 28, borderRadius: 16, background: n.color, border: '1px solid var(--border-color)' }} />
                        <label className="share-toggle"><input type="checkbox" checked={shareEditChecked} onChange={e => setShareEditChecked(e.target.checked)} /> Share this note</label>
                        {shareEditChecked && (
                          <div className="share-row"><input placeholder="Collaborator emails, comma separated" value={shareEditEmails} onChange={e => setShareEditEmails(e.target.value)} /></div>
                        )}
                        <button className="primary-btn" onClick={async () => {
                          const emails = shareEditEmails.split(',').map(s => s.trim()).filter(Boolean)
                          try { await updateSharing(n.id, { isShared: shareEditChecked, addCollaborators: emails }); show('Updated', 'success') } catch { show('Update failed', 'error') }
                          finally { setShareEditId(null); await refresh() }
                        }}>Save</button>
                        <button className="secondary-btn" onClick={() => setShareEditId(null)}>Close</button>
                      </div>
                    )}
                    {colorPickerNoteId === n.id && (
                      <div className="color-selector" style={{ marginTop: 6 }}>
                        <div className="color-options">
                          {getColorPresets().map(c => (
                            <button key={c} className="color-option" style={{ background: c }} onClick={async () => { await upsertLocalNote({ id: n.id, color: c }); setColorPickerNoteId(null); await refresh() }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                </Swipeable>
                )}
              />
            </div>
            <div className="group-header">Others</div>
            <div className="notes-list">
              <LazyList
                items={notes
                  .filter(n => dateFilter==='all' ? true : (dateFilter==='date' ? !!n.dueAt : !n.dueAt))
                  .filter(n => filterType==='all' ? true : (filterType==='list' ? n.isList : !n.isList))
                  .filter(n => (n.title+n.content).toLowerCase().includes(query.toLowerCase()))
                  .filter(n => !n.pinned && !n.isShared)
                  .sort((a,b)=> (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))}
                renderItem={(n:any) => (
                  <Swipeable key={n.id} onSwipeLeft={async () => { await deleteLocalNote(n.id); await syncNow(); await refresh(); show('Note moved to trash', 'success') }} onSwipeRight={async () => { await upsertLocalNote({ id: n.id, pinned: !n.pinned }); await refresh() }}>
                  <div className="note-card" style={{ backgroundColor: n.color }}>
                    <div className="note-content">
                      <div className="note-title">
                        <span title={n.title}>{n.title || 'Untitled'}</span>
                        {n.pinned && <span className="badge pinned">Pinned</span>}
                      </div>
                      <div className="note-text" style={{ width: '100%' }}>
                        {!n.isList ? (
                          <Collapsible text={n.content} />
                        ) : null}
                        <div className="note-actions" style={{ display: 'flex', gap: 8, margin: '6px 0' }}>
                          <button className={`icon-btn pin-btn ${n.pinned ? 'pinned' : ''}`} aria-pressed={n.pinned} title="Pin" onClick={async () => { await upsertLocalNote({ id: n.id, pinned: !n.pinned }); await updateNotePrefs(n.id, { pinned: !n.pinned }); await refresh() }}>📌</button>
                          <button className="icon-btn delete-note" title="Delete" onClick={async () => {
                            await deleteLocalNote(n.id)
                            await syncNow()
                            await refresh()
                            show('Note moved to trash', 'success')
                          }}>🗑</button>
                          <button className="icon-btn edit-note" title="Edit" onClick={() => { setShareEditId(shareEditId === n.id ? null : n.id); setShareEditChecked(!!n.isShared); setShareEditEmails('') }}>✏️</button>
                        </div>
                      {!n.isList && null}
                        {n.isList && (
                          <ul style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
                            {parseChecklist(n.content).map((it) => (
                              <li key={it.index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={it.checked} onChange={() => toggleChecklist(n.id, n.content, it.index)} />
                                <span style={{ textDecoration: it.checked ? 'line-through' as const : 'none', opacity: it.checked ? 0.7 : 1 }}>{it.text}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {shareEditId === n.id && (
                        <div className="note-edit-controls" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                          <div>
                            <input type="datetime-local" aria-label="Due date" onChange={async (e) => {
                              const v = e.target.value
                              await upsertLocalNote({ id: n.id, dueAt: v ? new Date(v).toISOString() : null }); await refresh()
                            }} />
                          </div>
                          <button title={n.isList ? 'Switch to Note' : 'Switch to List'} onClick={async () => {
                            if (n.isList) {
                              const plain = toPlainTextFromChecklist(n.content)
                              await upsertLocalNote({ id: n.id, isList: false, content: plain })
                            } else {
                              // convert back to checklist: any line that ends with ✓ becomes checked
                              const lines = (n.content || '').split('\n')
                              const rebuilt = lines.map((l: string) => {
                                const trimmed = l.trimEnd()
                                if (trimmed.endsWith('✓')) return `[x] ${trimmed.replace(/\s*✓$/, '')}`
                                return `[ ] ${l}`
                              }).join('\n')
                              await upsertLocalNote({ id: n.id, isList: true, content: rebuilt })
                            }
                            await refresh()
                          }}>{n.isList ? '📝' : '☑'}</button>
                         <button title="Color" onClick={() => setColorPickerNoteId(p => p === n.id ? null : n.id)} style={{ width: 28, height: 28, borderRadius: 16, background: n.color, border: '1px solid var(--border-color)' }} />
                          <label className="share-toggle"><input type="checkbox" checked={shareEditChecked} onChange={e => setShareEditChecked(e.target.checked)} /> Share this note</label>
                          {shareEditChecked && (
                            <div className="share-row"><input placeholder="Collaborator emails, comma separated" value={shareEditEmails} onChange={e => setShareEditEmails(e.target.value)} /></div>
                          )}
                          <button className="primary-btn" onClick={async () => {
                            const emails = shareEditEmails.split(',').map(s => s.trim()).filter(Boolean)
                            try { await updateSharing(n.id, { isShared: shareEditChecked, addCollaborators: emails }); show('Updated', 'success') } catch { show('Update failed', 'error') }
                            finally { setShareEditId(null); await refresh() }
                          }}>Save</button>
                          <button className="secondary-btn" onClick={() => setShareEditId(null)}>Close</button>
                        </div>
                      )}
                      {colorPickerNoteId === n.id && (
                        <div style={{ width: '100%' }}>
                          <div className="color-selector" style={{ marginTop: 6 }}>
                            <div className="color-options">
                              {getColorPresets().map(c => (
                                <button key={c} className="color-option" style={{ background: c }} onClick={async () => { await upsertLocalNote({ id: n.id, color: c }); setColorPickerNoteId(null); await refresh() }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </Swipeable>
                )}
              />
            </div>
          </div>
        </div>
      </main>
      <Toast />
    </div>
  )
}


