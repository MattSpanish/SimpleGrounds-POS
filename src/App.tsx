import { useEffect, useState } from 'react'
import './App.css'
import Menu from './components/Menu'
import Cart, { type CartItem, type OrderMeta } from './components/Cart'
import type { DrinkSize, MenuItem } from './types/menu'
import Dashboard from './components/Dashboard'
import { addSale } from './data/stats'
import { DEFAULT_MENU_SECTIONS } from './data/menu'
import type { MenuSection } from './types/menu'
import {
  BarChartIcon,
  CheckCircleIcon,
  CoffeeIcon,
  LogOutIcon,
  PrinterIcon,
} from './components/Icons'
import LandingShiftScreen, { type ShiftSession } from './components/LandingShiftScreen'

const MENU_STORAGE_KEY = 'sg-custom-menu-sections'

function loadMenuSections(): MenuSection[] {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as MenuSection[]
    }
  } catch {
    // fall back to defaults
  }
  return DEFAULT_MENU_SECTIONS
}

type Toast = {
  id: string
  message: string
  type: 'success' | 'info' | 'error'
}

interface BluetoothCharacteristicLike {
  writeValue: (data: BufferSource) => Promise<void>
}

interface BluetoothServiceLike {
  getCharacteristic: (characteristic: number | string) => Promise<BluetoothCharacteristicLike>
}

interface BluetoothServerLike {
  getPrimaryService: (service: number | string) => Promise<BluetoothServiceLike>
}

interface BluetoothDeviceExtended {
  gatt?: {
    connect: () => Promise<BluetoothServerLike>
  }
}

interface NavigatorWithBluetooth {
  bluetooth?: {
    requestDevice: (options: {
      acceptAllDevices: boolean
      optionalServices: Array<number | string>
    }) => Promise<BluetoothDeviceExtended>
  }
}

export default function POS() {
  const [activeTab, setActiveTab] = useState<'pos' | 'sales'>(() => {
    try {
      const raw = localStorage.getItem('sg-pos-tab')
      if (raw === 'sales' || raw === 'pos') return raw
    } catch {
      // ignore
    }
    return 'pos'
  })
  const [printer, setPrinter] = useState<BluetoothCharacteristicLike | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem('sg-pos-cart')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed as CartItem[]
      }
    } catch {
      // ignore
    }
    return []
  })
  const [paymentType, setPaymentType] = useState<'cash' | 'gcash' | 'card'>('cash')
  const [staff, setStaff] = useState<string>(() => {
    try {
      return localStorage.getItem('sg-last-staff') || ''
    } catch {
      return ''
    }
  })
  const [activeShift, setActiveShift] = useState<ShiftSession | null>(() => {
    try {
      const raw = localStorage.getItem('sg-active-shift')
      if (raw) return JSON.parse(raw) as ShiftSession
    } catch {
      // ignore
    }
    return null
  })
  const [menuSections, setMenuSections] = useState<MenuSection[]>(loadMenuSections)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Persist staff
  useEffect(() => {
    if (staff) {
      try {
        localStorage.setItem('sg-last-staff', staff)
      } catch {
        // ignore
      }
    }
  }, [staff])

  const handleStartShift = (session: ShiftSession) => {
    setActiveShift(session)
    setStaff(session.staff)
    localStorage.setItem('sg-active-shift', JSON.stringify(session))
    showToast(`Welcome, ${session.staff}! ${session.shift.toUpperCase()} shift started.`, 'success')
  }

  const handleEndShift = () => {
    if (!activeShift) return
    if (window.confirm(`End shift for ${activeShift.staff}? This will log out of the active shift session.`)) {
      localStorage.removeItem('sg-active-shift')
      setActiveShift(null)
      showToast(`Shift ended for ${activeShift.staff}. Good job today!`, 'info')
    }
  }

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  // Persist cart changes
  useEffect(() => {
    try {
      localStorage.setItem('sg-pos-cart', JSON.stringify(cart))
    } catch {
      // ignore
    }
  }, [cart])

  // Persist active tab changes
  useEffect(() => {
    try {
      localStorage.setItem('sg-pos-tab', activeTab)
    } catch {
      // ignore
    }
  }, [activeTab])

  useEffect(() => {
    try {
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuSections))
    } catch {
      // ignore
    }
  }, [menuSections])

  const connectPrinter = async () => {
    try {
      const nav = navigator as unknown as NavigatorWithBluetooth
      if (!nav.bluetooth) {
        showToast('This browser does not support Web Bluetooth. Please use Google Chrome.', 'error')
        return
      }

      const knownServices: Array<{ service: number | string; characteristic: number | string }> = [
        { service: 0xffe0, characteristic: 0xffe1 },
        { service: '0000ffe0-0000-1000-8000-00805f9b34fb', characteristic: '0000ffe1-0000-1000-8000-00805f9b34fb' },
        { service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
        { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
      ]

      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: knownServices.map((s) => s.service),
      })

      const server = await device.gatt!.connect()

      let writable: BluetoothCharacteristicLike | null = null
      for (const pair of knownServices) {
        try {
          const service = await server.getPrimaryService(pair.service)
          const ch = await service.getCharacteristic(pair.characteristic)
          writable = ch
          break
        } catch {
          // try next service
        }
      }

      if (!writable) {
        showToast('Connected, but no writable characteristic found. Verify BLE mode.', 'error')
        return
      }

      setPrinter(writable)
      showToast('Thermal Printer connected successfully!', 'success')
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`Printer connection cancelled or failed: ${msg}`, 'error')
    }
  }

  const addItem = (item: MenuItem, size: DrinkSize) =>
    setCart((prev) => [...prev, { item, size, qty: 1, addons: {} }])

  const updateMenuItem = (sectionIndex: number, subcategoryIndex: number, itemIndex: number, nextItem: MenuItem) => {
    setMenuSections((prev) => prev.map((section, sIdx) => {
      if (sIdx !== sectionIndex) return section
      return {
        ...section,
        subcategories: section.subcategories.map((subcategory, subIdx) => {
          if (subIdx !== subcategoryIndex) return subcategory
          return {
            ...subcategory,
            items: subcategory.items.map((item, iIdx) => (iIdx === itemIndex ? nextItem : item)),
          }
        }),
      }
    }))
  }

  const addMenuItem = (sectionIndex: number, subcategoryIndex: number, item: MenuItem) => {
    setMenuSections((prev) => prev.map((section, sIdx) => {
      if (sIdx !== sectionIndex) return section
      return {
        ...section,
        subcategories: section.subcategories.map((subcategory, subIdx) => {
          if (subIdx !== subcategoryIndex) return subcategory
          return {
            ...subcategory,
            items: [...subcategory.items, item],
          }
        }),
      }
    }))
    showToast(`Added "${item.name}" to menu.`, 'info')
  }

  const removeMenuItem = (sectionIndex: number, subcategoryIndex: number, itemIndex: number) => {
    setMenuSections((prev) => prev.map((section, sIdx) => {
      if (sIdx !== sectionIndex) return section
      return {
        ...section,
        subcategories: section.subcategories.map((subcategory, subIdx) => {
          if (subIdx !== subcategoryIndex) return subcategory
          return {
            ...subcategory,
            items: subcategory.items.filter((_, iIdx) => iIdx !== itemIndex),
          }
        }),
      }
    }))
    showToast('Menu item removed.', 'info')
  }

  const resetMenuToDefaults = () => {
    setMenuSections(DEFAULT_MENU_SECTIONS)
    localStorage.removeItem(MENU_STORAGE_KEY)
    showToast('Menu restored to default settings.', 'success')
  }

  const removeItem = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index))
  const clearCart = () => setCart([])
  const changeQty = (index: number, delta: 1 | -1) =>
    setCart((prev) => prev.map((ci, i) => (i === index ? { ...ci, qty: Math.max(1, ci.qty + delta) } : ci)))
  const toggleAddon = (index: number, addonId: string) =>
    setCart((prev) => prev.map((ci, i) => (i === index ? { ...ci, addons: { ...ci.addons, [addonId]: !ci.addons[addonId] } } : ci)))

  const calcCurrentTotal = () =>
    cart.reduce((sum, ci) => {
      const base = ci.size === 'iced'
        ? ci.item.prices.iced ?? 0
        : ci.size === 'hot'
          ? ci.item.prices.hot ?? 0
          : ci.item.prices.regular ?? 0
      const addonsTotal = Object.entries(ci.addons)
        .filter(([, v]) => v)
        .reduce((s, [id]) => s + (id === 'oatside_oat_milk' ? 45 : id === 'espresso_shot' ? 60 : id === 'biscoff_crumbs' ? 25 : 0), 0)
      return sum + (base + addonsTotal) * ci.qty
    }, 0)

  const calcItemsCount = () => cart.reduce((s, ci) => s + ci.qty, 0)

  const completeSale = async (meta?: OrderMeta) => {
    const rawTotal = calcCurrentTotal()
    const discount = meta?.discount ?? 0
    const finalTotal = Math.max(0, rawTotal - discount)
    if (finalTotal <= 0 && cart.length === 0) {
      showToast('Cart is empty.', 'error')
      return
    }
    try {
      await addSale(finalTotal, calcItemsCount(), {
        items: cart.map((ci) => ({ id: ci.item.id, name: ci.item.name, size: ci.size, qty: ci.qty, addons: ci.addons })),
        paymentType,
        staff: staff || undefined,
        customerName: meta?.customerName,
        subtotal: rawTotal,
        discount: meta?.discount,
        discountType: meta?.discountType,
      })
      setCart([])
      showToast(`Sale recorded! ₱${finalTotal.toLocaleString()} (${paymentType.toUpperCase()})`, 'success')
    } catch (e) {
      console.error(e)
      showToast('Failed to record sale in database.', 'error')
    }
  }

  const printReceipt = async (meta?: OrderMeta) => {
    if (!printer) {
      showToast('Connect to thermal printer first.', 'error')
      return
    }

    const encoder = new TextEncoder()
    let output = ''

    const lineWidth = 32
    const hr = '-'.repeat(lineWidth)
    const center = (text: string) => {
      const t = text.trim()
      const pad = Math.max(0, Math.floor((lineWidth - t.length) / 2))
      return ' '.repeat(pad) + t + '\n'
    }
    const formatMoney = (n: number) => `P${n}`
    const formatLine = (left: string, right: string) => {
      const l = left.length > 22 ? left.slice(0, 22) : left
      const space = Math.max(1, lineWidth - l.length - right.length)
      return l + ' '.repeat(space) + right + '\n'
    }

    output += center('SIMPLI GROUNDS')
    output += center('Coffee Street Garage')
    output += center('#9 San Francisco St. Phase 6')
    output += center('Pacita 1, San Pedro Laguna')
    output += hr + '\n'
    output += `Date: ${new Date().toLocaleString()}\n`
    if (staff) output += `Barista: ${staff}\n`
    if (meta?.customerName) output += `Customer: ${meta.customerName}\n`
    output += `Payment: ${paymentType.toUpperCase()}\n`
    output += hr + '\n'

    cart.forEach((ci) => {
      const base = ci.size === 'iced'
        ? ci.item.prices.iced ?? 0
        : ci.size === 'hot'
          ? ci.item.prices.hot ?? 0
          : ci.item.prices.regular ?? 0
      const addonsTotal = Object.entries(ci.addons)
        .filter(([, v]) => v)
        .reduce((s, [id]) => s + (id === 'oatside_oat_milk' ? 45 : id === 'espresso_shot' ? 60 : id === 'biscoff_crumbs' ? 25 : 0), 0)
      const lineTotal = (base + addonsTotal) * ci.qty
      const left = `${ci.item.name} (${ci.size}) x${ci.qty}`
      const right = formatMoney(lineTotal)
      output += formatLine(left, right)
    })

    output += hr + '\n'
    const rawTotal = calcCurrentTotal()
    const discount = meta?.discount ?? 0
    const finalTotal = Math.max(0, rawTotal - discount)

    if (discount > 0) {
      const discTag = meta?.discountType === 'senior'
        ? 'DISC (SENIOR 10%)'
        : meta?.discountType === 'pwd'
          ? 'DISC (PWD 10%)'
          : meta?.discountType === 'loyalty_10'
            ? 'DISC (LOYALTY 10%)'
            : meta?.discountType === 'loyalty_50'
              ? 'DISC (LOYALTY 50%)'
              : meta?.discountType === 'custom'
                ? 'DISCOUNT (CUSTOM)'
                : 'DISCOUNT'
      output += formatLine('SUBTOTAL', formatMoney(rawTotal))
      output += formatLine(discTag, `-${formatMoney(discount)}`)
    }
    output += formatLine('TOTAL DUE', formatMoney(finalTotal))
    output += '\n'
    output += center('Thank you for brewing with us!')
    output += center('See you again soon!\n\n\n\n')

    try {
      await printer.writeValue(encoder.encode(output))
      // Record sale on successful print
      try {
        await addSale(finalTotal, calcItemsCount(), {
          items: cart.map((ci) => ({ id: ci.item.id, name: ci.item.name, size: ci.size, qty: ci.qty, addons: ci.addons })),
          paymentType,
          staff: staff || undefined,
          customerName: meta?.customerName,
          subtotal: rawTotal,
          discount: meta?.discount,
          discountType: meta?.discountType,
        })
        setCart([])
      } catch (e) {
        console.warn('Failed to record sale:', e)
      }
      showToast('Receipt printed and sale logged!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Print failed. Please verify printer connection.', 'error')
    }
  }

  const totalCartCount = calcItemsCount()

  return (
    <div className="pos-app">
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-pill toast-${t.type}`}>
            {t.type === 'success' && <CheckCircleIcon size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Top Application Header */}
      <header className="app-topbar">
        <div className="brand-section">
          <div className="brand-logo-badge">
            <CoffeeIcon size={24} className="brand-cup-icon" />
          </div>
          <div className="brand-text-block">
            <h1 className="brand-name">
              <span className="brand-highlight">Simpli</span>Grounds
            </h1>
            <span className="brand-tagline">Coffee Street Garage • Pacita 1, Laguna</span>
          </div>
        </div>

        {/* Center Live Clock */}
        <div className="topbar-center-meta">
          <div className="clock-badge">
            <span className="live-clock-time">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="live-clock-date">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Right Controls & Navigation Tabs */}
        <div className="topbar-right-controls">
          {/* Active Shift or Login Status */}
          {activeShift ? (
            <div className="active-shift-pill">
              <span className="shift-avatar-circle">{activeShift.staff.charAt(0).toUpperCase()}</span>
              <div className="shift-pill-texts">
                <span className="shift-pill-staff">{activeShift.staff}</span>
                <span className="shift-pill-type">
                  {activeShift.shift === '5pm-2am' ? '5PM – 2AM' : activeShift.shift} shift
                </span>
              </div>
              <button
                type="button"
                className="btn-end-shift-mini"
                onClick={handleEndShift}
                title="End current shift and log out"
              >
                <LogOutIcon size={14} />
              </button>
            </div>
          ) : (
            activeTab === 'sales' && (
              <button
                type="button"
                className="btn-start-shift-shortcut"
                onClick={() => setActiveTab('pos')}
              >
                <CoffeeIcon size={14} />
                <span>Start Shift</span>
              </button>
            )
          )}

          {/* Printer Connection Badge */}
          <button
            type="button"
            className={`printer-status-chip ${printer ? 'is-connected' : 'is-disconnected'}`}
            onClick={connectPrinter}
            title={printer ? 'Thermal printer online' : 'Click to connect Bluetooth printer'}
          >
            <PrinterIcon size={15} />
            <span className={`status-indicator-dot ${printer ? 'dot-active' : 'dot-idle'}`} />
            <span>{printer ? 'Printer Ready' : 'Printer Offline'}</span>
          </button>

          {/* Navigation Segments: POS vs Sales */}
          <nav className="tab-navigation-segmented">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'pos' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('pos')}
            >
              <CoffeeIcon size={16} />
              <span>Register</span>
              {activeShift && totalCartCount > 0 && (
                <span className="tab-cart-bubble">{totalCartCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'sales' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <BarChartIcon size={16} />
              <span>Sales & Analytics</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Screen Body */}
      <main className="app-main-viewport">
        {activeTab === 'sales' ? (
          <Dashboard />
        ) : !activeShift ? (
          <LandingShiftScreen
            onStartShift={handleStartShift}
            onDirectToSales={() => setActiveTab('sales')}
            defaultStaff={staff}
          />
        ) : (
          <>
            <div className="pos-terminal-layout">
              <Menu
                sections={menuSections}
                onAdd={addItem}
                onUpdateItem={updateMenuItem}
                onAddItem={addMenuItem}
                onRemoveItem={removeMenuItem}
                onResetMenu={resetMenuToDefaults}
              />
              <Cart
                items={cart}
                onRemove={removeItem}
                onClear={clearCart}
                onQtyChange={changeQty}
                onToggleAddon={toggleAddon}
                onConnectPrinter={connectPrinter}
                onPrint={printReceipt}
                onCompleteSale={completeSale}
                paymentType={paymentType}
                staff={staff}
                isPrinterConnected={!!printer}
                onChangePaymentType={setPaymentType}
                onChangeStaff={setStaff}
              />
            </div>

            {/* Tablet & Mobile Docked Quick-Cart Floating Bar */}
            {totalCartCount > 0 && (
              <div className="tablet-docked-cart-bar">
                <div className="docked-cart-info">
                  <div className="docked-cart-count-badge">
                    <CoffeeIcon size={16} />
                    <span>{totalCartCount} {totalCartCount === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div className="docked-cart-total-wrap">
                    <span className="docked-label">Total:</span>
                    <span className="docked-amount">₱{calcCurrentTotal().toLocaleString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-docked-checkout"
                  onClick={() => {
                    const cartEl = document.querySelector('.cart-sidebar')
                    cartEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <span>Review & Pay</span>
                  <span className="docked-btn-arrow">→</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
