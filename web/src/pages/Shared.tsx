import { useEffect, useState } from 'react'
import { fetchAndCacheNotes } from '../lib/notesApi'
import { db } from '../lib/db'
import { getSession } from '../lib/session'
import '../clean.css'

export default function SharedPage() {
  const [notes, setNotes] = useState<any[]>([])

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
    <main>
      <div className="notes-list">
        {notes.map(n => (
          <div className="note-card" key={n.id}>
            <div className="note-content">
              <div className="note-text">
                <strong>{n.title}</strong>
                <div>{n.content}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}


