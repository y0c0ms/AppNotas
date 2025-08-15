import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import '../clean.css'
import { listLocalNotes } from '../lib/notes'

export default function CalendarPage() {
  const [view, setView] = useState<'week' | 'month'>('week')
  const [notes, setNotes] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  async function reload() {
    const own = await listLocalNotes()
    setNotes(own.filter(n => !!n.dueAt))
  }
  useEffect(() => {
    reload()
  }, [])
  return (
    <div>
      <Header />
      <main>
        <div className="calendar-controls">
          <div className="view-toggle">
            <button className={`view-btn ${view==='week'?'active':''}`} onClick={() => setView('week')}>Week</button>
            <button className={`view-btn ${view==='month'?'active':''}`} onClick={() => setView('month')}>Month</button>
          </div>
        </div>
        <div className="calendar-split">
          <div className="calendar-top">
            {view === 'week' ? (
              <WeekGrid notes={notes} selected={selectedDate} onSelect={setSelectedDate} />
            ) : (
              <MonthGrid notes={notes} selected={selectedDate} onSelect={setSelectedDate} />
            )}
          </div>
          <div className="calendar-bottom">
            <DayNotes notes={notes} date={selectedDate} />
          </div>
        </div>
      </main>
    </div>
  )
}

function WeekGrid({ notes, selected, onSelect }: { notes: any[]; selected: Date; onSelect: (d: Date) => void }) {
  const days = useMemo(() => {
    const today = new Date()
    today.setDate(today.getDate() - 1)
    return new Array(7).fill(0).map((_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      return d
    })
  }, [])
  const byDay = (d: Date) => {
    const key = d.toISOString().split('T')[0]
    return notes.filter(n => n.dueAt && new Date(n.dueAt).toISOString().slice(0,10) === key)
  }
  return (
    <div className="week-grid">
      {days.map(d => (
        <div className="day-column" key={d.toISOString()} onClick={() => onSelect(d)}>
          <div className={`day-header ${isToday(d) ? 'today-header' : ''}`}>{d.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'short' })}{isSameDay(d, selected) ? ' •' : ''}</div>
          <div className={`calendar-day ${byDay(d).length ? 'has-events' : ''}`}>
            {byDay(d).map(n => (
              <div key={n.id} className={`calendar-event color-default`} title={n.title}>{n.title}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function MonthGrid({ notes, selected, onSelect }: { notes: any[]; selected: Date; onSelect: (d: Date) => void }) {
  const base = new Date()
  const year = base.getFullYear()
  const month = base.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
  const byDay = (d: Date) => {
    const key = d.toISOString().split('T')[0]
    return notes.filter(n => n.dueAt && new Date(n.dueAt).toISOString().slice(0,10) === key)
  }
  // Limit to first 16 days initially for small screens; CSS will allow scroll of grid area
  const visibleDays = days
  return (
    <div className="month-grid">
      <div className="month-title">{base.toLocaleDateString(undefined, { month:'long', year:'numeric' })}</div>
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w => <div key={w} className="month-day-header">{w}</div>)}
      {new Array(firstDay.getDay()).fill(0).map((_,i) => <div key={'e'+i} className="month-day empty" />)}
      {visibleDays.map(d => (
        <div key={d.toISOString()} className={`month-day ${isToday(d)?'today-cell':''} ${byDay(d).length?'has-events':''} ${isSameDay(d, selected)?'highlighted':''}`} onClick={() => onSelect(d)}>
          <div className="day-number">{d.getDate()}</div>
          <div className="day-events">
            {byDay(d).slice(0,3).map(n => (
              <div key={n.id} className={`month-event color-default`} title={n.title}>{n.title}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function isToday(d: Date) {
  const t = new Date()
  return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear()
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}

function DayNotes({ notes, date }: { notes: any[]; date: Date }) {
  const key = date.toISOString().slice(0,10)
  const items = useMemo(() => notes.filter(n => n.dueAt && new Date(n.dueAt).toISOString().slice(0,10)===key).sort((a,b)=>new Date(a.dueAt).getTime()-new Date(b.dueAt).getTime()), [notes, key])
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{date.toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' })}</div>
      {items.length===0 ? <div style={{ opacity:.7 }}>No notes for this day</div> : (
        <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
          {items.map(n => (
            <li key={n.id} style={{ background:'var(--card-bg)', border:'1px solid var(--border-color)', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>{n.title}</div>
              <div style={{ opacity:.85, whiteSpace:'pre-wrap' }}>{n.content}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}


