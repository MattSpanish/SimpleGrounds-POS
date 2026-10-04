import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Sale, SaleItem } from '../types/pos'
import {
  addExpense,
  dateUtils,
  getBestSellingItems,
  getPaymentBreakdown,
  getSalesPerStaff,
  getSalesPerShift,
  getHourlySales,
  resetSales,
  resetExpenses,
  resetAllData,
} from '../data/stats'
import HourlySalesReport from './HourlySalesReport'
import SalesCalendar from './SalesCalendar'
import {
  BarChartIcon,
  CalendarIcon,
  ClockIcon,
  CoffeeIcon,
  CreditCardIcon,
  DollarSignIcon,
  DownloadIcon,
  PlusIcon,
  SettingsIcon,
  ShieldLockIcon,
  SmartphoneIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  XIcon,
} from './Icons'

type TimeframePreset = 'today' | 'yesterday' | 'week' | 'month'

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<TimeframePreset>('today')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [hourSelected, setHourSelected] = useState<number>(new Date().getHours())

  // Expense form state
  const [expenseAmt, setExpenseAmt] = useState('')
  const [expenseNote, setExpenseNote] = useState('')

  // Detailed order inspection & ledger search
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null)
  const [ledgerFilter, setLedgerFilter] = useState('')

  // Admin access state
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminAuthorized, setAdminAuthorized] = useState(false)
  const [adminPassInput, setAdminPassInput] = useState('')
  const [showPassSettings, setShowPassSettings] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [newPassConfirm, setNewPassConfirm] = useState('')

  // Compute active date range based on preset or selectedDate
  const activeRange = useMemo(() => {
    if (timeframe === 'today') {
      return {
        from: dateUtils.startOfDay(selectedDate),
        to: dateUtils.endOfDay(selectedDate),
        label: selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      }
    }
    if (timeframe === 'yesterday') {
      const yest = new Date(selectedDate)
      yest.setDate(yest.getDate() - 1)
      return {
        from: dateUtils.startOfDay(yest),
        to: dateUtils.endOfDay(yest),
        label: `Yesterday (${yest.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
      }
    }
    if (timeframe === 'week') {
      const from = dateUtils.startOfWeek(selectedDate)
      const to = dateUtils.endOfWeek(selectedDate)
      return {
        from,
        to,
        label: `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      }
    }
    if (timeframe === 'month') {
      const from = dateUtils.startOfMonth(selectedDate)
      const to = dateUtils.endOfMonth(selectedDate)
      return {
        from,
        to,
        label: selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      }
    }
    return {
      from: dateUtils.startOfDay(selectedDate),
      to: dateUtils.endOfDay(selectedDate),
      label: selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }
  }, [timeframe, selectedDate])

  // Queries
  const rawSalesRows = useLiveQuery(async () => {
    return db.sales.where('timestamp').between(activeRange.from, activeRange.to, true, true).toArray()
  }, [activeRange.from.getTime(), activeRange.to.getTime()])
  const salesRows = useMemo(() => rawSalesRows ?? [], [rawSalesRows])

  const filteredSalesRows = useMemo(() => {
    if (!ledgerFilter.trim()) return salesRows
    const q = ledgerFilter.toLowerCase().trim()
    return salesRows.filter((s) => {
      const staffMatch = s.staff && s.staff.toLowerCase().includes(q)
      const customerMatch = s.customerName && s.customerName.toLowerCase().includes(q)
      const paymentMatch = s.paymentType && s.paymentType.toLowerCase().includes(q)
      const orderNumMatch = s.orderNumber && String(s.orderNumber).includes(q)
      const itemsMatch = Array.isArray(s.items) && s.items.some((it) => it.name.toLowerCase().includes(q))
      return staffMatch || customerMatch || paymentMatch || orderNumMatch || itemsMatch
    })
  }, [salesRows, ledgerFilter])

  const rawExpenseRows = useLiveQuery(async () => {
    return db.expenses.where('timestamp').between(activeRange.from, activeRange.to, true, true).toArray()
  }, [activeRange.from.getTime(), activeRange.to.getTime()])
  const expenseRows = useMemo(() => rawExpenseRows ?? [], [rawExpenseRows])

  const salesActive = useMemo(() => {
    return salesRows.reduce((s, r) => s + r.amount, 0)
  }, [salesRows])

  const salesCount = salesRows.length

  const expensesActive = useMemo(() => {
    return expenseRows.reduce((s, r) => s + r.amount, 0)
  }, [expenseRows])

  const expensesCount = expenseRows.length

  const netProfit = salesActive - expensesActive
  const profitMargin = salesActive > 0 ? ((netProfit / salesActive) * 100).toFixed(1) : '0'
  const avgTicket = salesCount > 0 ? Math.round(salesActive / salesCount) : 0

  const cupsActive = useMemo(() => {
    return salesRows.reduce((sum, row) => {
      if (Array.isArray(row.items)) {
        const nonPastryCount = row.items
          .filter((it) => it.size !== 'regular')
          .reduce((qty, it) => qty + it.qty, 0)
        return sum + nonPastryCount
      }
      return sum + (row.itemsCount ?? 0)
    }, 0)
  }, [salesRows])

  const bestSellers = useLiveQuery(async () => {
    return getBestSellingItems(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime(), activeRange.to.getTime()]) ?? []

  const paymentBreakdown = useLiveQuery(async () => {
    return getPaymentBreakdown(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime(), activeRange.to.getTime()]) ?? { cash: 0, gcash: 0, card: 0 }

  const staffBreakdown = useLiveQuery(async () => {
    return getSalesPerStaff(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime(), activeRange.to.getTime()]) ?? {}

  const shiftBreakdown = useLiveQuery(async () => {
    return getSalesPerShift(activeRange.from, activeRange.to)
  }, [activeRange.from.getTime(), activeRange.to.getTime()]) ?? { morning: 0, afternoon: 0, evening: 0, night: 0 }

  const hourly = useLiveQuery(async () => {
    // Hourly chart focuses on the selectedDate single day
    const dayStart = dateUtils.startOfDay(selectedDate)
    const dayEnd = dateUtils.endOfDay(selectedDate)
    return getHourlySales(dayStart, dayEnd)
  }, [selectedDate.getTime()]) ?? Array(24).fill(0)

  const peakHour = useMemo(() => {
    let max = -1
    let hour = 0
    hourly.forEach((val, h) => {
      if (val > max) {
        max = val
        hour = h
      }
    })
    return { hour, amount: Math.max(0, max) }
  }, [hourly])

  const toYMD = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const formatHour12 = (h: number) => {
    const hr = h % 24
    const ampm = hr < 12 ? 'AM' : 'PM'
    const twelve = hr % 12 === 0 ? 12 : hr % 12
    return `${twelve}:00 ${ampm}`
  }

  const exportCSV = async (type: 'sales' | 'expenses') => {
    const headers = type === 'sales'
      ? ['date', 'amount', 'itemsCount', 'paymentType', 'staff', 'shift', 'items']
      : ['date', 'amount', 'note']

    const csvRows = [headers.join(',')]
    let itemsSubtotal = 0
    let amountSubtotal = 0
    let gcashSubtotal = 0

    if (type === 'sales') {
      for (const s of salesRows) {
        const date = new Date(s.timestamp).toISOString()
        amountSubtotal += Number(s.amount) || 0
        if ((s.paymentType ?? 'cash') === 'gcash') {
          gcashSubtotal += Number(s.amount) || 0
        }
        const count = s.itemsCount ?? (Array.isArray(s.items) ? s.items.reduce((q: number, it: SaleItem) => q + (it?.qty ?? 0), 0) : 0)
        itemsSubtotal += count
        const itemsStr = Array.isArray(s.items)
          ? `"${s.items.map((it: SaleItem) => `${it.name} (${it.size}) x${it.qty}`).join('; ')}"`
          : '""'
        csvRows.push([
          date,
          String(s.amount),
          String(count),
          String(s.paymentType ?? 'cash'),
          String(s.staff ?? 'None'),
          String(s.shift ?? ''),
          itemsStr,
        ].join(','))
      }
    } else {
      for (const e of expenseRows) {
        const date = new Date(e.timestamp).toISOString()
        amountSubtotal += Number(e.amount) || 0
        const note = (e.note ?? '').replace(/"/g, '""')
        csvRows.push([date, String(e.amount), `"${note}"`].join(','))
      }
    }

    csvRows.push('')
    if (type === 'sales') {
      csvRows.push(['Subtotal Amount', String(amountSubtotal)].join(','))
      csvRows.push(['Subtotal Items Sold', String(itemsSubtotal)].join(','))
      csvRows.push(['GCash Total', String(gcashSubtotal)].join(','))
    } else {
      csvRows.push(['Total Expenses', String(amountSubtotal)].join(','))
    }

    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ymd = toYMD(selectedDate)
    a.href = url
    a.download = `simpli-grounds-${type}-${ymd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportHourlyCSV = async () => {
    const headers = ['hour', 'formatted_hour', 'amount']
    const csvRows = [headers.join(',')]
    let total = 0
    for (let h = 0; h < 24; h++) {
      const amt = hourly[h] ?? 0
      total += amt
      csvRows.push([String(h).padStart(2, '0'), formatHour12(h), String(amt)].join(','))
    }
    csvRows.push('')
    csvRows.push(['Total', '', String(total)].join(','))
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const ymd = toYMD(selectedDate)
    const a = document.createElement('a')
    a.href = url
    a.download = `simpli-grounds-hourly-${ymd}.csv`
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

  const quickExpenseNotes = ['Ice (Yelo)', 'Fresh Milk', 'Cups & Straws', 'Coffee Beans', 'Syrup / Sauce', 'Water Delivery']

  const totalPayments = paymentBreakdown.cash + paymentBreakdown.gcash + paymentBreakdown.card

  return (
    <div className="dashboard-root">
      {/* Top Filter & Timeframe Navigation */}
      <div className="dashboard-topbar">
        <div className="timeframe-selector">
          <button
            type="button"
            className={`timeframe-btn ${timeframe === 'today' ? 'is-active' : ''}`}
            onClick={() => {
              setTimeframe('today')
              setSelectedDate(new Date())
            }}
          >
            Today
          </button>
          <button
            type="button"
            className={`timeframe-btn ${timeframe === 'yesterday' ? 'is-active' : ''}`}
            onClick={() => setTimeframe('yesterday')}
          >
            Yesterday
          </button>
          <button
            type="button"
            className={`timeframe-btn ${timeframe === 'week' ? 'is-active' : ''}`}
            onClick={() => setTimeframe('week')}
          >
            This Week
          </button>
          <button
            type="button"
            className={`timeframe-btn ${timeframe === 'month' ? 'is-active' : ''}`}
            onClick={() => setTimeframe('month')}
          >
            This Month
          </button>
          <button
            type="button"
            className="timeframe-btn btn-calendar-trigger"
            onClick={() => setShowCalendar(true)}
            title="Open Interactive Calendar"
          >
            <CalendarIcon size={14} />
            <span>Calendar</span>
          </button>
        </div>

        <div className="range-indicator-badge">
          <ClockIcon size={14} />
          <span className="range-label">{activeRange.label}</span>
          <span className="tx-count-pill">{salesCount} orders</span>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (
        <div className="modal-backdrop" onClick={() => setShowCalendar(false)}>
          <div className="modal-window calendar-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <CalendarIcon size={18} />
                <h4>Sales Calendar</h4>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowCalendar(false)}
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="modal-content">
              <SalesCalendar
                month={calendarMonth}
                onChangeMonth={(next) => setCalendarMonth(next)}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d)
                  setTimeframe('today')
                  setShowCalendar(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Admin Passcode Modal */}
      {showAdminPrompt && (
        <div className="modal-backdrop" onClick={() => setShowAdminPrompt(false)}>
          <div className="modal-window admin-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <ShieldLockIcon size={18} />
                <h4>Admin Security Access</h4>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAdminPrompt(false)}
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="modal-content">
              <p className="admin-modal-desc">
                Enter your administrative passcode to access maintenance controls and data reset tools.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const stored = localStorage.getItem('sg-admin-passcode') || '1234'
                  if (adminPassInput === stored) {
                    setAdminAuthorized(true)
                    setAdminPassInput('')
                    setShowAdminPrompt(false)
                  } else {
                    alert('Incorrect passcode. Default is 1234.')
                  }
                }}
                className="admin-pass-form"
              >
                <input
                  type="password"
                  className="admin-input-field"
                  placeholder="Enter passcode (default 1234)"
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-pos-primary btn-unlock">
                  Unlock Admin
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Passcode Modal */}
      {showPassSettings && (
        <div className="modal-backdrop" onClick={() => setShowPassSettings(false)}>
          <div className="modal-window admin-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <SettingsIcon size={18} />
                <h4>Change Admin Passcode</h4>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowPassSettings(false)}
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="modal-content">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!newPass) return alert('Passcode cannot be empty.')
                  if (newPass !== newPassConfirm) return alert('Passcodes do not match.')
                  localStorage.setItem('sg-admin-passcode', newPass)
                  setNewPass('')
                  setNewPassConfirm('')
                  setShowPassSettings(false)
                  alert('Passcode updated successfully!')
                }}
                className="admin-change-form"
              >
                <input
                  type="password"
                  className="admin-input-field"
                  placeholder="New passcode"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="admin-input-field"
                  placeholder="Confirm new passcode"
                  value={newPassConfirm}
                  onChange={(e) => setNewPassConfirm(e.target.value)}
                  required
                />
                <button type="submit" className="btn-pos-primary">
                  Save Passcode
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Order Ticket Inspector Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="modal-window order-inspector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <CoffeeIcon size={18} />
                <h4>Order #{selectedOrder.orderNumber ?? selectedOrder.id} Details</h4>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="modal-content order-inspector-content">
              <div className="inspector-meta-grid">
                <div className="inspector-meta-item">
                  <span className="inspector-meta-label">Date & Time</span>
                  <span className="inspector-meta-val">
                    {new Date(selectedOrder.timestamp).toLocaleDateString()} {new Date(selectedOrder.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="inspector-meta-item">
                  <span className="inspector-meta-label">Cashier / Staff</span>
                  <span className="inspector-meta-val">{selectedOrder.staff || 'Unassigned'}</span>
                </div>
                {selectedOrder.customerName && (
                  <div className="inspector-meta-item">
                    <span className="inspector-meta-label">Customer / Callout</span>
                    <span className="inspector-meta-val bold-text">{selectedOrder.customerName}</span>
                  </div>
                )}
                <div className="inspector-meta-item">
                  <span className="inspector-meta-label">Payment & Shift</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`payment-tag tag-${selectedOrder.paymentType ?? 'cash'}`}>
                      {(selectedOrder.paymentType ?? 'cash').toUpperCase()}
                    </span>
                    <span
                      className={`shift-badge ${selectedOrder.shift === '5pm-2am' ? 'shift-5pm-2am' : 'shift-morning'}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {selectedOrder.shift === '5pm-2am' ? '5PM – 2AM' : (selectedOrder.shift ?? '5PM – 2AM')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="inspector-items-card">
                <h5 className="inspector-section-heading">Items Ordered ({selectedOrder.itemsCount})</h5>
                <div className="inspector-items-table">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="inspector-item-row">
                        <div className="inspector-item-left">
                          <span className="inspector-item-qty">{it.qty}×</span>
                          <span className="inspector-item-name">{it.name}</span>
                          <span className={`size-tag size-tag--${it.size}`}>{it.size.toUpperCase()}</span>
                          {it.addons && Object.keys(it.addons).length > 0 && (
                            <span className="addons-summary-tag">
                              (+{Object.entries(it.addons).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ')).join(', ')})
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-subtext">No itemized lines recorded for this legacy transaction.</div>
                  )}
                </div>
              </div>

              <div className="inspector-financials">
                {selectedOrder.subtotal != null && selectedOrder.subtotal !== selectedOrder.amount && (
                  <div className="inspector-fin-row">
                    <span>Subtotal</span>
                    <span>₱{selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                )}
                {selectedOrder.discount != null && selectedOrder.discount > 0 && (
                  <div className="inspector-fin-row discount-row">
                    <span>Discount ({selectedOrder.discountType?.toUpperCase() ?? 'PROMO'})</span>
                    <span>-₱{selectedOrder.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="inspector-fin-row total-fin-row">
                  <span>Grand Total</span>
                  <span className="grand-val">₱{selectedOrder.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero KPI Stat Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-sales">
          <div className="kpi-card-header">
            <span className="kpi-title">Gross Sales</span>
            <div className="kpi-icon-wrap icon-green">
              <DollarSignIcon size={18} />
            </div>
          </div>
          <div className="kpi-value">₱{salesActive.toLocaleString()}</div>
          <div className="kpi-subtext">
            <span>{salesCount} completed tickets</span>
          </div>
        </div>

        <div className="kpi-card kpi-expenses">
          <div className="kpi-card-header">
            <span className="kpi-title">Total Expenses</span>
            <div className="kpi-icon-wrap icon-red">
              <TrendingDownIcon size={18} />
            </div>
          </div>
          <div className="kpi-value">₱{expensesActive.toLocaleString()}</div>
          <div className="kpi-subtext">
            <span>{expensesCount} expense records</span>
          </div>
        </div>

        <div className="kpi-card kpi-net">
          <div className="kpi-card-header">
            <span className="kpi-title">Net Profit</span>
            <div className={`kpi-icon-wrap ${netProfit >= 0 ? 'icon-emerald' : 'icon-rose'}`}>
              <TrendingUpIcon size={18} />
            </div>
          </div>
          <div className={`kpi-value ${netProfit >= 0 ? 'value-positive' : 'value-negative'}`}>
            ₱{netProfit.toLocaleString()}
          </div>
          <div className="kpi-subtext">
            <span className={`margin-badge ${netProfit >= 0 ? 'margin-good' : 'margin-loss'}`}>
              {profitMargin}% margin
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-cups">
          <div className="kpi-card-header">
            <span className="kpi-title">Beverages / Cups</span>
            <div className="kpi-icon-wrap icon-amber">
              <CoffeeIcon size={18} />
            </div>
          </div>
          <div className="kpi-value">{cupsActive.toLocaleString()}</div>
          <div className="kpi-subtext">
            <span>Drinks brewed (excl. food)</span>
          </div>
        </div>

        <div className="kpi-card kpi-ticket">
          <div className="kpi-card-header">
            <span className="kpi-title">Average Ticket</span>
            <div className="kpi-icon-wrap icon-blue">
              <BarChartIcon size={18} />
            </div>
          </div>
          <div className="kpi-value">₱{avgTicket.toLocaleString()}</div>
          <div className="kpi-subtext">
            <span>Avg revenue per order</span>
          </div>
        </div>
      </div>

      {/* Hourly Flow Chart Section */}
      <div className="dashboard-section-card hourly-chart-card">
        <div className="section-card-header">
          <div className="section-title-wrap">
            <BarChartIcon size={18} className="header-icon" />
            <div>
              <h4>Hourly Revenue Flow</h4>
              <span className="section-subtitle">
                Sales pattern for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="section-header-actions">
            {peakHour.amount > 0 && (
              <span className="peak-hour-badge">
                🔥 Peak: {formatHour12(peakHour.hour)} • ₱{peakHour.amount.toLocaleString()}
              </span>
            )}
            <span className="hour-focus-badge">
              {formatHour12(hourSelected)}: <strong>₱{(hourly[hourSelected] ?? 0).toLocaleString()}</strong>
            </span>
            <button
              type="button"
              className="btn-export-outline"
              onClick={exportHourlyCSV}
              title="Download hourly breakdown CSV"
            >
              <DownloadIcon size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <HourlySalesReport
          bins={hourly}
          selectedHour={hourSelected}
          onSelectHour={(h) => setHourSelected(h)}
        />
      </div>

      {/* Breakdown Grid: Payment Methods, Shifts, Staff */}
      <div className="analytics-trio-grid">
        {/* Payment Methods */}
        <div className="dashboard-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <CreditCardIcon size={17} className="header-icon" />
              <h4>Payment Methods</h4>
            </div>
            <span className="header-subtotal">₱{totalPayments.toLocaleString()}</span>
          </div>

          <div className="payment-progress-bar">
            {totalPayments > 0 && (
              <>
                <div
                  className="bar-seg seg-cash"
                  style={{ width: `${(paymentBreakdown.cash / totalPayments) * 100}%` }}
                  title={`Cash: ₱${paymentBreakdown.cash}`}
                />
                <div
                  className="bar-seg seg-gcash"
                  style={{ width: `${(paymentBreakdown.gcash / totalPayments) * 100}%` }}
                  title={`GCash: ₱${paymentBreakdown.gcash}`}
                />
                <div
                  className="bar-seg seg-card"
                  style={{ width: `${(paymentBreakdown.card / totalPayments) * 100}%` }}
                  title={`Card: ₱${paymentBreakdown.card}`}
                />
              </>
            )}
          </div>

          <div className="payment-breakdown-list">
            <div className="payment-row">
              <div className="payment-channel">
                <span className="channel-dot dot-cash" />
                <DollarSignIcon size={14} />
                <span>Cash</span>
              </div>
              <div className="payment-amounts">
                <span className="channel-amt">₱{paymentBreakdown.cash.toLocaleString()}</span>
                <span className="channel-pct">
                  {totalPayments > 0 ? ((paymentBreakdown.cash / totalPayments) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>

            <div className="payment-row">
              <div className="payment-channel">
                <span className="channel-dot dot-gcash" />
                <SmartphoneIcon size={14} />
                <span>GCash</span>
              </div>
              <div className="payment-amounts">
                <span className="channel-amt">₱{paymentBreakdown.gcash.toLocaleString()}</span>
                <span className="channel-pct">
                  {totalPayments > 0 ? ((paymentBreakdown.gcash / totalPayments) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>

            <div className="payment-row">
              <div className="payment-channel">
                <span className="channel-dot dot-card" />
                <CreditCardIcon size={14} />
                <span>Card</span>
              </div>
              <div className="payment-amounts">
                <span className="channel-amt">₱{paymentBreakdown.card.toLocaleString()}</span>
                <span className="channel-pct">
                  {totalPayments > 0 ? ((paymentBreakdown.card / totalPayments) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shifts Breakdown */}
        <div className="dashboard-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <ClockIcon size={17} className="header-icon" />
              <h4>Sales per Shift</h4>
            </div>
          </div>

          <div className="shift-breakdown-list">
            <div className="shift-row">
              <div className="shift-meta">
                <span className="shift-badge shift-5pm-2am">5PM – 2AM Shift</span>
                <span className="shift-hours">5:00 PM – 2:00 AM (Active Garage Hours)</span>
              </div>
              <span className="shift-val">
                ₱{((shiftBreakdown['5pm-2am'] || 0) + (shiftBreakdown.evening || 0) + (shiftBreakdown.night || 0)).toLocaleString()}
              </span>
            </div>

            {(shiftBreakdown.morning > 0 || shiftBreakdown.afternoon > 0) && (
              <>
                {shiftBreakdown.morning > 0 && (
                  <div className="shift-row">
                    <div className="shift-meta">
                      <span className="shift-badge shift-morning">Legacy Morning</span>
                      <span className="shift-hours">Historical data</span>
                    </div>
                    <span className="shift-val">₱{shiftBreakdown.morning.toLocaleString()}</span>
                  </div>
                )}
                {shiftBreakdown.afternoon > 0 && (
                  <div className="shift-row">
                    <div className="shift-meta">
                      <span className="shift-badge shift-afternoon">Legacy Afternoon</span>
                      <span className="shift-hours">Historical data</span>
                    </div>
                    <span className="shift-val">₱{shiftBreakdown.afternoon.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sales by Staff */}
        <div className="dashboard-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <UsersIcon size={17} className="header-icon" />
              <h4>Sales per Staff</h4>
            </div>
          </div>

          <div className="staff-leaderboard">
            {Object.keys(staffBreakdown).length === 0 ? (
              <div className="empty-subtext">No staff assigned to recorded sales.</div>
            ) : (
              Object.entries(staffBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([name, amt]) => {
                  const initial = name.charAt(0).toUpperCase() || 'S'
                  return (
                    <div key={name} className="staff-row">
                      <div className="staff-identity">
                        <span className="staff-avatar">{initial}</span>
                        <span className="staff-name">{name}</span>
                      </div>
                      <span className="staff-amount">₱{amt.toLocaleString()}</span>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>

      {/* Bestsellers and Expense Logger Row */}
      <div className="dashboard-dual-grid">
        {/* Bestselling Items Leaderboard */}
        <div className="dashboard-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <CoffeeIcon size={17} className="header-icon" />
              <h4>Best-selling Items</h4>
            </div>
            <span className="items-total-tag">
              {bestSellers.reduce((s, b) => s + b.qty, 0)} items sold
            </span>
          </div>

          <div className="bestsellers-list">
            {bestSellers.length === 0 ? (
              <div className="empty-subtext">No item sales recorded in this period.</div>
            ) : (
              bestSellers.slice(0, 8).map((b, idx) => {
                const totalUnits = bestSellers.reduce((s, x) => s + x.qty, 0)
                const pct = totalUnits > 0 ? (b.qty / totalUnits) * 100 : 0
                return (
                  <div key={b.id} className="bestseller-item-row">
                    <div className="rank-and-name">
                      <span className={`rank-badge rank-${idx + 1}`}>#{idx + 1}</span>
                      <span className="product-name">{b.name}</span>
                    </div>
                    <div className="qty-and-bar">
                      <span className="qty-sold">{b.qty} sold</span>
                      <div className="proportion-track">
                        <div className="proportion-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Expense Management Card */}
        <div className="dashboard-section-card">
          <div className="section-card-header">
            <div className="section-title-wrap">
              <TrendingDownIcon size={17} className="header-icon" />
              <h4>Log Store Expense</h4>
            </div>
            <button
              type="button"
              className="btn-export-outline"
              onClick={() => exportCSV('expenses')}
              title="Export Expenses CSV"
            >
              <DownloadIcon size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Quick Expense Form */}
          <form className="expense-entry-form" onSubmit={submitExpense}>
            <div className="expense-inputs-row">
              <div className="expense-amount-wrap">
                <span className="currency-prefix">₱</span>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  className="expense-amount-input"
                  placeholder="Amount"
                  value={expenseAmt}
                  onChange={(e) => setExpenseAmt(e.target.value)}
                  required
                />
              </div>
              <input
                type="text"
                className="expense-note-input"
                placeholder="Description / note (e.g. Ice, Cups)"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
              />
              <button type="submit" className="btn-add-expense">
                <PlusIcon size={15} />
                <span>Log Expense</span>
              </button>
            </div>

            {/* Quick Note Suggestions */}
            <div className="quick-notes-pills">
              {quickExpenseNotes.map((note) => (
                <button
                  type="button"
                  key={note}
                  className="quick-note-pill"
                  onClick={() => setExpenseNote(note)}
                >
                  {note}
                </button>
              ))}
            </div>
          </form>

          {/* Recent Expenses List */}
          <div className="expenses-history-list">
            <div className="history-header">
              <span>Recent Expenses</span>
              <span>Total: ₱{expensesActive.toLocaleString()}</span>
            </div>
            {expenseRows.length === 0 ? (
              <div className="empty-subtext">No expenses recorded for this timeframe.</div>
            ) : (
              <div className="expense-rows-scroll">
                {expenseRows.slice(0, 6).map((e) => (
                  <div key={e.id} className="expense-log-row">
                    <div className="expense-log-left">
                      <span className="expense-log-time">
                        {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="expense-log-note">{e.note || 'General expense'}</span>
                    </div>
                    <span className="expense-log-amount">-₱{e.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Ledger / Recent Transactions */}
      <div className="dashboard-section-card">
        <div className="section-card-header">
          <div className="section-title-wrap">
            <DollarSignIcon size={17} className="header-icon" />
            <div>
              <h4>Sales Transaction Ledger</h4>
              <span className="section-subtitle">Detailed order log for the selected period • Tap any ticket to inspect</span>
            </div>
          </div>
          <div className="ledger-header-actions">
            <input
              type="text"
              placeholder="Search by ticket #, staff, customer..."
              className="ledger-filter-input"
              value={ledgerFilter}
              onChange={(e) => setLedgerFilter(e.target.value)}
            />
            <button
              type="button"
              className="btn-export-outline"
              onClick={() => exportCSV('sales')}
              title="Export all sales to CSV"
            >
              <DownloadIcon size={14} />
              <span>Export Sales CSV</span>
            </button>
          </div>
        </div>

        <div className="ledger-table-wrap">
          {filteredSalesRows.length === 0 ? (
            <div className="empty-subtext" style={{ padding: '24px 0' }}>
              {salesRows.length === 0 ? 'No sales transactions in this period.' : 'No orders matched your search filter.'}
            </div>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Order Time</th>
                  <th>Customer</th>
                  <th>Items Summary</th>
                  <th>Staff</th>
                  <th>Payment</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalesRows.slice(0, 20).map((s) => {
                  const payment = s.paymentType ?? 'cash'
                  const itemsSummary = Array.isArray(s.items) && s.items.length > 0
                    ? s.items.map((it) => `${it.name} (${it.size}) ×${it.qty}`).join(', ')
                    : `${s.itemsCount} items`

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedOrder(s)}
                      className="clickable-ledger-row"
                      title="Click to inspect order receipt"
                    >
                      <td className="col-ticket">
                        <span className="ticket-number-pill">
                          #{String(s.orderNumber ?? s.id ?? 1).padStart(3, '0')}
                        </span>
                      </td>
                      <td className="col-time">
                        {new Date(s.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="col-customer">
                        {s.customerName ? <span className="customer-tag">{s.customerName}</span> : '—'}
                      </td>
                      <td className="col-items" title={itemsSummary}>
                        {itemsSummary}
                      </td>
                      <td className="col-staff">{s.staff || '—'}</td>
                      <td className="col-payment">
                        <span className={`payment-tag tag-${payment}`}>
                          {payment.toUpperCase()}
                        </span>
                      </td>
                      <td className="col-amount">₱{s.amount.toLocaleString()}</td>
                      <td className="col-action" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-inspect-pill"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOrder(s)
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Admin Maintenance Section */}
      <div className="dashboard-section-card admin-maintenance-card">
        <div className="section-card-header">
          <div className="section-title-wrap">
            <ShieldLockIcon size={17} className="header-icon" />
            <div>
              <h4>Admin Maintenance & Security</h4>
              <span className="section-subtitle">Authorized POS operations & database management</span>
            </div>
          </div>

          {!adminAuthorized ? (
            <button
              type="button"
              className="btn-unlock-admin"
              onClick={() => setShowAdminPrompt(true)}
            >
              <ShieldLockIcon size={14} />
              <span>Unlock Admin Controls</span>
            </button>
          ) : (
            <div className="admin-actions-bar">
              <button
                type="button"
                className="btn-admin-danger"
                onClick={async () => {
                  if (window.confirm('Reset ALL sales history? This will permanently delete recorded sales.')) {
                    await resetSales()
                    alert('Sales history has been reset.')
                  }
                }}
              >
                Reset Sales
              </button>
              <button
                type="button"
                className="btn-admin-danger"
                onClick={async () => {
                  if (window.confirm('Reset ALL expense records? This will permanently delete expenses.')) {
                    await resetExpenses()
                    alert('Expenses history has been reset.')
                  }
                }}
              >
                Reset Expenses
              </button>
              <button
                type="button"
                className="btn-admin-danger btn-admin-danger-all"
                onClick={async () => {
                  if (window.confirm('RESET ALL DATA? This will wipe ALL sales and expenses forever.')) {
                    await resetAllData()
                    alert('All data reset complete.')
                  }
                }}
              >
                Reset All Data
              </button>
              <button
                type="button"
                className="btn-admin-pill"
                onClick={() => setShowPassSettings(true)}
              >
                Change Passcode
              </button>
              <button
                type="button"
                className="btn-admin-pill btn-lock"
                onClick={() => setAdminAuthorized(false)}
              >
                Lock Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
