import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { addExpense, dateUtils, getBestSellingItems, getPaymentBreakdown, getSalesPerStaff, getSalesPerShift, getHourlySales, resetSales, resetExpenses, resetAllData } from '../data/stats'
import HourlySalesReport from './HourlySalesReport'
import SalesCalendar from './SalesCalendar'

export default function Dashboard() {
  const [expenseAmt, setExpenseAmt] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [hourSelected, setHourSelected] = useState<number>(new Date().getHours())
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminAuthorized, setAdminAuthorized] = useState(false)
  const [adminPassInput, setAdminPassInput] = useState('')
  const [showPassSettings, setShowPassSettings] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [newPassConfirm, setNewPassConfirm] = useState('')

  const todayRange = useMemo(() => ({ from: dateUtils.startOfDay(selectedDate), to: dateUtils.endOfDay(selectedDate) }), [selectedDate])
  const activeRange = todayRange

  const salesActive = useLiveQuery(async () => {
    const rows = await db.sales.where('timestamp').between(activeRange.from, activeRange.to, true, true).toArray()
    return rows.reduce((s, r) => s + r.amount, 0)
  }, [activeRange.from.getTime()]) ?? 0

  const expensesActive = useLiveQuery(async () => {
    const rows = await db.expenses.where('timestamp').between(activeRange.from, activeRange.to, true, true).toArray()
    return rows.reduce((s, r) => s + r.amount, 0)
  }, [activeRange.from.getTime()]) ?? 0

  const bestSellers = useLiveQuery(async () => {
    return getBestSellingItems(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime()]) ?? []

  const paymentBreakdown = useLiveQuery(async () => {
    return getPaymentBreakdown(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime()]) ?? { cash: 0, gcash: 0, card: 0 }

  const staffBreakdown = useLiveQuery(async () => {
    return getSalesPerStaff(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime()]) ?? {}

  const shiftBreakdown = useLiveQuery(async () => {
    return getSalesPerShift(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime()]) ?? { morning: 0, afternoon: 0, evening: 0, night: 0 }

  const hourly = useLiveQuery(async () => {
    return getHourlySales(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime()]) ?? Array(24).fill(0)

  const cupsActive = useLiveQuery(async () => {
    const rows = await db.sales.where('timestamp').between(activeRange.from, activeRange.to, true, true).toArray()
    return rows.reduce((s, r) => s + (r.itemsCount ?? (r.items?.reduce((q, it) => q + it.qty, 0) ?? 0)), 0)
  }, [activeRange.from.getTime()]) ?? 0

  const recentSales = useLiveQuery(async () => {
    return db.sales
      .where('timestamp')
      .between(todayRange.from, todayRange.to, true, true)
      .reverse()
      .limit(10)
      .toArray()
  }, [todayRange.from.getTime()]) ?? []

  const recentExpenses = useLiveQuery(async () => {
    return db.expenses
      .where('timestamp')
      .between(todayRange.from, todayRange.to, true, true)
      .reverse()
      .limit(10)
      .toArray()
  }, [todayRange.from.getTime()]) ?? []

  const toYMD = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const exportCSV = async (type: 'sales' | 'expenses') => {
    const rows = type === 'sales'
      ? await db.sales.where('timestamp').between(todayRange.from, todayRange.to, true, true).toArray()
      : await db.expenses.where('timestamp').between(todayRange.from, todayRange.to, true, true).toArray()

    const headers = type === 'sales' ? ['date', 'amount', 'itemsCount'] : ['date', 'amount', 'note']
    const csvRows = [headers.join(',')]
    let itemsSubtotal = 0
    let amountSubtotal = 0
    for (const r of rows) {
      const date = new Date(r.timestamp).toISOString()
      if (type === 'sales') {
        const s = r as any
        amountSubtotal += Number(s.amount) || 0
        const count = s.itemsCount ?? (Array.isArray(s.items) ? s.items.reduce((q: number, it: any) => q + (it?.qty ?? 0), 0) : 0)
        itemsSubtotal += count
        csvRows.push([date, String(s.amount), String(count)].join(','))
      } else {
        const e = r as any
        amountSubtotal += Number(e.amount) || 0
        const note = (e.note ?? '').replace(/"/g, '""')
        // Wrap note in quotes to preserve commas
        csvRows.push([date, String(e.amount), `"${note}"`].join(','))
      }
    }
    // Append subtotal for item count in sales CSV
    csvRows.push('')
    if (type === 'sales') {
      csvRows.push(['Subtotal Amount', String(amountSubtotal), ''].join(','))
      csvRows.push(['Subtotal Items', '', String(itemsSubtotal)].join(','))
    } else {
      csvRows.push(['Subtotal Amount', String(amountSubtotal), ''].join(','))
    }
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ymd = toYMD(selectedDate)
    a.href = url
    a.download = `sg-${type}-${ymd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatHour12 = (h: number) => {
    const hr = h % 24
    const ampm = hr < 12 ? 'AM' : 'PM'
    const twelve = hr % 12 === 0 ? 12 : hr % 12
    return `${twelve}:00 ${ampm}`
  }

  const exportHourlyCSV = async () => {
    const headers = ['hour', 'amount']
    const csvRows = [headers.join(',')]
    let total = 0
    for (let h = 0; h < 24; h++) {
      const amt = hourly[h] ?? 0
      total += amt
      csvRows.push([String(h).padStart(2, '0'), String(amt)].join(','))
    }
    csvRows.push('')
    csvRows.push(['Total', String(total)].join(','))
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const ymd = toYMD(selectedDate)
    const a = document.createElement('a')
    a.href = url
    a.download = `sg-hourly-${ymd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(expenseAmt)
    if (!isFinite(amt) || amt <= 0) return
    await addExpense(amt, expenseNote || undefined)
    setExpenseAmt('')
    setExpenseNote('')
  }

  return (
    <div className="dashboard">
      <div className="range-toggle">
        <button className="link" title="Open Sales Calendar" onClick={() => setShowCalendar(true)}>
          📅 Calendar
        </button>
      </div>

      {showCalendar && (
        <div className="modal-backdrop" onClick={() => setShowCalendar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h4>Sales Calendar</h4>
              <button className="link" onClick={() => setShowCalendar(false)} aria-label="Close">✕</button>
            </div>
            <SalesCalendar
              month={calendarMonth}
              onChangeMonth={(next) => setCalendarMonth(next)}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d)
                setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1))
              }}
            />
          </div>
        </div>
      )}
      {showAdminPrompt && (
        <div className="modal-backdrop" onClick={() => setShowAdminPrompt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h4>Admin Access</h4>
              <button className="link" onClick={() => setShowAdminPrompt(false)} aria-label="Close">✕</button>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="password"
                placeholder="Enter passcode"
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
              />
              <button
                className="btn"
                onClick={() => {
                  const stored = localStorage.getItem('sg-admin-passcode') || '1234'
                  if (adminPassInput === stored) {
                    setAdminAuthorized(true)
                    setAdminPassInput('')
                    setShowAdminPrompt(false)
                  } else {
                    alert('Incorrect passcode.')
                  }
                }}
              >Unlock</button>
            </div>
            <div className="muted" style={{ marginTop: 8 }}>Tip: Set a custom passcode in localStorage key "sg-admin-passcode".</div>
          </div>
        </div>
      )}
      {showPassSettings && (
        <div className="modal-backdrop" onClick={() => setShowPassSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h4>Admin Settings</h4>
              <button className="link" onClick={() => setShowPassSettings(false)} aria-label="Close">✕</button>
            </div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="password"
                placeholder="New passcode"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <input
                type="password"
                placeholder="Confirm passcode"
                value={newPassConfirm}
                onChange={(e) => setNewPassConfirm(e.target.value)}
              />
              <button
                className="btn"
                onClick={() => {
                  if (!newPass) { alert('Passcode cannot be empty.'); return }
                  if (newPass !== newPassConfirm) { alert('Passcodes do not match.'); return }
                  localStorage.setItem('sg-admin-passcode', newPass)
                  setNewPass('')
                  setNewPassConfirm('')
                  setShowPassSettings(false)
                  alert('Passcode updated.')
                }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
      <div className="cards">
        <div className="card">
          <div className="label">Total Sales</div>
          <div className="value">P{salesActive}</div>
        </div>
        <div className="card">
          <div className="label">Expenses</div>
          <div className="value">P{expensesActive}</div>
        </div>
        <div className="card">
          <div className="label">Net</div>
          <div className="value">P{salesActive - expensesActive}</div>
        </div>
        <div className="card">
          <div className="label">Cups</div>
          <div className="value">{cupsActive}</div>
        </div>
      </div>

      <form className="expense-form" onSubmit={submitExpense}>
        <h4>Add Expense</h4>
        <div className="row">
          <input
            type="number"
            step="0.01"
            placeholder="Amount"
            value={expenseAmt}
            onChange={(e) => setExpenseAmt(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={expenseNote}
            onChange={(e) => setExpenseNote(e.target.value)}
          />
          <button type="submit">Add</button>
        </div>
      </form>

      <div className="lists">
        <div className="list">
          <div className="list__header">
            <h4>Sales</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="muted">Subtotal: P{salesActive}</span>
              <button className="secondary" onClick={() => exportCSV('sales')}>Export CSV</button>
            </div>
          </div>
          {recentSales.length === 0 ? (
            <div className="muted">No sales yet.</div>
          ) : (
            <ul>
              {recentSales.map((s) => (
                <li key={s.id} className="list__row">
                  <span>{new Date(s.timestamp).toLocaleString()}</span>
                  <span>P{s.amount} • {s.itemsCount} items</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="list">
          <div className="list__header">
            <h4>Expenses</h4>
            <button className="secondary" onClick={() => exportCSV('expenses')}>Export CSV</button>
          </div>
          {recentExpenses.length === 0 ? (
            <div className="muted">No expenses yet.</div>
          ) : (
            <ul>
              {recentExpenses.map((e) => (
                <li key={e.id} className="list__row">
                  <span>{new Date(e.timestamp).toLocaleString()}</span>
                  <span>P{e.amount}{e.note ? ` • ${e.note}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="lists">
        <div className="list">
          <div className="list__header">
            <h4>Best-selling Items</h4>
            <span className="muted">Total items sold: {bestSellers.reduce((s, b) => s + b.qty, 0)}</span>
          </div>
          {bestSellers.length === 0 ? (
            <div className="muted">No data yet.</div>
          ) : (
            <ul>
              {bestSellers.slice(0, 5).map((b) => (
                <li key={b.id} className="list__row">
                  <span>{b.name}</span>
                  <span>{b.qty} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="list">
          <div className="list__header"><h4>Payment Types</h4></div>
          <ul>
            <li className="list__row"><span>Cash</span><span>P{paymentBreakdown.cash}</span></li>
            <li className="list__row"><span>GCash</span><span>P{paymentBreakdown.gcash}</span></li>
            <li className="list__row"><span>Card</span><span>P{paymentBreakdown.card}</span></li>
          </ul>
        </div>
      </div>

      <div className="lists">
        <div className="list">
          <div className="list__header"><h4>Sales per Staff</h4></div>
          {Object.keys(staffBreakdown).length === 0 ? (
            <div className="muted">No data yet.</div>
          ) : (
            <ul>
              {Object.entries(staffBreakdown).map(([name, amt]) => (
                <li key={name} className="list__row"><span>{name}</span><span>P{amt}</span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="list">
          <div className="list__header"><h4>Sales per Shift</h4></div>
          <ul>
            <li className="list__row"><span>Morning</span><span>P{shiftBreakdown.morning}</span></li>
            <li className="list__row"><span>Afternoon</span><span>P{shiftBreakdown.afternoon}</span></li>
            <li className="list__row"><span>Evening</span><span>P{shiftBreakdown.evening}</span></li>
            <li className="list__row"><span>Night</span><span>P{shiftBreakdown.night}</span></li>
          </ul>
        </div>
      </div>

      <div className="list">
        <div className="list__header" style={{ alignItems: 'center' }}>
          <h4>Hourly Sales</h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="muted">Selected: {formatHour12(hourSelected)} • P{hourly[hourSelected] ?? 0}</span>
            <button className="secondary" onClick={exportHourlyCSV}>Export CSV</button>
          </div>
        </div>
        <HourlySalesReport bins={hourly} selectedHour={hourSelected} onSelectHour={(h) => setHourSelected(h)} />
        
      </div>

      <div className="list">
        <div className="list__header"><h4>Maintenance</h4></div>
        {!adminAuthorized ? (
          <div className="hourly-row" style={{ justifyContent: 'space-between' }}>
            <div className="muted">Admin controls are protected.</div>
            <button className="btn" onClick={() => setShowAdminPrompt(true)}>Admin</button>
          </div>
        ) : (
          <div className="hourly-row" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-danger" onClick={async () => {
              if (confirm('Reset ALL sales data? This cannot be undone.')) {
                await resetSales()
                alert('Sales reset complete.')
              }
            }}>Reset Sales</button>
            <button className="btn btn-danger" onClick={async () => {
              if (confirm('Reset ALL expenses data? This cannot be undone.')) {
                await resetExpenses()
                alert('Expenses reset complete.')
              }
            }}>Reset Expenses</button>
            <button className="btn btn-danger" onClick={async () => {
              if (confirm('Reset ALL sales and expenses? This cannot be undone.')) {
                await resetAllData()
                alert('All data reset complete.')
              }
            }}>Reset All</button>
            <button className="secondary" onClick={() => setShowPassSettings(true)}>Change Passcode</button>
            <button className="link" onClick={() => setAdminAuthorized(false)}>Close Admin</button>
          </div>
        )}
      </div>
    </div>
  )
}
