import { db } from './db'
import type { Expense, Sale, SaleItem, PaymentType, Shift } from '../types/pos'

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const endOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
const startOfWeek = (d = new Date()) => {
  const date = new Date(d)
  const day = date.getDay() // 0=Sun, 1=Mon
  const diffToMonday = (day + 6) % 7
  date.setDate(date.getDate() - diffToMonday)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}
const endOfWeek = (d = new Date()) => {
  const start = startOfWeek(d)
  const date = new Date(start)
  date.setDate(date.getDate() + 6)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

function computeShift(ts: Date): Shift {
  const h = ts.getHours()
  if (h >= 6 && h <= 11) return 'morning'
  if (h >= 12 && h <= 17) return 'afternoon'
  if (h >= 18 && h <= 22) return 'evening'
  return 'night'
}

export async function addSale(amount: number, itemsCount: number, options?: {
  items?: SaleItem[]
  paymentType?: PaymentType
  staff?: string
  timestamp?: Date
}): Promise<number> {
  const ts = options?.timestamp ?? new Date()
  const sale: Sale = {
    amount,
    itemsCount,
    items: options?.items,
    paymentType: options?.paymentType,
    staff: options?.staff,
    shift: computeShift(ts),
    timestamp: ts,
  }
  return db.sales.add(sale)
}

export async function addExpense(amount: number, note?: string, timestamp: Date = new Date()): Promise<number> {
  const expense: Expense = { amount, note, timestamp }
  return db.expenses.add(expense)
}

export async function getTotalSalesToday(): Promise<number> {
  const from = startOfDay()
  const to = endOfDay()
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  return rows.reduce((s, r) => s + r.amount, 0)
}

export async function getTotalSalesThisMonth(): Promise<number> {
  const from = startOfMonth()
  const to = endOfMonth()
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  return rows.reduce((s, r) => s + r.amount, 0)
}

export async function getTotalSalesThisWeek(): Promise<number> {
  const from = startOfWeek()
  const to = endOfWeek()
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  return rows.reduce((s, r) => s + r.amount, 0)
}

export async function getTotalExpensesThisMonth(): Promise<number> {
  const from = startOfMonth()
  const to = endOfMonth()
  const rows = await db.expenses.where('timestamp').between(from, to, true, true).toArray()
  return rows.reduce((s, r) => s + r.amount, 0)
}

export async function getTotalExpensesToday(): Promise<number> {
  const from = startOfDay()
  const to = endOfDay()
  const rows = await db.expenses.where('timestamp').between(from, to, true, true).toArray()
  return rows.reduce((s, r) => s + r.amount, 0)
}

export async function getBestSellingItems(from: Date, to: Date): Promise<Array<{ id: string; name: string; qty: number }>> {
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  const tally = new Map<string, { id: string; name: string; qty: number }>()
  for (const s of rows) {
    if (!s.items) continue
    for (const it of s.items) {
      const k = it.id
      const prev = tally.get(k) ?? { id: it.id, name: it.name, qty: 0 }
      prev.qty += it.qty
      tally.set(k, prev)
    }
  }
  const list = Array.from(tally.values())
  list.sort((a, b) => b.qty - a.qty)
  return list
}

export async function getPaymentBreakdown(from: Date, to: Date): Promise<Record<PaymentType, number>> {
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  const out: Record<PaymentType, number> = { cash: 0, gcash: 0, card: 0 }
  for (const s of rows) {
    const p = s.paymentType ?? 'cash'
    out[p] += s.amount
  }
  return out
}

export async function getSalesPerStaff(from: Date, to: Date): Promise<Record<string, number>> {
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  const out: Record<string, number> = {}
  for (const s of rows) {
    const staff = s.staff ?? 'Unknown'
    out[staff] = (out[staff] ?? 0) + s.amount
  }
  return out
}

export async function getSalesPerShift(from: Date, to: Date): Promise<Record<Shift, number>> {
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  const out: Record<Shift, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const s of rows) {
    const sh = s.shift ?? computeShift(s.timestamp)
    out[sh] += s.amount
  }
  return out
}

export async function getHourlySales(from: Date, to: Date): Promise<number[]> {
  const rows = await db.sales.where('timestamp').between(from, to, true, true).toArray()
  const bins = Array(24).fill(0)
  for (const s of rows) {
    const h = new Date(s.timestamp).getHours()
    bins[h] += s.amount
  }
  return bins
}

export const dateUtils = { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek }

export async function resetSales(): Promise<void> {
  await db.sales.clear()
}

export async function resetExpenses(): Promise<void> {
  await db.expenses.clear()
}

export async function resetAllData(): Promise<void> {
  await db.transaction('rw', db.sales, db.expenses, async () => {
    await db.sales.clear()
    await db.expenses.clear()
  })
}
