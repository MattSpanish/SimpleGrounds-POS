import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { CalendarIcon } from './Icons'

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

  const rawRows = useLiveQuery(async () => {
    return db.sales.where('timestamp').between(from, to, true, true).toArray()
  }, [from.getTime()])

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>()
    if (rawRows) {
      for (const r of rawRows) {
        const d = new Date(r.timestamp)
        const key = toYMD(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
        map.set(key, (map.get(key) ?? 0) + r.amount)
      }
    }
    return map
  }, [rawRows])

  const monthTotal = useMemo(() => {
    let sum = 0
    dailyTotals.forEach((amt) => { sum += amt })
    return sum
  }, [dailyTotals])

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
    return month.toLocaleString('default', { month: 'long', year: 'numeric' })
  }, [month])

  const todayStr = useMemo(() => toYMD(new Date()), [])

  return (
    <div className="calendar-card">
      <div className="calendar-header-bar">
        <div className="calendar-title-group">
          <CalendarIcon size={20} className="cal-icon" />
          <h3 className="calendar-month-heading">{monthLabel}</h3>
          <span className="calendar-month-total">Month Total: ₱{monthTotal.toLocaleString()}</span>
        </div>

        <div className="calendar-nav-controls">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            title="Previous month"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            className="cal-nav-btn btn-today"
            onClick={() => {
              const now = new Date()
              onChangeMonth(new Date(now.getFullYear(), now.getMonth(), 1))
              onSelectDate(now)
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            title="Next month"
          >
            Next ›
          </button>
        </div>
      </div>

      <div className="calendar-grid-container">
        <div className="calendar-weekdays-row">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="calendar-dow-cell">{d}</div>
          ))}
        </div>

        <div className="calendar-cells-grid">
          {daysGrid.map((cell, idx) => {
            if (!cell.date) {
              return <div key={`empty-${idx}`} className="calendar-cell is-empty" />
            }

            const cellStr = toYMD(cell.date)
            const isSelected = cellStr === toYMD(selectedDate)
            const isToday = cellStr === todayStr
            const hasSales = cell.total > 0

            return (
              <button
                key={cellStr}
                type="button"
                className={`calendar-cell is-day ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${hasSales ? 'has-sales' : ''}`}
                onClick={() => cell.date && onSelectDate(cell.date)}
              >
                <div className="cell-top">
                  <span className="cell-date-num">{cell.date.getDate()}</span>
                  {isToday && <span className="today-badge">Today</span>}
                </div>
                <div className="cell-bottom">
                  {hasSales ? (
                    <span className="cell-amount-pill">₱{cell.total.toLocaleString()}</span>
                  ) : (
                    <span className="cell-empty-dash">—</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
