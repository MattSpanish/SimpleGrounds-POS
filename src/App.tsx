import { useState } from 'react'

type MenuItem = { id: number; name: string; price: number }

// Example menu list (expand with all your items)
const MENU: MenuItem[] = [
  { id: 1, name: 'Americano Hot/Iced', price: 80 },
  { id: 2, name: 'Spanish Latte', price: 125 },
  { id: 3, name: 'Matcha Latte', price: 99 },
  { id: 4, name: 'Ube Latte', price: 115 },
]

export default function POS() {
  const [cart, setCart] = useState<MenuItem[]>([])
  const [printer, setPrinter] = useState<BluetoothRemoteGATTCharacteristic | null>(null)

  const addItem = (item: MenuItem) => setCart((prev) => [...prev, item])
  const total = cart.reduce((sum, i) => sum + i.price, 0)

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

  const printReceipt = async () => {
    if (!printer) return alert('Connect to printer first.')

    const encoder = new TextEncoder()
    let output = ''

    output += '   SIMPLI GROUNDS RECEIPT\n'
    output += '-----------------------------\n'

    cart.forEach((item) => {
      output += `${item.name}  P${item.price}\n`
    })

    output += '-----------------------------\n'
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
    <div style={{ padding: 20 }}>
      <h2>Coffee POS</h2>

      <div style={{ display: 'flex', gap: 10 }}>
        {MENU.map((item) => (
          <button
            key={item.id}
            onClick={() => addItem(item)}
            style={{ padding: 10, border: '1px solid #000', flex: 1 }}
          >
            {item.name} <br /> P{item.price}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 15 }}>
        <h3>Cart</h3>
        {cart.map((c, i) => (
          <div key={i}>
            {c.name} - P{c.price}
          </div>
        ))}
        <strong>Total: P{total}</strong>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={connectPrinter} style={{ marginRight: 10 }}>
          Connect Printer
        </button>
        <button onClick={printReceipt}>Print Receipt</button>
      </div>
    </div>
  )
}
