import { useMemo, useState } from 'react'
import type { DrinkSize, MenuItem, MenuSection } from '../types/menu'
import {
  CoffeeIcon,
  CroissantIcon,
  EditIcon,
  FlameIcon,
  IceIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  TrashIcon,
  XIcon,
} from './Icons'

export type MenuProps = {
  sections: MenuSection[]
  onAdd: (item: MenuItem, size: DrinkSize) => void
  onUpdateItem: (sectionIndex: number, subcategoryIndex: number, itemIndex: number, nextItem: MenuItem) => void
  onAddItem: (sectionIndex: number, subcategoryIndex: number, item: MenuItem) => void
  onRemoveItem: (sectionIndex: number, subcategoryIndex: number, itemIndex: number) => void
  onResetMenu?: () => void
}

type DraftItem = {
  id: string
  name: string
  prices: Partial<Record<DrinkSize, string>>
}

const emptyDraft = (): DraftItem => ({ id: '', name: '', prices: {} })

export default function Menu({
  sections,
  onAdd,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
  onResetMenu,
}: MenuProps) {
  const [activeSection, setActiveSection] = useState(0)
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingMode, setEditingMode] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({})
  const [addingToSubcategory, setAddingToSubcategory] = useState<number | null>(null)

  const safeActiveSection = Math.min(activeSection, Math.max(0, sections.length - 1))
  const activeSectionData = sections[safeActiveSection]
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
        return Number.isFinite(parsed) && parsed > 0 ? [[size, parsed]] : []
      }),
    ) as Partial<Record<DrinkSize, number>>

    const nextItem: MenuItem = {
      id: draft.id.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      name,
      prices: parsedPrices,
    }

    onAddItem(safeActiveSection, subcategoryIndex, nextItem)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setAddingToSubcategory(null)
  }

  // Filter items based on search query and subcategory
  const isSearching = searchQuery.trim().length > 0

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = searchQuery.toLowerCase().trim()
    const results: Array<{
      item: MenuItem
      sectionName: string
      subcategoryName: string
      sectionIndex: number
      subcategoryIndex: number
      itemIndex: number
    }> = []

    sections.forEach((sec, sIdx) => {
      sec.subcategories.forEach((sub, subIdx) => {
        sub.items.forEach((it, iIdx) => {
          if (it.name.toLowerCase().includes(q) || it.id.toLowerCase().includes(q)) {
            results.push({
              item: it,
              sectionName: sec.name,
              subcategoryName: sub.name,
              sectionIndex: sIdx,
              subcategoryIndex: subIdx,
              itemIndex: iIdx,
            })
          }
        })
      })
    })

    return results
  }, [sections, searchQuery, isSearching])

  const getSectionIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('pastr')) return <CroissantIcon size={16} />
    if (n.includes('egg') || n.includes('creme')) return <SparklesIcon size={16} />
    return <CoffeeIcon size={16} />
  }

  return (
    <div className="menu-container">
      {/* Top Controls: Search Bar & Edit Mode Toggle */}
      <div className="menu-header">
        <div className="search-bar">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search drinks, espresso, matcha, pastries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        <div className="menu-controls">
          <button
            type="button"
            className={`btn-toggle-edit ${editingMode ? 'is-active' : ''}`}
            onClick={() => setEditingMode((prev) => !prev)}
            title="Toggle Menu Editor"
          >
            <EditIcon size={15} />
            <span>{editingMode ? 'Exit Edit' : 'Edit Menu'}</span>
          </button>
          {editingMode && onResetMenu && (
            <button
              type="button"
              className="btn-reset-menu"
              onClick={() => {
                if (window.confirm('Reset menu to factory default items and prices?')) {
                  onResetMenu()
                }
              }}
            >
              Reset Defaults
            </button>
          )}
        </div>
      </div>

      {/* When searching, show unified search results */}
      {isSearching ? (
        <div className="search-results-section">
          <div className="section-title-bar">
            <h3>Search Results</h3>
            <span className="badge-count">{searchResults.length} items found</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="empty-state">
              <CoffeeIcon size={36} className="empty-icon" />
              <p>No menu items matching "{searchQuery}"</p>
              <button className="btn-text" onClick={() => setSearchQuery('')}>Clear search</button>
            </div>
          ) : (
            <div className="menu-grid">
              {searchResults.map((res) => (
                <MenuCard
                  key={`${res.sectionIndex}-${res.subcategoryIndex}-${res.item.id}`}
                  item={res.item}
                  categoryContext={`${res.sectionName} • ${res.subcategoryName}`}
                  editingMode={editingMode}
                  onAdd={onAdd}
                  onRemove={() => onRemoveItem(res.sectionIndex, res.subcategoryIndex, res.itemIndex)}
                  onChange={(nextItem) => onUpdateItem(res.sectionIndex, res.subcategoryIndex, res.itemIndex, nextItem)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Main Category Tabs */}
          <div className="category-tabs-wrapper">
            <div className="category-tabs">
              {sections.map((section, index) => {
                const totalItems = section.subcategories.reduce((acc, sub) => acc + sub.items.length, 0)
                const isActive = index === safeActiveSection
                return (
                  <button
                    key={section.name}
                    className={`category-tab ${isActive ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveSection(index)
                      setActiveSubcategory('all')
                    }}
                  >
                    <span className="tab-icon">{getSectionIcon(section.name)}</span>
                    <span className="tab-label">{section.name}</span>
                    <span className="tab-badge">{totalItems}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subcategory Pills */}
          {activeSectionData && activeSectionData.subcategories.length > 1 && (
            <div className="subcategory-pills">
              <button
                className={`sub-pill ${activeSubcategory === 'all' ? 'is-active' : ''}`}
                onClick={() => setActiveSubcategory('all')}
              >
                All
              </button>
              {activeSectionData.subcategories.map((sub) => (
                <button
                  key={sub.name}
                  className={`sub-pill ${activeSubcategory === sub.name ? 'is-active' : ''}`}
                  onClick={() => setActiveSubcategory(sub.name)}
                >
                  {sub.name} ({sub.items.length})
                </button>
              ))}
            </div>
          )}

          {/* Menu Sections & Item Grid */}
          <div className="menu-content-area">
            {activeSectionData?.subcategories
              .filter((sub) => activeSubcategory === 'all' || activeSubcategory === sub.name)
              .map((subcategory) => {
                const actualSubIdx = activeSectionData.subcategories.findIndex((s) => s.name === subcategory.name)
                const draftKey = getDraftKey(actualSubIdx)
                const draft = drafts[draftKey] ?? emptyDraft()
                const isAddingHere = addingToSubcategory === actualSubIdx

                return (
                  <div key={subcategory.name} className="subcategory-block">
                    <div className="subcategory-header">
                      <div className="sub-title-group">
                        <h3>{subcategory.name}</h3>
                        <span className="sub-item-count">{subcategory.items.length} choices</span>
                      </div>

                      {editingMode && (
                        <button
                          type="button"
                          className="btn-add-pill"
                          onClick={() => setAddingToSubcategory(isAddingHere ? null : actualSubIdx)}
                        >
                          <PlusIcon size={14} />
                          <span>{isAddingHere ? 'Cancel' : 'Add Item'}</span>
                        </button>
                      )}
                    </div>

                    {/* Quick Add Form in Edit Mode */}
                    {editingMode && isAddingHere && (
                      <div className="quick-add-form">
                        <div className="add-form-title">
                          <PlusIcon size={16} />
                          <strong>Add New Item to {subcategory.name}</strong>
                        </div>
                        <div className="add-form-row">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Item name (e.g. Spanish Caramel)"
                            value={draft.name}
                            onChange={(e) => updateDraft(actualSubIdx, 'name', e.target.value)}
                            autoFocus
                          />
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Item ID (optional)"
                            value={draft.id}
                            onChange={(e) => updateDraft(actualSubIdx, 'id', e.target.value)}
                          />
                        </div>
                        <div className="add-form-row prices-row">
                          <div className="price-input-group">
                            <span className="price-label">Iced Price (₱)</span>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              className="form-input"
                              placeholder="e.g. 130"
                              value={draft.prices.iced ?? ''}
                              onChange={(e) => updateDraftPrice(actualSubIdx, 'iced', e.target.value)}
                            />
                          </div>
                          <div className="price-input-group">
                            <span className="price-label">Hot Price (₱)</span>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              className="form-input"
                              placeholder="e.g. 135"
                              value={draft.prices.hot ?? ''}
                              onChange={(e) => updateDraftPrice(actualSubIdx, 'hot', e.target.value)}
                            />
                          </div>
                          <div className="price-input-group">
                            <span className="price-label">Regular/Pastry (₱)</span>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              className="form-input"
                              placeholder="e.g. 150"
                              value={draft.prices.regular ?? ''}
                              onChange={(e) => updateDraftPrice(actualSubIdx, 'regular', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="add-form-actions">
                          <button
                            type="button"
                            className="btn-primary-sm"
                            onClick={() => submitNewItem(actualSubIdx)}
                            disabled={!draft.name.trim()}
                          >
                            Save Item
                          </button>
                          <button
                            type="button"
                            className="btn-secondary-sm"
                            onClick={() => setAddingToSubcategory(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Drink & Food Items Grid */}
                    <div className="menu-grid">
                      {subcategory.items.map((item, itemIndex) => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          editingMode={editingMode}
                          onAdd={onAdd}
                          onRemove={() => onRemoveItem(safeActiveSection, actualSubIdx, itemIndex)}
                          onChange={(nextItem) => onUpdateItem(safeActiveSection, actualSubIdx, itemIndex, nextItem)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </>
      )}
    </div>
  )
}

function MenuCard({
  item,
  categoryContext,
  onAdd,
  editingMode,
  onRemove,
  onChange,
}: {
  item: MenuItem
  categoryContext?: string
  onAdd: (item: MenuItem, size: DrinkSize) => void
  editingMode: boolean
  onRemove: () => void
  onChange: (nextItem: MenuItem) => void
}) {
  const hasHot = item.prices.hot != null
  const hasIced = item.prices.iced != null
  const hasRegular = item.prices.regular != null

  const renderPriceInput = (size: DrinkSize, label: string, value?: number) => (
    <div className="card-price-edit-item">
      <span className="size-hint">{label}:</span>
      <input
        type="number"
        min="0"
        step="1"
        className="price-input-field"
        value={value ?? ''}
        placeholder="—"
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
    </div>
  )

  return (
    <div className={`menu-card ${editingMode ? 'in-edit-mode' : ''}`}>
      <div className="menu-card-top">
        <div className="card-title-wrap">
          {editingMode ? (
            <input
              type="text"
              className="card-name-input"
              value={item.name}
              onChange={(e) => onChange({ ...item, name: e.target.value })}
            />
          ) : (
            <h4 className="card-item-name">{item.name}</h4>
          )}
          {categoryContext && <span className="card-category-hint">{categoryContext}</span>}
        </div>

        {item.badge && <span className="item-badge">{item.badge}</span>}

        {editingMode && (
          <button
            type="button"
            className="card-btn-delete"
            title="Delete this item"
            onClick={() => {
              if (window.confirm(`Delete "${item.name}" from menu?`)) {
                onRemove()
              }
            }}
          >
            <TrashIcon size={14} />
          </button>
        )}
      </div>

      <div className="menu-card-prices">
        {editingMode ? (
          <div className="edit-prices-row">
            {renderPriceInput('iced', 'Iced', item.prices.iced)}
            {renderPriceInput('hot', 'Hot', item.prices.hot)}
            {renderPriceInput('regular', 'Reg', item.prices.regular)}
          </div>
        ) : (
          <div className="order-price-buttons">
            {hasIced && (
              <button
                type="button"
                className="price-pill-btn btn-iced"
                onClick={() => onAdd(item, 'iced')}
                title={`Order Iced ${item.name}`}
              >
                <IceIcon size={14} className="pill-icon" />
                <span className="pill-size">Iced</span>
                <span className="pill-price">₱{item.prices.iced}</span>
              </button>
            )}

            {hasHot && (
              <button
                type="button"
                className="price-pill-btn btn-hot"
                onClick={() => onAdd(item, 'hot')}
                title={`Order Hot ${item.name}`}
              >
                <FlameIcon size={14} className="pill-icon" />
                <span className="pill-size">Hot</span>
                <span className="pill-price">₱{item.prices.hot}</span>
              </button>
            )}

            {hasRegular && (
              <button
                type="button"
                className="price-pill-btn btn-regular"
                onClick={() => onAdd(item, 'regular')}
                title={`Order ${item.name}`}
              >
                <CroissantIcon size={14} className="pill-icon" />
                <span className="pill-size">Order</span>
                <span className="pill-price">₱{item.prices.regular}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
