import type { MenuSection } from '../types/menu'

// Simplified subset of the menu derived from the reference image
export const DEFAULT_MENU_SECTIONS: MenuSection[] = [
  {
    name: 'Classic Craft Drinks',
    subcategories: [
      {
        name: 'Espresso Base',
        items: [
          { id: 'americano', name: 'Americano', prices: { iced: 85, hot: 90 } },
          { id: 'flat-white', name: 'Flat White', prices: { iced: 125, hot: 130 } },
          { id: 'spanish-latte', name: 'Spanish Latte', prices: { iced: 135, hot: 140 } },
          { id: 'cappuccino', name: 'Cappuccino', prices: { iced: 120, hot: 125 } },
          { id: 'dark-mocha', name: 'Dark Mocha', prices: { iced: 145, hot: 150 } },
          { id: 'white-choco-mocha', name: 'White Chocolate Mocha', prices: { iced: 140, hot: 145 } },
          { id: 'roasted-almond', name: 'Roasted Almond', prices: { iced: 130, hot: 140 } },
          { id: 'honey-americano', name: 'Honey Americano', prices: { iced: 95, hot: 105 } },
          { id: 'caramel-latte', name: 'Caramel Latte', prices: { iced: 140, hot: 145 } },
          { id: 'hazelnut-latte', name: 'Hazelnut Latte', prices: { iced: 120, hot: 130 } },
        ],
      },
      {
        name: 'Non-Coffee',
        items: [
          { id: 'matcha-latte', name: 'Matcha Latte', prices: { iced: 110, hot: 115 } },
          { id: 'honey-matcha', name: 'Honey Matcha', prices: { iced: 115, hot: 120 } },
          { id: 'dark-milo', name: 'Dark Milo', prices: { iced: 125, hot: 130 } },
          { id: 'choco-mallows', name: 'Choco Mallows', prices: { iced: 135, hot: 140 } },
          { id: 'milky-strawberry', name: 'Milky Strawberry', prices: { iced: 125, hot: 130 } },
          { id: 'ube-milk', name: 'Ube Milk', prices: { iced: 125, hot: 130 } },
        ],
      },
      {
        name: 'Fruit Tea',
        items: [
          { id: 'strawberry-fruit-tea', name: 'Strawberry Fruit Tea', prices: { iced: 95 } },
          { id: 'blueberry-fruit-tea', name: 'Blueberry Fruit Tea', prices: { iced: 95 } },
          { id: 'green-apple-tea', name: 'Green Apple Tea', prices: { iced: 95 } },
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
          { id: 'espresso', name: 'Espresso (Double Shot)', prices: {  hot: 65 }, badge: 'double' },
          { id: 'vietnamese-latte', name: 'Vietnamese Latte', prices: { iced: 130, hot: 135 } },
          { id: 'dalgona-latte', name: 'Dalgona Latte', prices: { iced: 150, hot: 155 } },
          { id: 'creamy-cappuccino', name: 'Creamy Cappuccino', prices: { iced: 145, hot: 150 } },
          { id: 'smores-latte', name: "S'mores Latte", prices: { iced: 165, hot: 170 } },
          { id: 'dirty-ube', name: 'Dirty Ube', prices: { iced: 165, hot: 170 } },
          { id: 'dirty-matcha', name: 'Dirty Matcha', prices: { iced: 160, hot: 165 } },
          { id: 'biscoff-latte', name: 'Biscoff Latte', prices: { iced: 165, hot: 170 } },
          { id: 'americano-sweet-foam', name: 'Americano Sweet Foam', prices: { iced: 99, hot: 105 } },
          { id: 'barista-blend', name: 'Barista Blend', prices: { iced: 165, hot: 170 } },
          { id: 'caramel-macchiato', name: 'Caramel Macchiato', prices: { iced: 155, hot: 160 } },
        ],
      },
      {
        name: 'Non-Coffee',
        items: [
          { id: 'signature-chocolate', name: 'Signature Chocolate', prices: { iced: 145, hot: 150 } },
          { id: 'double-matcha', name: 'Double Matcha', prices: { iced: 150, hot: 155 } },
          { id: 'dino-milo', name: 'Dino Milo', prices: { iced: 130, hot: 135 } },
          { id: 'biscoff-milk', name: 'Biscoff Milk', prices: { iced: 160, hot: 165 } },
          { id: 'biscoff-matcha', name: 'Biscoff Matcha', prices: { iced: 170, hot: 175 } },
          { id: 'strawberry-matcha', name: 'Strawberry Matcha', prices: { iced: 140, hot: 145 } },
          { id: 'ube-latte', name: 'Ube Latte', prices: { iced: 135, hot: 140 } },
          { id: 'sea-salt-matcha', name: 'Sea Salt Matcha', prices: { iced: 140, hot: 145 } },
        ],
      },
      {
        name: 'Sea Salt Cream',
        items: [
          { id: 'sea-salt-latte', name: 'Sea Salt Latte', prices: { iced: 145, hot: 150 } },
          { id: 'sea-salt-caramel', name: 'Sea Salt Caramel', prices: { iced: 155, hot: 160 } },
        ],
      },
    ],
  },
    {
      name: 'Egg Creme Series',
      subcategories: [
        {
          name: 'Espresso Base',
          items: [
            { id: 'Macchiato Crème Caramel', name: 'Macchiato Crème Caramel', prices: { regular: 165 } },
            { id: 'Strawberry Matcha Brulee', name: 'Strawberry Matcha Brulee', prices: { regular: 150 } },
            { id: 'Ube Flan', name: 'Ube Flan', prices: { regular: 145 } },
            { id: 'Smores', name: "S'mores", prices: { regular: 175 } },
            { id: 'Vietnamese Egg Coffee', name: 'Vietnamese Egg Coffee', prices: { regular: 150 } },
            { id: 'Vietnamese Crèame Brulee', name: 'Vietnamese Crèame Brulee', prices: { regular: 155 } },
          ],
        },
      ],
    },
    {
      name: 'Pastries',
      subcategories: [
        {
          name: 'Pastries',
          items: [
            { id: 'MANGO-GRAHAM', name: 'Mango Graham', prices: { regular: 150 } },
            { id: 'BISCOFF CREAM', name: 'Biscoff Cream', prices: { regular: 150 } },
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
          { id: 'espresso', name: 'Espresso (Double Shot)', prices: {  hot: 65 }, badge: 'double' },
          { id: 'vietnamese-latte', name: 'Vietnamese Latte', prices: { iced: 130, hot: 135 } },
          { id: 'dalgona-latte', name: 'Dalgona Latte', prices: { iced: 150, hot: 155 } },
          { id: 'creamy-cappuccino', name: 'Creamy Cappuccino', prices: { iced: 145, hot: 150 } },
          { id: 'smores-latte', name: "S'mores Latte", prices: { iced: 165, hot: 170 } },
          { id: 'dirty-ube', name: 'Dirty Ube', prices: { iced: 165, hot: 170 } },
          { id: 'dirty-matcha', name: 'Dirty Matcha', prices: { iced: 160, hot: 165 } },
          { id: 'biscoff-latte', name: 'Biscoff Latte', prices: { iced: 165, hot: 170 } },
          { id: 'americano-sweet-foam', name: 'Americano Sweet Foam', prices: { iced: 99, hot: 105 } },
          { id: 'barista-blend', name: 'Barista Blend', prices: { iced: 165, hot: 170 } },
          { id: 'caramel-macchiato', name: 'Caramel Macchiato', prices: { iced: 155, hot: 160 } },
        ],
      },
      {
        name: 'Non-Coffee',
        items: [
          { id: 'signature-chocolate', name: 'Signature Chocolate', prices: { iced: 145, hot: 150 } },
          { id: 'double-matcha', name: 'Double Matcha', prices: { iced: 150, hot: 155 } },
          { id: 'dino-milo', name: 'Dino Milo', prices: { iced: 130, hot: 135 } },
          { id: 'biscoff-milk', name: 'Biscoff Milk', prices: { iced: 160, hot: 165 } },
          { id: 'biscoff-matcha', name: 'Biscoff Matcha', prices: { iced: 170, hot: 175 } },
          { id: 'strawberry-matcha', name: 'Strawberry Matcha', prices: { iced: 140, hot: 145 } },
          { id: 'ube-latte', name: 'Ube Latte', prices: { iced: 135, hot: 140 } },
          { id: 'sea-salt-matcha', name: 'Sea Salt Matcha', prices: { iced: 140, hot: 145 } },
        ],
      },
      {
        name: 'Sea Salt Cream',
        items: [
          { id: 'sea-salt-latte', name: 'Sea Salt Latte', prices: { iced: 145, hot: 150 } },
          { id: 'sea-salt-caramel', name: 'Sea Salt Caramel', prices: { iced: 155, hot: 160 } },
        ],
      },
    ],
  },
  {
      name: 'Pastries',
    subcategories: [
      {
        name: 'Pastries',
        items: [
          { id: 'MANGO-GRAHAM', name: 'Mango Graham', prices: { regular: 150 } },
          { id: 'BISCOFF CREAM', name: 'Biscoff Cream', prices: { regular: 150 } },
        ],
      },
    ]
  }
]
