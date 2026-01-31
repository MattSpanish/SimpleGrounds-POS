import { useEffect, useState } from 'react'
import './App.css'
import Menu from './components/Menu'
import Cart from './components/Cart'
import type { CartItem } from './components/Cart'
import type { DrinkSize, MenuItem } from './types/menu'
import Dashboard from './components/Dashboard'
import { addSale } from './data/stats'

export default function POS() {
  const [activeTab, setActiveTab] = useState<'pos' | 'sales'>('pos')
  const [printer, setPrinter] = useState<BluetoothRemoteGATTCharacteristic | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentType, setPaymentType] = useState<'cash' | 'gcash' | 'card'>('cash')
  const [staff, setStaff] = useState<string>('')

  // Persist cart for friendlier experience
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sg-pos-cart')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setCart(parsed)
      }
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('sg-pos-cart', JSON.stringify(cart))
    } catch {}
  }, [cart])

  // Persist active tab
  useEffect(() => {
    try {
      const raw = localStorage.getItem('sg-pos-tab')
      if (raw === 'sales' || raw === 'pos') setActiveTab(raw)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('sg-pos-tab', activeTab)
    } catch {}
  }, [activeTab])

  const connectPrinter = async () => {
    try {
      const navAny = navigator as any
      if (!navAny.bluetooth) {
        alert('This browser does not support Web Bluetooth. Try Chrome.')
        return
      }

      // Common BLE UART-style services used by thermal printers
      const knownServices: Array<{ service: number | string; characteristic: number | string }> = [
        // TI/HM-10 style
        { service: 0xffe0, characteristic: 0xffe1 },
        { service: '0000ffe0-0000-1000-8000-00805f9b34fb', characteristic: '0000ffe1-0000-1000-8000-00805f9b34fb' },
        // Nordic UART
        { service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', characteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
        // Some SPP-over-BLE implementations
        { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
      ]

      const device = await navAny.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: knownServices.map((s) => s.service),
      })

      const server = await device.gatt!.connect()

      let writable: BluetoothRemoteGATTCharacteristic | null = null
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
        alert('Connected, but no writable characteristic found. Your printer may not support BLE printing via Web Bluetooth or uses Classic Bluetooth (SPP). If it is the SDXP/XP-210, enable BLE mode or use USB/Wi‑Fi.')
        return
      }

      setPrinter(writable)
      alert('Printer connected!')
    } catch (err) {
      console.error(err)
      const msg = (err as any)?.message ?? 'Unknown error'
      alert(`Failed to connect printer: ${msg}`)
    }
  }

  const addItem = (item: MenuItem, size: DrinkSize) =>
    setCart((prev) => [...prev, { item, size, qty: 1, addons: {} }])
  const removeItem = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index))
  const clearCart = () => setCart([])
  const changeQty = (index: number, delta: 1 | -1) =>
    setCart((prev) => prev.map((ci, i) => (i === index ? { ...ci, qty: Math.max(1, ci.qty + delta) } : ci)))
  const toggleAddon = (index: number, addonId: string) =>
    setCart((prev) => prev.map((ci, i) => (i === index ? { ...ci, addons: { ...ci.addons, [addonId]: !ci.addons[addonId] } } : ci)))

  const calcCurrentTotal = () =>
    cart.reduce((sum, ci) => {
      const base = ci.size === 'iced' ? ci.item.prices.iced ?? 0 : ci.item.prices.hot ?? 0
      const addonsTotal = Object.entries(ci.addons)
        .filter(([, v]) => v)
        .reduce((s, [id]) => s + (id === 'oatside_oat_milk' ? 45 : id === 'espresso_shot' ? 60 : id === 'biscoff_crumbs' ? 25 : 0), 0)
      return sum + (base + addonsTotal) * ci.qty
    }, 0)
  const calcItemsCount = () => cart.reduce((s, ci) => s + ci.qty, 0)

  const completeSale = async () => {
    const total = calcCurrentTotal()
    if (total <= 0) return alert('Cart is empty.')
    try {
      await addSale(total, calcItemsCount(), {
        items: cart.map((ci) => ({ id: ci.item.id, name: ci.item.name, size: ci.size, qty: ci.qty })),
        paymentType,
        staff: staff || undefined,
      })
      setCart([])
      alert('Sale recorded!')
    } catch (e) {
      console.error(e)
      alert('Failed to record sale.')
    }
  }

  const printReceipt = async () => {
    if (!printer) return alert('Connect to printer first.')

    const encoder = new TextEncoder()
    let output = ''

    output += '   SIMPLI GROUNDS RECEIPT\n'
    output += '#9 San Francisco St. Phase 6\n'
    output += 'Pacita 1, San Pedro Laguna\n'
    output += '-----------------------------\n'

    cart.forEach((ci) => {
      const base = ci.size === 'iced' ? ci.item.prices.iced ?? 0 : ci.item.prices.hot ?? 0
      const addonsTotal = Object.entries(ci.addons)
        .filter(([, v]) => v)
        .reduce((s, [id]) => s + (id === 'oatside_oat_milk' ? 45 : id === 'espresso_shot' ? 60 : id === 'biscoff_crumbs' ? 25 : 0), 0)
      const line = (base + addonsTotal) * ci.qty
      output += `${ci.item.name} (${ci.size}) x${ci.qty}  P${line}\n`
    })

    output += '-----------------------------\n'
    const total = calcCurrentTotal()
    output += `TOTAL: P${total}\n`
    output += '\nThank you!\n\n\n'

    try {
      await printer.writeValue(encoder.encode(output))
      // Record sale on successful print
      try {
        await addSale(total, calcItemsCount(), {
          items: cart.map((ci) => ({ id: ci.item.id, name: ci.item.name, size: ci.size, qty: ci.qty })),
          paymentType,
          staff: staff || undefined,
        })
        setCart([])
      } catch (e) {
        console.warn('Failed to record sale:', e)
      }
      alert('Printed successfully!')
    } catch (err) {
      console.error(err)
      alert('Print failed!')
    }
  }

  return (
    <div>
      <div className="app__header">
        <div className="brand"><span className="accent">Simpli</span>Grounds • Coffee Street Garage</div>
        <div className="muted">Accepting customized drink • Add-ons available</div>
      </div>

      <div className="app__tabs">
        <button className={activeTab === 'pos' ? 'active' : ''} onClick={() => setActiveTab('pos')}>POS</button>
        <button className={activeTab === 'sales' ? 'active' : ''} onClick={() => setActiveTab('sales')}>Sales</button>
      </div>

      {activeTab === 'sales' ? (
        <Dashboard />
      ) : (
        <div className="layout">
          <Menu onAdd={addItem} />
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
            onChangePaymentType={setPaymentType}
            onChangeStaff={setStaff}
          />
        </div>
      )}
    </div>
  )
}
