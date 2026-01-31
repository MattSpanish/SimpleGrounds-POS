import type { DrinkSize, MenuItem } from '../types/menu'

export type CartItem = {
  item: MenuItem
  size: DrinkSize
}

export type CartProps = {
  items: CartItem[]
  onRemove: (index: number) => void
  onClear: () => void
  onConnectPrinter: () => Promise<void>
  onPrint: () => Promise<void>
}

export default function Cart({ items, onRemove, onClear, onConnectPrinter, onPrint }: CartProps) {
  const total = items.reduce((sum, ci) => sum + (ci.size === 'iced' ? ci.item.prices.iced ?? 0 : ci.item.prices.hot ?? 0), 0)
  return (
    <div className="cart">
      <h3>Cart</h3>
      <div className="cart__list">
        {items.length === 0 && <div className="cart__empty">No items added yet.</div>}
        {items.map((ci, idx) => (
          <div key={idx} className="cart__row">
            <div>
              <strong>{ci.item.name}</strong> <span className="muted">({ci.size})</span>
            </div>
            <div className="cart__price">P{ci.size === 'iced' ? ci.item.prices.iced : ci.item.prices.hot}</div>
            <button className="link" onClick={() => onRemove(idx)}>remove</button>
          </div>
        ))}
      </div>
      <div className="cart__total">
        <strong>Total:</strong> P{total}
      </div>
      <div className="cart__actions">
        <button onClick={onClear} className="secondary">Clear Cart</button>
        <button onClick={onConnectPrinter}>Connect Printer</button>
        <button onClick={onPrint}>Print Receipt</button>
      </div>
    </div>
  )
}
