import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function toYMD(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type Props = {
  month: Date
  onChangeMonth: (next: Date) => void
  selectedDate: Date
  onSelectDate: (d: Date) => void
}

export default function SalesCalendar({ month, onChangeMonth, selectedDate, onSelectDate }: Props) {

  const from = useMemo(() => startOfMonth(month), [month])
  const to = useMemo(() => endOfMonth(month), [month])

  const rows = useLiveQuery(async () => {
    return db.sales.where('timestamp').between(from, to, true, true).toArray()
  }, [from.getTime()]) ?? []

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const d = new Date(r.timestamp)
      const key = toYMD(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
      map.set(key, (map.get(key) ?? 0) + r.amount)
    }
    return map
  }, [rows])

  const daysGrid = useMemo(() => {
    const first = startOfMonth(month)
    const startIdx = first.getDay() // 0=Sun
    const daysInMonth = endOfMonth(month).getDate()
    const cells: Array<{ date: Date | null; total: number }> = []
    // Fill leading blanks
    for (let i = 0; i < startIdx; i++) cells.push({ date: null, total: 0 })
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(month.getFullYear(), month.getMonth(), day)
      const key = toYMD(d)
      cells.push({ date: d, total: dailyTotals.get(key) ?? 0 })
    }
    // Pad to complete rows of 7
    while (cells.length % 7 !== 0) cells.push({ date: null, total: 0 })
    return cells
  }, [month, dailyTotals])

  const monthLabel = useMemo(() => {
    return month.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  }, [month])

  return (
    <div className="list">
      <div className="list__header" style={{ alignItems: 'center' }}>
        <h4>Sales Calendar</h4>
        <div className="calendar__nav">
          <button className="secondary" onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Prev</button>
          <span className="calendar__label">{monthLabel}</span>
          <button className="secondary" onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button>
          <button className="link" onClick={() => { onChangeMonth(new Date()); onSelectDate(new Date()) }}>Today</button>
        </div>
      </div>

      <div className="calendar">
        <div className="calendar__header">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} className="calendar__cell calendar__dow">{d}</div>
          ))}
        </div>
        <div className="calendar__grid">
          {daysGrid.map((cell, idx) => {
            const isSelected = !!cell.date && toYMD(cell.date) === toYMD(selectedDate)
            return (
              <button
                key={idx}
                className={`calendar__cell calendar__day${isSelected ? ' is-selected' : ''}`}
                onClick={() => cell.date && onSelectDate(cell.date)}
                disabled={!cell.date}
                title={cell.date ? `${cell.date.toDateString()} • P${cell.total}` : ''}
              >
                {cell.date ? (
                  <>
                    <div className="calendar__date">{cell.date.getDate()}</div>
                    <div className="calendar__total">P{cell.total}</div>
                  </>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
