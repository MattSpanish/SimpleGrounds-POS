import { useState } from 'react'
import { MENU_SECTIONS } from '../data/menu'
import type { DrinkSize, MenuItem, MenuSection } from '../types/menu'

export type MenuProps = {
  onAdd: (item: MenuItem, size: DrinkSize) => void
}

export default function Menu({ onAdd }: MenuProps) {
  const [activeSection, setActiveSection] = useState(0)
  const sections: MenuSection[] = MENU_SECTIONS

  return (
    <div className="menu">
      <div className="menu__tabs">
        {sections.map((s, idx) => (
          <button
            key={s.name}
            className={idx === activeSection ? 'active' : ''}
            onClick={() => setActiveSection(idx)}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="menu__content">
        {sections[activeSection].subcategories.map((sub) => (
          <div key={sub.name} className="menu__subcategory">
            <h3>{sub.name}</h3>
            <div className="menu__grid">
              {sub.items.map((item) => (
                <MenuCard key={item.id} item={item} onAdd={onAdd} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MenuCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem, size: DrinkSize) => void }) {
  const hasHot = item.prices.hot != null
  const hasIced = item.prices.iced != null

  return (
    <div className="menu-card">
      <div className="menu-card__title">
        <span>{item.name}</span>
        {item.badge && <small className="badge">{item.badge}</small>}
      </div>
      <div className="menu-card__prices">
        {hasIced && (
          <button className="price" onClick={() => onAdd(item, 'iced')}>Iced • P{item.prices.iced}</button>
        )}
        {hasHot && (
          <button className="price" onClick={() => onAdd(item, 'hot')}>Hot • P{item.prices.hot}</button>
        )}
      </div>
    </div>
  )
}
