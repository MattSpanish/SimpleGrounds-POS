import type { MenuSection } from '../types/menu'

// Simplified subset of the menu derived from the reference image
export const MENU_SECTIONS: MenuSection[] = [
  {
    name: 'Classic Craft Drinks',
    subcategories: [
      {
        name: 'Espresso Base',
        items: [
          { id: 'americano', name: 'Americano', prices: { iced: 70, hot: 80 } },
          { id: 'flat-white', name: 'Flat White', prices: { iced: 105, hot: 115 } },
          { id: 'spanish-latte', name: 'Spanish Latte', prices: { iced: 115, hot: 125 } },
          { id: 'cappuccino', name: 'Cappuccino', prices: { iced: 105, hot: 115 } },
          { id: 'dark-mocha', name: 'Dark Mocha', prices: { iced: 140, hot: 150 } },
          { id: 'white-choco-mocha', name: 'White Chocolate Mocha', prices: { iced: 135, hot: 145 } },
          { id: 'roasted-almond', name: 'Roasted Almond', prices: { iced: 130, hot: 140 } },
          { id: 'honey-americano', name: 'Honey Americano', prices: { iced: 85, hot: 95 } },
          { id: 'caramel-latte', name: 'Caramel Latte', prices: { iced: 125, hot: 135 } },
          { id: 'hazelnut-latte', name: 'Hazelnut Latte', prices: { iced: 120, hot: 130 } },
        ],
      },
      {
        name: 'Non-Coffee',
        items: [
          { id: 'matcha-latte', name: 'Matcha Latte', prices: { iced: 90, hot: 90 } },
          { id: 'honey-matcha', name: 'Honey Matcha', prices: { iced: 99, hot: 110 } },
          { id: 'dark-milo', name: 'Dark Milo', prices: { iced: 105, hot: 115 } },
          { id: 'choco-mallows', name: 'Choco Mallows', prices: { iced: 99, hot: 110 } },
          { id: 'milky-strawberry', name: 'Milky Strawberry', prices: { iced: 85, hot: 95 } },
          { id: 'ube-milk', name: 'Ube Milk', prices: { iced: 105, hot: 115 } },
        ],
      },
    ],
  },
  {
    name: 'Signature Craft Drinks',
    subcategories: [
      {
        name: 'Espresso Base',
        items: [
          { id: 'espresso', name: 'Espresso (Double Shot)', prices: { iced: 0, hot: 65 }, badge: 'double' },
          { id: 'vietnamese-latte', name: 'Vietnamese Latte', prices: { iced: 120, hot: 130 } },
          { id: 'dalgona-latte', name: 'Dalgona Latte', prices: { iced: 140, hot: 150 } },
          { id: 'creamy-cappuccino', name: 'Creamy Cappuccino', prices: { iced: 130, hot: 140 } },
          { id: 'smores-latte', name: "S'mores Latte", prices: { iced: 170, hot: 180 } },
          { id: 'dirty-ube', name: 'Dirty Ube', prices: { iced: 160, hot: 170 } },
          { id: 'dirty-matcha', name: 'Dirty Matcha', prices: { iced: 145, hot: 155 } },
          { id: 'biscoff-latte', name: 'Biscoff Latte', prices: { iced: 175, hot: 185 } },
          { id: 'americano-sweet-foam', name: 'Americano Sweet Foam', prices: { iced: 85, hot: 95 } },
          { id: 'barista-blend', name: 'Barista Blend', prices: { iced: 120, hot: 130 } },
          { id: 'caramel-macchiato', name: 'Caramel Macchiato', prices: { iced: 140, hot: 150 } },
        ],
      },
      {
        name: 'Non-Coffee',
        items: [
          { id: 'double-matcha', name: 'Double Matcha', prices: { iced: 110, hot: 120 } },
          { id: 'dino-milo', name: 'Dino Milo', prices: { iced: 99, hot: 110 } },
          { id: 'biscoff-milk', name: 'Biscoff Milk', prices: { iced: 135, hot: 145 } },
          { id: 'biscoff-matcha', name: 'Biscoff Matcha', prices: { iced: 155, hot: 165 } },
          { id: 'strawberry-matcha', name: 'Strawberry Matcha', prices: { iced: 125, hot: 135 } },
          { id: 'ube-latte', name: 'Ube Latte', prices: { iced: 125, hot: 135 } },
          { id: 'sea-salt-matcha', name: 'Sea Salt Matcha', prices: { iced: 115, hot: 125 } },
        ],
      },
      {
        name: 'Sea Salt Cream',
        items: [
          { id: 'sea-salt-latte', name: 'Sea Salt Latte', prices: { iced: 130, hot: 140 } },
          { id: 'sea-salt-caramel', name: 'Sea Salt Caramel', prices: { iced: 145, hot: 155 } },
        ],
      },
    ],
  },
]
