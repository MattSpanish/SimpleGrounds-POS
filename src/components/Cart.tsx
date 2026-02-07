import type { DrinkSize, MenuItem } from '../types/menu'
import type { PaymentType } from '../types/pos'
import { ADDONS } from '../data/addons'
import { MENU_SECTIONS } from '../data/menu'

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
  discount10: boolean
  onToggleDiscount: () => void
}

export default function Cart({ items, onRemove, onClear, onQtyChange, onToggleAddon, onConnectPrinter, onPrint, onCompleteSale, paymentType, staff, onChangePaymentType, onChangeStaff, discount10, onToggleDiscount }: CartProps) {
  const SIGNATURE_IDS = new Set<string>(
    (MENU_SECTIONS.find((s) => s.name === 'Signature Craft Drinks')?.subcategories || [])
      .flatMap((sub) => sub.items.map((i) => i.id))
  )
  const calcItemPrice = (ci: CartItem) => {
    const base = ci.size === 'iced' ? ci.item.prices.iced ?? 0 : ci.item.prices.hot ?? 0
    const addons = ADDONS.reduce((s, a) => s + (ci.addons[a.id] ? a.price : 0), 0)
    return (base + addons) * ci.qty
  }
  const subtotal = items.reduce((sum, ci) => sum + calcItemPrice(ci), 0)
  const discountAmt = discount10
    ? Math.round(
        items.reduce((sum, ci) => sum + (SIGNATURE_IDS.has(ci.item.id) ? calcItemPrice(ci) * 0.10 : 0), 0)
      )
    : 0
  const grandTotal = Math.max(0, subtotal - discountAmt)
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label>
            <input type="checkbox" checked={discount10} onChange={onToggleDiscount} /> 10% Discount
          </label>
        </div>
        <div><strong>Subtotal:</strong> P{subtotal}</div>
        {discount10 && <div><strong>Discount 10%:</strong> -P{discountAmt}</div>}
        <div><strong>Total:</strong> P{grandTotal}</div>
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
        <div className="cart__buttons">
          <button
            onClick={() => {
              if (items.length === 0) return
              const ok = window.confirm('Clear the cart?')
              if (ok) onClear()
            }}
            className="secondary"
            disabled={items.length === 0}
          >
            Clear Cart
          </button>
          <button onClick={onConnectPrinter} className="btn btn-connect">Connect Printer</button>
          <button onClick={onPrint} className="btn btn-print" disabled={grandTotal <= 0}>Print Receipt</button>
          <button onClick={onCompleteSale} className="btn btn-complete" disabled={grandTotal <= 0}>Complete Sale</button>
        </div>
      </div>
    </div>
  )
}
