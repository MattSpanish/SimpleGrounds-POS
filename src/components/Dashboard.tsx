import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { addExpense, dateUtils, getBestSellingItems, getPaymentBreakdown, getSalesPerStaff, getSalesPerShift, getHourlySales, resetSales, resetExpenses, resetAllData } from '../data/stats'

export default function Dashboard() {
  const [expenseAmt, setExpenseAmt] = useState('')
  const [expenseNote, setExpenseNote] = useState('')
  const [range, setRange] = useState<'day' | 'week' | 'month'>('day')
  const [hourSelected, setHourSelected] = useState<number>(new Date().getHours())

  const todayRange = useMemo(() => ({ from: dateUtils.startOfDay(), to: dateUtils.endOfDay() }), [])
  const weekRange = useMemo(() => ({ from: dateUtils.startOfWeek(), to: dateUtils.endOfWeek() }), [])
  const monthRange = useMemo(() => ({ from: dateUtils.startOfMonth(), to: dateUtils.endOfMonth() }), [])
  const activeRange = range === 'day' ? todayRange : range === 'week' ? weekRange : monthRange

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

  const recentSales = useLiveQuery(async () => {
    return db.sales
      .where('timestamp')
      .between(monthRange.from, monthRange.to, true, true)
      .reverse()
      .limit(10)
      .toArray()
  }, [monthRange.from.getTime()]) ?? []

  const recentExpenses = useLiveQuery(async () => {
    return db.expenses
      .where('timestamp')
      .between(monthRange.from, monthRange.to, true, true)
      .reverse()
      .limit(10)
      .toArray()
  }, [monthRange.from.getTime()]) ?? []

  const exportCSV = async (type: 'sales' | 'expenses') => {
    const rows = type === 'sales'
      ? await db.sales.where('timestamp').between(monthRange.from, monthRange.to, true, true).toArray()
      : await db.expenses.where('timestamp').between(monthRange.from, monthRange.to, true, true).toArray()

    const headers = type === 'sales' ? ['date', 'amount', 'itemsCount'] : ['date', 'amount', 'note']
    const csvRows = [headers.join(',')]
    for (const r of rows) {
      const date = new Date(r.timestamp).toISOString()
      if (type === 'sales') {
        const s = r as any
        csvRows.push([date, String(s.amount), String(s.itemsCount ?? 0)].join(','))
      } else {
        const e = r as any
        const note = (e.note ?? '').replace(/"/g, '""')
        // Wrap note in quotes to preserve commas
        csvRows.push([date, String(e.amount), `"${note}"`].join(','))
      }
    }
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    a.href = url
    a.download = `sg-${type}-${y}-${m}.csv`
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
      <div className="cards">
        <div className="card">
          <div className="label">Total Sales ({range})</div>
          <div className="value">P{salesActive}</div>
        </div>
        <div className="card">
          <div className="label">Expenses ({range})</div>
          <div className="value">P{expensesActive}</div>
        </div>
        <div className="card">
          <div className="label">Net ({range})</div>
          <div className="value">P{salesActive - expensesActive}</div>
        </div>
      </div>

      <div className="range-toggle">
        <label>
          Range:
          <select value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </label>
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
            <h4>Sales ({range})</h4>
            <button className="secondary" onClick={() => exportCSV('sales')}>Export CSV</button>
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
            <h4>Expenses ({range})</h4>
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
          <div className="list__header"><h4>Best-selling Items ({range})</h4></div>
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
          <div className="list__header"><h4>Payment Types ({range})</h4></div>
          <ul>
            <li className="list__row"><span>Cash</span><span>P{paymentBreakdown.cash}</span></li>
            <li className="list__row"><span>GCash</span><span>P{paymentBreakdown.gcash}</span></li>
            <li className="list__row"><span>Card</span><span>P{paymentBreakdown.card}</span></li>
          </ul>
        </div>
      </div>

      <div className="lists">
        <div className="list">
          <div className="list__header"><h4>Sales per Staff ({range})</h4></div>
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
          <div className="list__header"><h4>Sales per Shift ({range})</h4></div>
          <ul>
            <li className="list__row"><span>Morning</span><span>P{shiftBreakdown.morning}</span></li>
            <li className="list__row"><span>Afternoon</span><span>P{shiftBreakdown.afternoon}</span></li>
            <li className="list__row"><span>Evening</span><span>P{shiftBreakdown.evening}</span></li>
            <li className="list__row"><span>Night</span><span>P{shiftBreakdown.night}</span></li>
          </ul>
        </div>
      </div>

      <div className="list">
        <div className="list__header"><h4>Hourly Sales ({range})</h4></div>
        <div className="hourly-row">
          <label>
            Hour:
            <select value={hourSelected} onChange={(e) => setHourSelected(parseInt(e.target.value, 10))}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </label>
          <div><strong>P{hourly[hourSelected] ?? 0}</strong></div>
        </div>
      </div>

      <div className="list">
        <div className="list__header"><h4>Maintenance</h4></div>
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
        </div>
      </div>
    </div>
  )
}
