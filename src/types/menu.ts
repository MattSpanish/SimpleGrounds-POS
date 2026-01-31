export type DrinkSize = 'iced' | 'hot'

export type MenuItem = {
  id: string
  name: string
  prices: Partial<Record<DrinkSize, number>>
  badge?: string // e.g., "signature", "double shot"
}

export type MenuSubcategory = {
  name: string
  items: MenuItem[]
}

export type MenuSection = {
  name: string // e.g., Classic Craft Drinks
  subcategories: MenuSubcategory[]
}

export type AddOn = {
  id: 'oatside_oat_milk' | 'espresso_shot' | 'biscoff_crumbs'
  name: string
  price: number
}
