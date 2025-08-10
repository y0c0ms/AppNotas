import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header'
import '../clean.css'
import { db } from '../lib/db'

export default function CalendarPage() {
  const [view, setView] = useState<'week' | 'month'>('week')
  const [notes, setNotes] = useState<any[]>([])
  useEffect(() => { db.notes.toArray().then(setNotes) }, [])
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
        {view === 'week' ? <WeekGrid notes={notes} /> : <MonthGrid notes={notes} />}
      </main>
    </div>
  )
}

function WeekGrid({ notes }: { notes: any[] }) {
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
    return notes.filter(n => n.dueAt && n.dueAt.slice(0,10) === key)
  }
  return (
    <div className="week-grid">
      {days.map(d => (
        <div className="day-column" key={d.toISOString()}>
          <div className={`day-header ${isToday(d) ? 'today-header' : ''}`}>{d.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'short' })}</div>
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

function MonthGrid({ notes }: { notes: any[] }) {
  const base = new Date()
  const year = base.getFullYear()
  const month = base.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
  const byDay = (d: Date) => {
    const key = d.toISOString().split('T')[0]
    return notes.filter(n => n.dueAt && n.dueAt.slice(0,10) === key)
  }
  return (
    <div className="month-grid">
      <div className="month-title">{base.toLocaleDateString(undefined, { month:'long', year:'numeric' })}</div>
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w => <div key={w} className="month-day-header">{w}</div>)}
      {new Array(firstDay.getDay()).fill(0).map((_,i) => <div key={'e'+i} className="month-day empty" />)}
      {days.map(d => (
        <div key={d.toISOString()} className={`month-day ${isToday(d)?'today-cell':''} ${byDay(d).length?'has-events':''}`}>
          <div className="day-number">{d.getDate()}</div>
          <div className="day-events">
            {byDay(d).slice(0,3).map(n => (
              <div key={n.id} className="month-event color-default" title={n.title}>{n.title}</div>
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


