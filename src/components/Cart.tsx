import type { DrinkSize, MenuItem } from '../types/menu'
import type { PaymentType } from '../types/pos'
import { ADDONS } from '../data/addons'

export type CartItem = {
  item: MenuItem
  size: DrinkSize
  qty: number
  addons: Record<string, boolean>
}

export type CartProps = {
  items: CartItem[]
  onRemove: (index: number) => void
  onClear: () => void
  onQtyChange: (index: number, delta: 1 | -1) => void
  onToggleAddon: (index: number, addonId: string) => void
  onConnectPrinter: () => Promise<void>
  onPrint: () => Promise<void>
  onCompleteSale: () => Promise<void>
  paymentType: PaymentType
  staff: string
  onChangePaymentType: (p: PaymentType) => void
  onChangeStaff: (s: string) => void
}

export default function Cart({ items, onRemove, onClear, onQtyChange, onToggleAddon, onConnectPrinter, onPrint, onCompleteSale, paymentType, staff, onChangePaymentType, onChangeStaff }: CartProps) {
  const calcItemPrice = (ci: CartItem) => {
    const base = ci.size === 'iced' ? ci.item.prices.iced ?? 0 : ci.item.prices.hot ?? 0
    const addons = ADDONS.reduce((s, a) => s + (ci.addons[a.id] ? a.price : 0), 0)
    return (base + addons) * ci.qty
  }
  const total = items.reduce((sum, ci) => sum + calcItemPrice(ci), 0)
  return (
    <div className="cart">
      <h3>Cart</h3>
      <div className="cart__list">
        {items.length === 0 && <div className="cart__empty">No items added yet.</div>}
        {items.map((ci, idx) => (
          <div key={idx} className="cart__row">
            <div>
              <strong>{ci.item.name}</strong> <span className="muted">({ci.size})</span>
              <div className="cart__addons">
                {ADDONS.map((a) => (
                  <label key={a.id} className="addon">
                    <input
                      type="checkbox"
                      checked={!!ci.addons[a.id]}
                      onChange={() => onToggleAddon(idx, a.id)}
                    />
                    {a.name} +P{a.price}
                  </label>
                ))}
              </div>
            </div>
            <div className="cart__qty">
              <button className="secondary" onClick={() => onQtyChange(idx, -1)} disabled={ci.qty <= 1}>-</button>
              <span>{ci.qty}</span>
              <button className="secondary" onClick={() => onQtyChange(idx, 1)}>+</button>
            </div>
            <div className="cart__price">P{calcItemPrice(ci)}</div>
            <button className="link" onClick={() => onRemove(idx)}>remove</button>
          </div>
        ))}
      </div>
      <div className="cart__total">
        <strong>Total:</strong> P{total}
      </div>
      <div className="cart__actions">
        <div className="cart__meta">
          <label>
            Payment:
            <select value={paymentType} onChange={(e) => onChangePaymentType(e.target.value as PaymentType)}>
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="card">Card</option>
            </select>
          </label>
          <label>
            Staff:
            <input type="text" placeholder="Name" value={staff} onChange={(e) => onChangeStaff(e.target.value)} />
          </label>
        </div>
        <button onClick={onClear} className="secondary">Clear Cart</button>
        <button onClick={onConnectPrinter} className="btn btn-connect">Connect Printer</button>
        <button onClick={onPrint} className="btn btn-print">Print Receipt</button>
        <button onClick={onCompleteSale} className="btn btn-complete">Complete Sale</button>
      </div>
    </div>
  )
}
