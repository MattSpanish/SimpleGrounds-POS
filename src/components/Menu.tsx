import { useEffect, useMemo, useState } from 'react'
import type { DrinkSize, MenuItem, MenuSection } from '../types/menu'

export type MenuProps = {
  sections: MenuSection[]
  onAdd: (item: MenuItem, size: DrinkSize) => void
  onUpdateItem: (sectionIndex: number, subcategoryIndex: number, itemIndex: number, nextItem: MenuItem) => void
  onAddItem: (sectionIndex: number, subcategoryIndex: number, item: MenuItem) => void
  onRemoveItem: (sectionIndex: number, subcategoryIndex: number, itemIndex: number) => void
}

type DraftItem = {
  id: string
  name: string
  prices: Partial<Record<DrinkSize, string>>
}

const emptyDraft = (): DraftItem => ({ id: '', name: '', prices: {} })

export default function Menu({ sections, onAdd, onUpdateItem, onAddItem, onRemoveItem }: MenuProps) {
  const [activeSection, setActiveSection] = useState(0)
  const [editingMode, setEditingMode] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({})

  useEffect(() => {
    setActiveSection((current) => Math.min(current, Math.max(0, sections.length - 1)))
  }, [sections.length])

  const activeSectionData = sections[activeSection]
  const sectionKey = useMemo(() => activeSectionData?.name ?? 'menu', [activeSectionData?.name])

  const getDraftKey = (subcategoryIndex: number) => `${sectionKey}:${subcategoryIndex}`

  const updateDraft = (subcategoryIndex: number, field: 'id' | 'name', value: string) => {
    const key = getDraftKey(subcategoryIndex)
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? emptyDraft()),
        [field]: value,
      },
    }))
  }

  const updateDraftPrice = (subcategoryIndex: number, size: DrinkSize, value: string) => {
    const key = getDraftKey(subcategoryIndex)
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? emptyDraft()),
        prices: {
          ...(prev[key]?.prices ?? {}),
          [size]: value,
        },
      },
    }))
  }

  const submitNewItem = (subcategoryIndex: number) => {
    const key = getDraftKey(subcategoryIndex)
    const draft = drafts[key] ?? emptyDraft()
    const name = draft.name.trim()
    if (!name) return

    const parsedPrices = Object.fromEntries(
      Object.entries(draft.prices).flatMap(([size, price]) => {
        const parsed = Number(price)
        return Number.isFinite(parsed) ? [[size, parsed]] : []
      }),
    ) as Partial<Record<DrinkSize, number>>

    const nextItem: MenuItem = {
      id: draft.id.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      name,
      prices: parsedPrices,
    }

    onAddItem(activeSection, subcategoryIndex, nextItem)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return (
    <div className="menu">
      <div className="menu__toolbar">
        <button className="secondary" onClick={() => setEditingMode((prev) => !prev)}>
          {editingMode ? 'Done Editing' : 'Edit Menu'}
        </button>
      </div>

      <div className="menu__tabs">
        {sections.map((section, index) => (
          <button
            key={section.name}
            className={index === activeSection ? 'active' : ''}
            onClick={() => setActiveSection(index)}
          >
            {section.name}
          </button>
        ))}
      </div>

      <div className="menu__content">
        {activeSectionData?.subcategories.map((subcategory, subcategoryIndex) => {
          const draftKey = getDraftKey(subcategoryIndex)
          const draft = drafts[draftKey] ?? emptyDraft()

          return (
            <div key={subcategory.name} className="menu__subcategory">
              <div className="menu__subcategory-header">
                <h3>{subcategory.name}</h3>
                {editingMode && <span className="muted">Tap a price to edit it</span>}
              </div>

              <div className="menu__grid">
                {subcategory.items.map((item, itemIndex) => (
                  <MenuCard
                    key={item.id}
                    item={item}
                    editingMode={editingMode}
                    onAdd={onAdd}
                    onRemove={() => onRemoveItem(activeSection, subcategoryIndex, itemIndex)}
                    onChange={(nextItem) => onUpdateItem(activeSection, subcategoryIndex, itemIndex, nextItem)}
                  />
                ))}
              </div>

              {editingMode && (
                <div className="menu-editor">
                  <h4>Add Item</h4>
                  <div className="menu-editor__row">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={draft.name}
                      onChange={(e) => updateDraft(subcategoryIndex, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Optional item id"
                      value={draft.id}
                      onChange={(e) => updateDraft(subcategoryIndex, 'id', e.target.value)}
                    />
                  </div>
                  <div className="menu-editor__row menu-editor__row--prices">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Iced price"
                      value={draft.prices.iced ?? ''}
                      onChange={(e) => updateDraftPrice(subcategoryIndex, 'iced', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Hot price"
                      value={draft.prices.hot ?? ''}
                      onChange={(e) => updateDraftPrice(subcategoryIndex, 'hot', e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Regular price"
                      value={draft.prices.regular ?? ''}
                      onChange={(e) => updateDraftPrice(subcategoryIndex, 'regular', e.target.value)}
                    />
                  </div>
                  <button className="btn btn-add-item" onClick={() => submitNewItem(subcategoryIndex)}>
                    Add Item
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MenuCard({
  item,
  onAdd,
  editingMode,
  onRemove,
  onChange,
}: {
  item: MenuItem
  onAdd: (item: MenuItem, size: DrinkSize) => void
  editingMode: boolean
  onRemove: () => void
  onChange: (nextItem: MenuItem) => void
}) {
  const hasHot = item.prices.hot != null
  const hasIced = item.prices.iced != null
  const hasRegular = item.prices.regular != null

  const renderPriceInput = (size: DrinkSize, value?: number) => (
    <input
      type="number"
      min="0"
      step="1"
      className="price price-input"
      value={value ?? ''}
      onChange={(e) => {
        const nextValue = e.target.value === '' ? undefined : Number(e.target.value)
        onChange({
          ...item,
          prices: {
            ...item.prices,
            [size]: Number.isFinite(nextValue as number) ? nextValue : undefined,
          },
        })
      }}
    />
  )

  return (
    <div className="menu-card">
      <div className="menu-card__title">
        {editingMode ? (
          <>
            <input
              type="text"
              className="menu-card__input"
              value={item.name}
              onChange={(e) => onChange({ ...item, name: e.target.value })}
            />
            <button type="button" className="link menu-card__remove" onClick={onRemove}>
              remove
            </button>
          </>
        ) : (
          <span>{item.name}</span>
        )}
        {item.badge && <small className="badge">{item.badge}</small>}
      </div>

      <div className="menu-card__prices">
        {hasIced && (editingMode ? renderPriceInput('iced', item.prices.iced) : <button className="price" onClick={() => onAdd(item, 'iced')}>Iced • P{item.prices.iced}</button>)}
        {hasHot && (editingMode ? renderPriceInput('hot', item.prices.hot) : <button className="price" onClick={() => onAdd(item, 'hot')}>Hot • P{item.prices.hot}</button>)}
        {hasRegular && (editingMode ? renderPriceInput('regular', item.prices.regular) : <button className="price" onClick={() => onAdd(item, 'regular')}>P{item.prices.regular}</button>)}
      </div>
    </div>
  )
}
