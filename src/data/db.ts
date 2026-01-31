import Dexie, { type Table } from 'dexie'
import type { Sale, Expense } from '../types/pos'

class PosDatabase extends Dexie {
  sales!: Table<Sale, number>
  expenses!: Table<Expense, number>

  constructor() {
    super('SimpleGroundsPOS')
    this.version(1).stores({
      // timestamp indexed for range queries
      sales: '++id, timestamp',
      expenses: '++id, timestamp',
    })
  }
}

export const db = new PosDatabase()
