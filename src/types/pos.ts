import type { DrinkSize } from './menu'

export type SaleItem = {
  id: string
  name: string
  size: DrinkSize
  qty: number
}

export type PaymentType = 'cash' | 'gcash' | 'card'
export type Shift = 'morning' | 'afternoon' | 'evening' | 'night'

export type Sale = {
  id?: number
  amount: number
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
  timestamp: Date
}
