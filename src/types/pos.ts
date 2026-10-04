import type { DrinkSize } from './menu'

export type SaleItem = {
  id: string
  name: string
  size: DrinkSize
  qty: number
  addons?: Record<string, boolean>
  itemPrice?: number
}

export type PaymentType = 'cash' | 'gcash' | 'card'
export type Shift = '5pm-2am' | 'morning' | 'afternoon' | 'evening' | 'night'
export type DiscountType = 'none' | 'senior' | 'pwd' | 'loyalty_10' | 'loyalty_50' | 'custom'

export type Sale = {
  id?: number
  orderNumber?: number
  amount: number
  subtotal?: number
  discount?: number
  discountType?: DiscountType
  customerName?: string
  itemsCount: number
  items?: SaleItem[]
  paymentType?: PaymentType
  staff?: string
  shift?: Shift
  timestamp: Date
}

export type Expense = {
  id?: number
  amount: number
  note?: string
  category?: string
  timestamp: Date
}
