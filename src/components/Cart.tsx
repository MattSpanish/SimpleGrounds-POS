import { useState } from 'react'
import type { DrinkSize, MenuItem } from '../types/menu'
import type { DiscountType, PaymentType } from '../types/pos'
import { ADDONS } from '../data/addons'
import {
  CheckCircleIcon,
  CreditCardIcon,
  DollarSignIcon,
  FlameIcon,
  IceIcon,
  MinusIcon,
  PlusIcon,
  PrinterIcon,
  ShoppingBagIcon,
  SmartphoneIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from './Icons'

export type CartItem = {
  item: MenuItem
  size: DrinkSize
  qty: number
  addons: Record<string, boolean>
}

export type OrderMeta = {
  customerName?: string
  discount?: number
  discountType?: DiscountType
  subtotal?: number
}

export type CartProps = {
  items: CartItem[]
  onRemove: (index: number) => void
  onClear: () => void
  onQtyChange: (index: number, delta: 1 | -1) => void
  onToggleAddon: (index: number, addonId: string) => void
  onConnectPrinter: () => Promise<void>
  onPrint: (meta?: OrderMeta) => Promise<void>
  onCompleteSale: (meta?: OrderMeta) => Promise<void>
  paymentType: PaymentType
  staff: string
  isPrinterConnected?: boolean
  onChangePaymentType: (p: PaymentType) => void
  onChangeStaff: (s: string) => void
}

export default function Cart({
  items,
  onRemove,
  onClear,
  onQtyChange,
  onToggleAddon,
  onConnectPrinter,
  onPrint,
  onCompleteSale,
  paymentType,
  staff,
  isPrinterConnected = false,
  onChangePaymentType,
  onChangeStaff,
}: CartProps) {
  const [customerName, setCustomerName] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [customDiscountAmt, setCustomDiscountAmt] = useState('')
  const [cashTendered, setCashTendered] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)

  const calcItemBasePrice = (ci: CartItem) => {
    if (ci.size === 'iced') return ci.item.prices.iced ?? 0
    if (ci.size === 'hot') return ci.item.prices.hot ?? 0
    return ci.item.prices.regular ?? 0
  }

  const calcItemAddonsPrice = (ci: CartItem) => {
    return ADDONS.reduce((s, a) => s + (ci.addons[a.id] ? a.price : 0), 0)
  }

  const calcItemTotal = (ci: CartItem) => {
    return (calcItemBasePrice(ci) + calcItemAddonsPrice(ci)) * ci.qty
  }

  const subtotalBase = items.reduce((sum, ci) => sum + calcItemBasePrice(ci) * ci.qty, 0)
  const subtotalAddons = items.reduce((sum, ci) => sum + calcItemAddonsPrice(ci) * ci.qty, 0)
  const subtotal = subtotalBase + subtotalAddons
  const totalItemsCount = items.reduce((sum, ci) => sum + ci.qty, 0)

  // Discount calculation
  let discountAmount = 0
  if (discountType === 'senior' || discountType === 'pwd' || discountType === 'loyalty_10') {
    discountAmount = Math.round(subtotal * 0.1) // 10% discount
  } else if (discountType === 'loyalty_50') {
    discountAmount = Math.round(subtotal * 0.5) // 50% loyalty discount
  } else if (discountType === 'custom') {
    discountAmount = Math.min(subtotal, Math.max(0, parseFloat(customDiscountAmt) || 0))
  }

  const formatDiscountName = (type: DiscountType) => {
    switch (type) {
      case 'senior':
        return 'SENIOR (10%)'
      case 'pwd':
        return 'PWD (10%)'
      case 'loyalty_10':
        return 'LOYALTY (10%)'
      case 'loyalty_50':
        return 'LOYALTY (50%)'
      case 'custom':
        return 'CUSTOM'
      default:
        return 'DISCOUNT'
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount)

  // Cash change calculation
  const tenderedNum = parseFloat(cashTendered) || 0
  const changeDue = tenderedNum > 0 ? tenderedNum - finalTotal : 0

  const buildOrderMeta = (): OrderMeta => ({
    customerName: customerName.trim() || undefined,
    discount: discountAmount,
    discountType,
    subtotal,
  })

  const handleCompleteOrder = async () => {
    if (finalTotal <= 0 && items.length === 0) return
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await onCompleteSale(buildOrderMeta())
      setCashTendered('')
      setCustomerName('')
      setDiscountType('none')
      setCustomDiscountAmt('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = async () => {
    await onPrint(buildOrderMeta())
  }

  const quickTenderAmounts = [
    { label: 'Exact', amount: finalTotal },
    { label: '₱100', amount: 100 },
    { label: '₱200', amount: 200 },
    { label: '₱500', amount: 500 },
    { label: '₱1,000', amount: 1000 },
  ].filter((btn) => btn.amount >= finalTotal || btn.label === 'Exact')

  return (
    <aside className="cart-sidebar">
      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="modal-backdrop" onClick={() => setShowReceiptPreview(false)}>
          <div className="modal-window receipt-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <PrinterIcon size={18} />
                <h4>Thermal Receipt Preview</h4>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowReceiptPreview(false)}
              >
                <XIcon size={18} />
              </button>
            </div>
            <div className="modal-content receipt-paper-view">
              <div className="receipt-paper">
                <div className="receipt-center-text bold-text">SIMPLI GROUNDS</div>
                <div className="receipt-center-text">Coffee Street Garage</div>
                <div className="receipt-center-text small-text">#9 San Francisco St. Phase 6</div>
                <div className="receipt-center-text small-text">Pacita 1, San Pedro Laguna</div>
                <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>
                <div className="receipt-meta-row">
                  <span>Date: {new Date().toLocaleDateString()}</span>
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {staff && <div className="receipt-meta-row"><span>Barista: {staff}</span></div>}
                {customerName && <div className="receipt-meta-row"><span>Customer: {customerName}</span></div>}
                <div className="receipt-meta-row"><span>Payment: {paymentType.toUpperCase()}</span></div>
                <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>
                <div className="receipt-items-table">
                  {items.map((ci, idx) => (
                    <div key={idx} className="receipt-line-item">
                      <div className="receipt-item-title">
                        <span>{ci.item.name} ({ci.size}) x{ci.qty}</span>
                        <span>₱{calcItemTotal(ci)}</span>
                      </div>
                      {Object.entries(ci.addons).some(([, v]) => v) && (
                        <div className="receipt-addons-note">
                          Addons: {Object.entries(ci.addons).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ')).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>
                <div className="receipt-subtotal-row">
                  <span>Subtotal:</span>
                  <span>₱{subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="receipt-subtotal-row discount-line">
                    <span>Discount ({formatDiscountName(discountType)}):</span>
                    <span>-₱{discountAmount}</span>
                  </div>
                )}
                <div className="receipt-total-row bold-text">
                  <span>TOTAL DUE:</span>
                  <span>₱{finalTotal}</span>
                </div>
                {paymentType === 'cash' && tenderedNum > 0 && (
                  <>
                    <div className="receipt-subtotal-row">
                      <span>Cash Tendered:</span>
                      <span>₱{tenderedNum}</span>
                    </div>
                    <div className="receipt-subtotal-row bold-text">
                      <span>Change:</span>
                      <span>₱{changeDue}</span>
                    </div>
                  </>
                )}
                <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>
                <div className="receipt-center-text small-text" style={{ marginTop: 8 }}>
                  Thank you for brewing with us!
                </div>
                <div className="receipt-center-text small-text">Have a coffee-powered day!</div>
              </div>

              <div className="receipt-preview-actions">
                <button
                  type="button"
                  className="btn-pos-primary"
                  onClick={() => {
                    handlePrint()
                    setShowReceiptPreview(false)
                  }}
                >
                  <PrinterIcon size={16} />
                  <span>Send to Printer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Header */}
      <div className="cart-header">
        <div className="cart-header-title">
          <ShoppingBagIcon size={20} className="cart-header-icon" />
          <h3>Current Order</h3>
          {totalItemsCount > 0 && <span className="cart-count-badge">{totalItemsCount}</span>}
        </div>

        <div className="cart-header-right-tools">
          {items.length > 0 && (
            <button
              type="button"
              className="btn-receipt-preview-pill"
              onClick={() => setShowReceiptPreview(true)}
              title="Preview thermal receipt"
            >
              <span>Preview</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              className="btn-clear-cart"
              title="Clear current order"
              onClick={() => {
                if (window.confirm('Clear all items from this order?')) {
                  onClear()
                  setCashTendered('')
                  setCustomerName('')
                  setDiscountType('none')
                }
              }}
            >
              <TrashIcon size={15} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Cart Item List */}
      <div className="cart-body">
        {items.length === 0 ? (
          <div className="cart-empty-state">
            <div className="cart-empty-art">☕</div>
            <p className="cart-empty-title">Order ticket is clear</p>
            <p className="cart-empty-desc">Tap drinks or pastries on the menu to start building an order</p>
          </div>
        ) : (
          <div className="cart-items-list">
            {items.map((ci, idx) => {
              const basePrice = calcItemBasePrice(ci)
              const lineTotal = calcItemTotal(ci)
              const hasAddons = Object.values(ci.addons).some(Boolean)

              return (
                <div key={`${ci.item.id}-${ci.size}-${idx}`} className="cart-item-card">
                  <div className="cart-item-main">
                    <div className="cart-item-info">
                      <div className="cart-item-title-row">
                        <span className="cart-item-name">{ci.item.name}</span>
                        <span className={`size-tag size-tag--${ci.size}`}>
                          {ci.size === 'iced' && <IceIcon size={12} />}
                          {ci.size === 'hot' && <FlameIcon size={12} />}
                          {ci.size.toUpperCase()}
                        </span>
                      </div>
                      <span className="cart-item-unit-price">₱{basePrice} each</span>
                    </div>

                    <div className="cart-item-right">
                      <span className="cart-item-total-price">₱{lineTotal}</span>
                      <button
                        type="button"
                        className="btn-item-remove"
                        onClick={() => onRemove(idx)}
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="cart-item-controls-row">
                    <div className="quantity-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => onQtyChange(idx, -1)}
                        disabled={ci.qty <= 1}
                        title="Decrease quantity"
                      >
                        <MinusIcon size={13} />
                      </button>
                      <span className="stepper-val">{ci.qty}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => onQtyChange(idx, 1)}
                        title="Increase quantity"
                      >
                        <PlusIcon size={13} />
                      </button>
                    </div>

                    {hasAddons && (
                      <span className="addons-summary-tag">
                        +₱{calcItemAddonsPrice(ci) * ci.qty} add-ons
                      </span>
                    )}
                  </div>

                  {/* Add-on Chips */}
                  <div className="cart-item-addons">
                    <div className="addons-label">Add-ons:</div>
                    <div className="addons-chips-list">
                      {ADDONS.map((a) => {
                        const isSelected = !!ci.addons[a.id]
                        return (
                          <button
                            type="button"
                            key={a.id}
                            className={`addon-chip ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => onToggleAddon(idx, a.id)}
                            title={`Toggle ${a.name} (+₱${a.price})`}
                          >
                            <span className="addon-chip-name">{a.name}</span>
                            <span className="addon-chip-price">+₱{a.price}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Footer / Checkout Panel */}
      {items.length > 0 && (
        <div className="cart-footer">
          <div className="checkout-config">
            {/* Customer & Staff Row */}
            <div className="config-grid-duo">
              <div className="config-row">
                <label className="config-label">Customer / Callout</label>
                <div className="input-with-icon">
                  <UsersIcon size={14} className="input-inner-icon" />
                  <input
                    type="text"
                    className="staff-input-field customer-field"
                    placeholder="Customer Name / Table"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="config-row">
                <label className="config-label">Barista / Staff</label>
                <input
                  type="text"
                  className="staff-input-field"
                  placeholder="Staff Name"
                  value={staff}
                  onChange={(e) => onChangeStaff(e.target.value)}
                />
              </div>
            </div>

            {/* Discount / Senior / PWD Row */}
            <div className="config-row">
              <label className="config-label">Discounts & Privileges</label>
              <div className="discount-pills">
                <button
                  type="button"
                  className={`discount-pill ${discountType === 'none' ? 'is-active' : ''}`}
                  onClick={() => setDiscountType('none')}
                >
                  None
                </button>
                <button
                  type="button"
                  className={`discount-pill ${discountType === 'senior' ? 'is-active' : ''}`}
                  onClick={() => setDiscountType('senior')}
                >
                  Senior (10%)
                </button>
                <button
                  type="button"
                  className={`discount-pill ${discountType === 'pwd' ? 'is-active' : ''}`}
                  onClick={() => setDiscountType('pwd')}
                >
                  PWD (10%)
                </button>
                <button
                  type="button"
                  className={`discount-pill ${discountType === 'loyalty_10' ? 'is-active' : ''}`}
                  onClick={() => setDiscountType('loyalty_10')}
                >
                  Loyalty (10%)
                </button>
                <button
                  type="button"
                  className={`discount-pill ${discountType === 'loyalty_50' ? 'is-active' : ''}`}
                  onClick={() => setDiscountType('loyalty_50')}
                >
                  Loyalty (50%)
                </button>
                <button
                  type="button"
                  className={`discount-pill ${discountType === 'custom' ? 'is-active' : ''}`}
                  onClick={() => setDiscountType('custom')}
                >
                  Custom
                </button>
              </div>

              {discountType === 'custom' && (
                <div className="custom-discount-wrap">
                  <span className="currency-prefix">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    className="custom-discount-input"
                    placeholder="Discount amount (₱)"
                    value={customDiscountAmt}
                    onChange={(e) => setCustomDiscountAmt(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="config-row">
              <label className="config-label">Payment Method</label>
              <div className="payment-type-pills">
                <button
                  type="button"
                  className={`payment-pill ${paymentType === 'cash' ? 'is-active is-cash' : ''}`}
                  onClick={() => onChangePaymentType('cash')}
                >
                  <DollarSignIcon size={15} />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  className={`payment-pill ${paymentType === 'gcash' ? 'is-active is-gcash' : ''}`}
                  onClick={() => onChangePaymentType('gcash')}
                >
                  <SmartphoneIcon size={15} />
                  <span>GCash</span>
                </button>
                <button
                  type="button"
                  className={`payment-pill ${paymentType === 'card' ? 'is-active is-card' : ''}`}
                  onClick={() => onChangePaymentType('card')}
                >
                  <CreditCardIcon size={15} />
                  <span>Card</span>
                </button>
              </div>
            </div>

            {/* Cash Calculator & Quick Tender */}
            {paymentType === 'cash' && (
              <div className="cash-calculator-card">
                <div className="tender-input-row">
                  <label className="tender-label">Cash Received</label>
                  <div className="tender-input-wrapper">
                    <span className="tender-currency">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="tender-input"
                      placeholder="0"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Tender Preset Buttons */}
                <div className="quick-tender-presets">
                  {quickTenderAmounts.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      className="preset-tender-btn"
                      onClick={() => setCashTendered(String(preset.amount))}
                    >
                      {preset.label}
                    </button>
                  ))}
                  {cashTendered && (
                    <button
                      type="button"
                      className="preset-tender-btn preset-clear"
                      onClick={() => setCashTendered('')}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Change Due Display */}
                {tenderedNum > 0 && (
                  <div className={`change-display ${changeDue >= 0 ? 'is-positive' : 'is-insufficient'}`}>
                    <span className="change-label">
                      {changeDue >= 0 ? 'Change (Sukli):' : 'Remaining Balance:'}
                    </span>
                    <span className="change-value">
                      ₱{Math.abs(changeDue).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pricing Totals Breakdown */}
          <div className="order-summary-box">
            <div className="summary-row">
              <span>Items Subtotal</span>
              <span>₱{subtotalBase.toLocaleString()}</span>
            </div>
            {subtotalAddons > 0 && (
              <div className="summary-row">
                <span>Add-ons</span>
                <span>₱{subtotalAddons.toLocaleString()}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="summary-row discount-row">
                <span>Discount ({discountType.toUpperCase()})</span>
                <span>-₱{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row grand-total-row">
              <span className="total-title">Total Due</span>
              <span className="total-amount">₱{finalTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="cart-actions-grid">
            <button
              type="button"
              className="btn-pos-primary"
              onClick={handleCompleteOrder}
              disabled={finalTotal <= 0 && items.length === 0 || isSubmitting}
            >
              <CheckCircleIcon size={18} />
              <span>{isSubmitting ? 'Recording...' : `Complete Sale • ₱${finalTotal.toLocaleString()}`}</span>
            </button>

            <div className="secondary-actions-row">
              <button
                type="button"
                className="btn-pos-secondary btn-print-receipt"
                onClick={handlePrint}
                disabled={finalTotal <= 0 && items.length === 0}
                title="Print thermal receipt"
              >
                <PrinterIcon size={16} />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                className={`btn-pos-secondary btn-printer-toggle ${isPrinterConnected ? 'is-connected' : ''}`}
                onClick={onConnectPrinter}
                title={isPrinterConnected ? 'Printer connected' : 'Connect thermal printer'}
              >
                <span className={`status-dot ${isPrinterConnected ? 'dot-online' : 'dot-offline'}`} />
                <span>{isPrinterConnected ? 'Printer Ready' : 'Connect Printer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
