import type { MenuSection } from '../types/menu'

// Simplified subset of the menu derived from the reference image
export const MENU_SECTIONS: MenuSection[] = [
  {
    name: 'Classic Craft Drinks',
    subcategories: [
      {
        name: 'Espresso Base',
        items: [
          { id: 'americano', name: 'Americano', prices: { iced: 80, hot: 70 } },
          { id: 'flat-white', name: 'Flat White', prices: { iced: 90, hot: 90 } },
          { id: 'spanish-latte', name: 'Spanish Latte', prices: { iced: 125, hot: 115 } },
          { id: 'cappuccino', name: 'Cappuccino', prices: { iced: 115, hot: 105 } },
          { id: 'dark-mocha', name: 'Dark Mocha', prices: { iced: 115, hot: 115 } },
          { id: 'white-choco-mocha', name: 'White Chocolate Mocha', prices: { iced: 145, hot: 135 } },
          { id: 'roasted-almond', name: 'Roasted Almond', prices: { iced: 145, hot: 135 } },
          { id: 'honey-americano', name: 'Honey Americano', prices: { iced: 95, hot: 85 } },
          { id: 'caramel-latte', name: 'Caramel Latte', prices: { iced: 135, hot: 125 } },
          { id: 'hazelnut-latte', name: 'Hazelnut Latte', prices: { iced: 130, hot: 120 } },
        ],
      },
      {
        name: 'Non-Coffee',
        items: [
          { id: 'matcha-latte', name: 'Matcha Latte', prices: { iced: 99, hot: 90 } },
          { id: 'honey-matcha', name: 'Honey Matcha', prices: { iced: 115, hot: 105 } },
          { id: 'dark-milo', name: 'Dark Milo', prices: { iced: 110, hot: 110 } },
          { id: 'choco-mallows', name: 'Choco Mallows', prices: { iced: 110, hot: 110 } },
          { id: 'milky-strawberry', name: 'Milky Strawberry', prices: { iced: 95, hot: 85 } },
          { id: 'ube-milk', name: 'Ube Milk', prices: { iced: 115, hot: 105 } },
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
          { id: 'espresso', name: 'Espresso (Double Shot)', prices: { iced: 65, hot: 65 }, badge: 'double' },
          { id: 'vietnamese-latte', name: 'Vietnamese Latte', prices: { iced: 130, hot: 120 } },
          { id: 'dalgona-latte', name: 'Dalgona Latte', prices: { iced: 150, hot: 140 } },
          { id: 'creamy-cappuccino', name: 'Creamy Cappuccino', prices: { iced: 140, hot: 130 } },
          { id: 'smores-latte', name: "S'mores Latte", prices: { iced: 180, hot: 170 } },
          { id: 'dirty-ube', name: 'Dirty Ube', prices: { iced: 170, hot: 160 } },
          { id: 'dirty-matcha', name: 'Dirty Matcha', prices: { iced: 185, hot: 175 } },
          { id: 'biscoff-latte', name: 'Biscoff Latte', prices: { iced: 185, hot: 175 } },
          { id: 'americano-sweet-foam', name: 'Americano Sweet Foam', prices: { iced: 85, hot: 85 } },
          { id: 'barista-blend', name: 'Barista Blend', prices: { iced: 125, hot: 115 } },
          { id: 'caramel-macchiato', name: 'Caramel Macchiato', prices: { iced: 150, hot: 140 } },
        ],
      },
      {
        name: 'Non-Coffee',
        items: [
          { id: 'double-matcha', name: 'Double Matcha', prices: { iced: 120, hot: 110 } },
          { id: 'dino-milo', name: 'Dino Milo', prices: { iced: 99, hot: 99 } },
          { id: 'biscoff-milk', name: 'Biscoff Milk', prices: { iced: 135, hot: 135 } },
          { id: 'biscoff-matcha', name: 'Biscoff Matcha', prices: { iced: 165, hot: 155 } },
          { id: 'strawberry-matcha', name: 'Strawberry Matcha', prices: { iced: 135, hot: 125 } },
          { id: 'ube-latte', name: 'Ube Latte', prices: { iced: 135, hot: 125 } },
          { id: 'sea-salt-matcha', name: 'Sea Salt Matcha', prices: { iced: 125, hot: 115 } },
        ],
      },
      {
        name: 'Sea Salt Cream',
        items: [
          { id: 'sea-salt-latte', name: 'Sea Salt Latte', prices: { iced: 140, hot: 130 } },
          { id: 'sea-salt-caramel', name: 'Sea Salt Caramel', prices: { iced: 155, hot: 145 } },
        ],
      },
    ],
  },
]
