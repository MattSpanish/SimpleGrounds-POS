import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Sale, SaleItem, PaymentType, Shift, DiscountType } from '../types/pos'
import {
  addExpense,
  dateUtils,
  getBestSellingItems,
  getPaymentBreakdown,
  getSalesPerStaff,
  getSalesPerShift,
  getHourlySales,
  deleteSale,
  updateSale,
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
  CroissantIcon,
  DollarSignIcon,
  DownloadIcon,
  EditIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  ShieldLockIcon,
  SmartphoneIcon,
  TrashIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  XIcon,
} from './Icons'

type TimeframePreset = 'today' | 'yesterday' | 'week' | 'month'

function isPastryOrFoodItem(it: { id?: string; name?: string; size?: string }): boolean {
  if (it.size === 'iced' || it.size === 'hot') return false
  const id = (it.id || '').toLowerCase()
  const name = (it.name || '').toLowerCase()
  return (
    id.includes('mango-graham') ||
    id.includes('biscoff cream') ||
    id.includes('pastry') ||
    id.includes('cookie') ||
    id.includes('cake') ||
    id.includes('croissant') ||
    id.includes('muffin') ||
    name.includes('graham') ||
    name.includes('biscoff cream') ||
    name.includes('pastry') ||
    name.includes('cookie') ||
    name.includes('cake') ||
    name.includes('croissant') ||
    name.includes('muffin')
  )
}

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

  // Admin edit & delete sale state
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editOrderNum, setEditOrderNum] = useState<number>(1)
  const [editCustomerName, setEditCustomerName] = useState<string>('')
  const [editStaff, setEditStaff] = useState<string>('')
  const [editPaymentType, setEditPaymentType] = useState<PaymentType>('cash')
  const [editShift, setEditShift] = useState<Shift>('5pm-2am')
  const [editSubtotal, setEditSubtotal] = useState<string>('')
  const [editDiscount, setEditDiscount] = useState<string>('')
  const [editDiscountType, setEditDiscountType] = useState<DiscountType>('none')
  const [editAmount, setEditAmount] = useState<string>('')
  const [editTimestamp, setEditTimestamp] = useState<string>('')
  const [editItems, setEditItems] = useState<SaleItem[]>([])
  const [adminSalesSearch, setAdminSalesSearch] = useState<string>('')

  const handleOpenEdit = (s: Sale) => {
    setEditingSale(s)
    setEditOrderNum(s.orderNumber ?? s.id ?? 1)
    setEditCustomerName(s.customerName || '')
    setEditStaff(s.staff || '')
    setEditPaymentType(s.paymentType || 'cash')
    setEditShift(s.shift || '5pm-2am')
    setEditSubtotal(String(s.subtotal ?? s.amount ?? 0))
    setEditDiscount(String(s.discount ?? 0))
    setEditDiscountType(s.discountType || 'none')
    setEditAmount(String(s.amount ?? 0))
    const d = new Date(s.timestamp)
    const pad = (n: number) => String(n).padStart(2, '0')
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    setEditTimestamp(localIso)
    setEditItems(Array.isArray(s.items) ? JSON.parse(JSON.stringify(s.items)) : [])
  }

  const handleDeleteSale = async (s: Sale) => {
    if (!adminAuthorized) {
      setShowAdminPrompt(true)
      return
    }
    if (s.id == null) return

    const ticketName = `Ticket #${String(s.orderNumber ?? s.id).padStart(3, '0')}`
    const confirmed = window.confirm(
      `Are you sure you want to permanently DELETE ${ticketName} (₱${s.amount.toLocaleString()})?\n\nThis cannot be undone and will update all sales analytics.`
    )
    if (!confirmed) return

    try {
      await deleteSale(s.id)
      if (selectedOrder?.id === s.id) {
        setSelectedOrder(null)
      }
      if (editingSale?.id === s.id) {
        setEditingSale(null)
      }
      alert(`${ticketName} has been permanently deleted.`)
    } catch (err) {
      console.error('Failed to delete sale:', err)
      alert('Failed to delete sale record.')
    }
  }

  const handleSaveSaleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSale || editingSale.id == null) return

    const parsedAmount = parseFloat(editAmount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      alert('Please enter a valid total amount.')
      return
    }

    const parsedSubtotal = parseFloat(editSubtotal)
    const parsedDiscount = parseFloat(editDiscount)
    const totalItemsCount = editItems.reduce((acc, it) => acc + (it.qty || 1), 0)
    const updatedDate = editTimestamp ? new Date(editTimestamp) : new Date(editingSale.timestamp)

    const changes: Partial<Sale> = {
      orderNumber: Number(editOrderNum) || 1,
      customerName: editCustomerName.trim() || '',
      staff: editStaff.trim() || '',
      paymentType: editPaymentType,
      shift: editShift,
      subtotal: isNaN(parsedSubtotal) ? parsedAmount : parsedSubtotal,
      discount: isNaN(parsedDiscount) ? 0 : parsedDiscount,
      discountType: editDiscountType,
      amount: parsedAmount,
      itemsCount: totalItemsCount > 0 ? totalItemsCount : (editingSale.itemsCount || 1),
      items: editItems.length > 0 ? editItems : undefined,
      timestamp: isNaN(updatedDate.getTime()) ? new Date(editingSale.timestamp) : updatedDate,
    }

    try {
      await updateSale(editingSale.id, changes)
      if (selectedOrder?.id === editingSale.id) {
        setSelectedOrder({ ...editingSale, ...changes })
      }
      setEditingSale(null)
      alert(`Ticket #${String(changes.orderNumber).padStart(3, '0')} updated successfully!`)
    } catch (err) {
      console.error('Failed to update sale:', err)
      alert('Failed to update sale record.')
    }
  }

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

  const adminFilteredSales = useMemo(() => {
    if (!adminSalesSearch.trim()) return salesRows
    const q = adminSalesSearch.toLowerCase().trim()
    return salesRows.filter((s) => {
      const staffMatch = s.staff && s.staff.toLowerCase().includes(q)
      const customerMatch = s.customerName && s.customerName.toLowerCase().includes(q)
      const paymentMatch = s.paymentType && s.paymentType.toLowerCase().includes(q)
      const orderNumMatch = s.orderNumber && String(s.orderNumber).includes(q)
      const itemsMatch = Array.isArray(s.items) && s.items.some((it) => it.name.toLowerCase().includes(q))
      return staffMatch || customerMatch || paymentMatch || orderNumMatch || itemsMatch
    })
  }, [salesRows, adminSalesSearch])

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

  const { beveragesActive, pastriesActive } = useMemo(() => {
    let bevs = 0
    let pastries = 0
    for (const row of salesRows) {
      if (Array.isArray(row.items) && row.items.length > 0) {
        for (const it of row.items) {
          const qty = it.qty || 1
          if (isPastryOrFoodItem(it)) {
            pastries += qty
          } else {
            bevs += qty
          }
        }
      } else {
        bevs += row.itemsCount ?? 0
      }
    }
    return { beveragesActive: bevs, pastriesActive: pastries }
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
      ? ['date', 'amount', 'totalItems', 'beverages', 'pastries_cups', 'paymentType', 'staff', 'shift', 'items']
      : ['date', 'amount', 'note']

    const csvRows = [headers.join(',')]
    let itemsSubtotal = 0
    let beveragesSubtotal = 0
    let pastriesSubtotal = 0
    let amountSubtotal = 0
    let gcashSubtotal = 0

    if (type === 'sales') {
      for (const s of salesRows) {
        const date = new Date(s.timestamp).toISOString()
        amountSubtotal += Number(s.amount) || 0
        if ((s.paymentType ?? 'cash') === 'gcash') {
          gcashSubtotal += Number(s.amount) || 0
        }

        let rowBeverages = 0
        let rowPastries = 0
        if (Array.isArray(s.items) && s.items.length > 0) {
          for (const it of s.items) {
            const qty = it.qty || 1
            if (isPastryOrFoodItem(it)) {
              rowPastries += qty
            } else {
              rowBeverages += qty
            }
          }
        } else {
          rowBeverages = s.itemsCount ?? 0
        }

        const count = s.itemsCount ?? (rowBeverages + rowPastries)
        itemsSubtotal += count
        beveragesSubtotal += rowBeverages
        pastriesSubtotal += rowPastries

        const itemsStr = Array.isArray(s.items)
          ? `"${s.items.map((it: SaleItem) => `${it.name} (${it.size}) x${it.qty}`).join('; ')}"`
          : '""'
        csvRows.push([
          date,
          String(s.amount),
          String(count),
          String(rowBeverages),
          String(rowPastries),
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
      csvRows.push(['Total Items Sold', String(itemsSubtotal)].join(','))
      csvRows.push(['Total Beverages (Drinks)', String(beveragesSubtotal)].join(','))
      csvRows.push(['Total Dessert Cups & Pastries', String(pastriesSubtotal)].join(','))
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

              <div className="inspector-actions-footer">
                {adminAuthorized ? (
                  <div className="inspector-admin-actions">
                    <button
                      type="button"
                      className="btn-inspector-edit"
                      onClick={() => handleOpenEdit(selectedOrder)}
                    >
                      <EditIcon size={14} />
                      <span>Edit Ticket</span>
                    </button>
                    <button
                      type="button"
                      className="btn-inspector-delete"
                      onClick={() => handleDeleteSale(selectedOrder)}
                    >
                      <TrashIcon size={14} />
                      <span>Delete Ticket</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-inspector-unlock"
                    onClick={() => setShowAdminPrompt(true)}
                  >
                    <ShieldLockIcon size={14} />
                    <span>Admin Controls (Unlock to Edit/Delete)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="modal-backdrop" onClick={() => setEditingSale(null)}>
          <div className="modal-window edit-sale-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <EditIcon size={18} />
                <h4>Edit Ticket #{editOrderNum}</h4>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingSale(null)}
                aria-label="Close"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSaleEdit} className="edit-sale-form">
              <div className="modal-content edit-sale-content">
                <div className="edit-sale-grid">
                  {/* Ticket Number */}
                  <div className="edit-field-group">
                    <label className="edit-field-label">Ticket / Order #</label>
                    <input
                      type="number"
                      min="1"
                      className="edit-field-input"
                      value={editOrderNum}
                      onChange={(e) => setEditOrderNum(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="edit-field-group">
                    <label className="edit-field-label">Date & Time</label>
                    <input
                      type="datetime-local"
                      className="edit-field-input"
                      value={editTimestamp}
                      onChange={(e) => setEditTimestamp(e.target.value)}
                      required
                    />
                  </div>

                  {/* Customer Name */}
                  <div className="edit-field-group">
                    <label className="edit-field-label">Customer Name</label>
                    <input
                      type="text"
                      className="edit-field-input"
                      placeholder="Walk-in / Customer callout"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                    />
                  </div>

                  {/* Staff / Cashier */}
                  <div className="edit-field-group">
                    <label className="edit-field-label">Cashier / Staff</label>
                    <input
                      type="text"
                      className="edit-field-input"
                      placeholder="Cashier name"
                      value={editStaff}
                      onChange={(e) => setEditStaff(e.target.value)}
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="edit-field-group">
                    <label className="edit-field-label">Payment Method</label>
                    <select
                      className="edit-field-select"
                      value={editPaymentType}
                      onChange={(e) => setEditPaymentType(e.target.value as PaymentType)}
                    >
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  {/* Shift */}
                  <div className="edit-field-group">
                    <label className="edit-field-label">Shift</label>
                    <select
                      className="edit-field-select"
                      value={editShift}
                      onChange={(e) => setEditShift(e.target.value as Shift)}
                    >
                      <option value="5pm-2am">5PM – 2AM</option>
                      <option value="morning">Morning (Legacy)</option>
                      <option value="afternoon">Afternoon (Legacy)</option>
                      <option value="evening">Evening (Legacy)</option>
                      <option value="night">Night (Legacy)</option>
                    </select>
                  </div>
                </div>

                {/* Items List */}
                <div className="edit-items-card">
                  <div className="edit-items-header">
                    <span className="edit-items-title">
                      Ordered Items ({editItems.reduce((acc, it) => acc + (it.qty || 1), 0)})
                    </span>
                  </div>
                  {editItems.length === 0 ? (
                    <div className="empty-subtext">No itemized lines recorded for this transaction.</div>
                  ) : (
                    <div className="edit-items-list">
                      {editItems.map((item, idx) => (
                        <div key={idx} className="edit-item-row">
                          <div className="edit-item-info">
                            <span className="edit-item-name">{item.name}</span>
                            <span className={`size-tag size-tag--${item.size}`}>{item.size?.toUpperCase()}</span>
                            {item.itemPrice && (
                              <span className="edit-item-price-tag">₱{item.itemPrice} ea</span>
                            )}
                          </div>
                          <div className="edit-item-controls">
                            <button
                              type="button"
                              className="edit-qty-btn"
                              onClick={() => {
                                setEditItems((prev) => {
                                  const next = [...prev]
                                  if (next[idx].qty > 1) {
                                    next[idx] = { ...next[idx], qty: next[idx].qty - 1 }
                                  } else {
                                    next.splice(idx, 1)
                                  }
                                  return next
                                })
                              }}
                              title="Decrease quantity or remove"
                            >
                              <MinusIcon size={12} />
                            </button>
                            <span className="edit-item-qty">{item.qty}</span>
                            <button
                              type="button"
                              className="edit-qty-btn"
                              onClick={() => {
                                setEditItems((prev) => {
                                  const next = [...prev]
                                  next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + 1 }
                                  return next
                                })
                              }}
                              title="Increase quantity"
                            >
                              <PlusIcon size={12} />
                            </button>
                            <button
                              type="button"
                              className="edit-item-del-btn"
                              onClick={() => {
                                setEditItems((prev) => prev.filter((_, i) => i !== idx))
                              }}
                              title="Remove item"
                            >
                              <TrashIcon size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financials Breakdown */}
                <div className="edit-financials-card">
                  <div className="edit-fin-row">
                    <label>Subtotal (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="edit-fin-input"
                      value={editSubtotal}
                      onChange={(e) => {
                        const val = e.target.value
                        setEditSubtotal(val)
                        const numSub = parseFloat(val) || 0
                        const numDisc = parseFloat(editDiscount) || 0
                        setEditAmount(String(Math.max(0, numSub - numDisc)))
                      }}
                    />
                  </div>
                  <div className="edit-fin-row">
                    <label>Discount Type</label>
                    <select
                      className="edit-fin-select"
                      value={editDiscountType}
                      onChange={(e) => {
                        const dt = e.target.value as DiscountType
                        setEditDiscountType(dt)
                        const numSub = parseFloat(editSubtotal) || 0
                        if (dt === 'senior' || dt === 'pwd' || dt === 'loyalty_10') {
                          const d = Math.round(numSub * 0.1)
                          setEditDiscount(String(d))
                          setEditAmount(String(Math.max(0, numSub - d)))
                        } else if (dt === 'loyalty_50') {
                          const d = Math.round(numSub * 0.5)
                          setEditDiscount(String(d))
                          setEditAmount(String(Math.max(0, numSub - d)))
                        } else if (dt === 'none') {
                          setEditDiscount('0')
                          setEditAmount(String(numSub))
                        }
                      }}
                    >
                      <option value="none">None (0%)</option>
                      <option value="senior">Senior Citizen (10%)</option>
                      <option value="pwd">PWD (10%)</option>
                      <option value="loyalty_10">Loyalty Promo (10%)</option>
                      <option value="loyalty_50">Loyalty Promo (50%)</option>
                      <option value="custom">Custom Amount</option>
                    </select>
                  </div>
                  <div className="edit-fin-row">
                    <label>Discount Amount (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="edit-fin-input"
                      value={editDiscount}
                      onChange={(e) => {
                        const disc = e.target.value
                        setEditDiscount(disc)
                        const numSub = parseFloat(editSubtotal) || 0
                        const numDisc = parseFloat(disc) || 0
                        setEditAmount(String(Math.max(0, numSub - numDisc)))
                      }}
                    />
                  </div>
                  <div className="edit-fin-row edit-fin-row-total">
                    <label>Grand Total (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="edit-fin-input edit-fin-input-total"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer edit-modal-footer">
                <button
                  type="button"
                  className="btn-pos-secondary"
                  onClick={() => setEditingSale(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pos-primary btn-save-edit"
                >
                  Save Changes
                </button>
              </div>
            </form>
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

        <div className="kpi-card kpi-beverages">
          <div className="kpi-card-header">
            <span className="kpi-title">Beverages</span>
            <div className="kpi-icon-wrap icon-amber">
              <CoffeeIcon size={18} />
            </div>
          </div>
          <div className="kpi-value">{beveragesActive.toLocaleString()}</div>
          <div className="kpi-subtext">
            <span>Drinks brewed (coffee & tea)</span>
          </div>
        </div>

        <div className="kpi-card kpi-pastries">
          <div className="kpi-card-header">
            <span className="kpi-title">Dessert Cups & Pastries</span>
            <div className="kpi-icon-wrap icon-orange">
              <CroissantIcon size={18} />
            </div>
          </div>
          <div className="kpi-value">{pastriesActive.toLocaleString()}</div>
          <div className="kpi-subtext">
            <span>Graham cups & pastries sold</span>
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
                        <div className="ledger-actions-group">
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
                          {adminAuthorized && (
                            <>
                              <button
                                type="button"
                                className="btn-admin-edit-pill"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEdit(s)
                                }}
                                title="Edit sale"
                              >
                                <EditIcon size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-admin-delete-pill"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSale(s)
                                }}
                                title="Delete sale"
                              >
                                <TrashIcon size={12} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
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

        {!adminAuthorized ? (
          <div className="admin-locked-notice">
            <ShieldLockIcon size={28} className="admin-locked-icon" />
            <div className="admin-locked-texts">
              <h5>Admin Security Controls Locked</h5>
              <p>
                Enter the administrative passcode to access transaction management (edit & delete individual sales records), manage shift records, or perform system database maintenance.
              </p>
            </div>
            <button
              type="button"
              className="btn-pos-primary btn-unlock-panel"
              onClick={() => setShowAdminPrompt(true)}
            >
              <ShieldLockIcon size={15} />
              <span>Unlock Admin Controls</span>
            </button>
          </div>
        ) : (
          <div className="admin-unlocked-panel">
            <div className="admin-sales-manager-header">
              <div className="admin-sales-manager-title">
                <h5>Sales Transaction Management (Edit & Delete)</h5>
                <span className="admin-sales-manager-subtitle">
                  Showing {adminFilteredSales.length} {adminFilteredSales.length === 1 ? 'sale' : 'sales'} recorded in {activeRange.label}
                </span>
              </div>
              <div className="admin-sales-search-wrap">
                <SearchIcon size={14} className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Filter by ticket #, customer, staff, or payment..."
                  value={adminSalesSearch}
                  onChange={(e) => setAdminSalesSearch(e.target.value)}
                  className="admin-sales-search-input"
                />
                {adminSalesSearch && (
                  <button
                    type="button"
                    className="admin-search-clear"
                    onClick={() => setAdminSalesSearch('')}
                    title="Clear filter"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
            </div>

            {adminFilteredSales.length === 0 ? (
              <div className="admin-sales-empty">
                <CoffeeIcon size={24} />
                <p>No sales records found matching the filter in {activeRange.label}.</p>
              </div>
            ) : (
              <div className="admin-sales-table-wrapper">
                <table className="ledger-table admin-sales-table">
                  <thead>
                    <tr>
                      <th>Ticket</th>
                      <th>Order Time</th>
                      <th>Customer</th>
                      <th>Items Summary</th>
                      <th>Staff</th>
                      <th>Payment</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminFilteredSales.map((s) => {
                      const payment = s.paymentType ?? 'cash'
                      const itemsSummary = Array.isArray(s.items) && s.items.length > 0
                        ? s.items.map((it) => `${it.name} (${it.size}) ×${it.qty}`).join(', ')
                        : `${s.itemsCount} items`

                      return (
                        <tr key={s.id} className="clickable-ledger-row">
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
                          <td className="col-amount" style={{ textAlign: 'right' }}>
                            ₱{s.amount.toLocaleString()}
                          </td>
                          <td className="col-action" style={{ textAlign: 'center' }}>
                            <div className="ledger-actions-group">
                              <button
                                type="button"
                                className="btn-inspect-pill"
                                onClick={() => setSelectedOrder(s)}
                                title="View receipt"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="btn-admin-edit-pill"
                                onClick={() => handleOpenEdit(s)}
                                title="Edit sale"
                              >
                                <EditIcon size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-admin-delete-pill"
                                onClick={() => handleDeleteSale(s)}
                                title="Delete sale"
                              >
                                <TrashIcon size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

