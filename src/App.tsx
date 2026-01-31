import { useEffect, useState } from 'react'
import './App.css'
import Menu from './components/Menu'
import Cart from './components/Cart'
import type { CartItem } from './components/Cart'
import type { DrinkSize, MenuItem } from './types/menu'

export default function POS() {
  const [printer, setPrinter] = useState<BluetoothRemoteGATTCharacteristic | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

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

  const connectPrinter = async () => {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [0x1812],
      })

      const server = await device.gatt!.connect()
      const service = await server.getPrimaryService(0x1812)
      const characteristic = await service.getCharacteristic(0x2a56)

      setPrinter(characteristic)
      alert('Printer connected!')
    } catch (err) {
      console.error(err)
      alert('Failed to connect printer:')
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

  const printReceipt = async () => {
    if (!printer) return alert('Connect to printer first.')

    const encoder = new TextEncoder()
    let output = ''

    output += '   SIMPLI GROUNDS RECEIPT\n'
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
    const total = cart.reduce((sum, ci) => {
      const base = ci.size === 'iced' ? ci.item.prices.iced ?? 0 : ci.item.prices.hot ?? 0
      const addonsTotal = Object.entries(ci.addons)
        .filter(([, v]) => v)
        .reduce((s, [id]) => s + (id === 'oatside_oat_milk' ? 45 : id === 'espresso_shot' ? 60 : id === 'biscoff_crumbs' ? 25 : 0), 0)
      return sum + (base + addonsTotal) * ci.qty
    }, 0)
    output += `TOTAL: P${total}\n`
    output += '\nThank you!\n\n\n'

    try {
      await printer.writeValue(encoder.encode(output))
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
        />
      </div>
    </div>
  )
}
