'use client'

import { useMemo, useState } from 'react'
import { useData } from '@/components/DataProvider'
import type { InventoryItem } from '@/types'
import { formatCurrency } from '@/lib/format'
import { SupplyReportsBoard } from '@/components/SupplyReportsBoard'

const blankForm = {
  name: '',
  category: 'grocery' as 'grocery' | 'vegetable',
  quantity: '',
  unit: '',
  lowStockThreshold: '',
  lastPurchasedAt: '',
  lastPrice: '',
  note: '',
}

export function InventoryManager() {
  const { inventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useData()
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  const grouped = useMemo(() => ({
    grocery: inventoryItems.filter((item) => item.category === 'grocery'),
    vegetable: inventoryItems.filter((item) => item.category === 'vegetable'),
  }), [inventoryItems])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      category: form.category,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 0,
      lastPurchasedAt: form.lastPurchasedAt || null,
      lastPrice: form.lastPrice === '' ? null : parseFloat(form.lastPrice),
      note: form.note || null,
    }

    try {
      setIsSubmitting(true)
      if (editingId) {
        await updateInventoryItem({
          id: editingId,
          ...payload,
          user: '',
        } as InventoryItem)
      } else {
        await addInventoryItem(payload)
      }

      setEditingId(null)
      setForm(blankForm)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      lowStockThreshold: String(item.lowStockThreshold),
      lastPurchasedAt: item.lastPurchasedAt ?? '',
      lastPrice: item.lastPrice == null ? '' : String(item.lastPrice),
      note: item.note ?? '',
    })
  }

  const renderSection = (title: string, items: InventoryItem[]) => (
    <div className="app-panel rounded-3xl p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => {
          const lowStock = item.quantity <= item.lowStockThreshold
          return (
            <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition-all duration-200 ease-out">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold">{item.name}</h4>
                    {lowStock && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                        Finishing soon
                      </span>
                    )}
                  </div>
                  <p className="app-muted text-sm">
                    Available: {item.quantity} {item.unit} | Low stock at {item.lowStockThreshold} {item.unit}
                  </p>
                  <p className="app-muted text-sm">
                    Last bought: {item.lastPurchasedAt || 'Not recorded'} | Last rate: {item.lastPrice != null ? formatCurrency(item.lastPrice) : 'Not recorded'}
                  </p>
                  {item.note && <p className="app-muted mt-1 text-sm">{item.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEdit(item)} className="app-button app-button-ghost px-3 py-2">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setDeletingItemId(item.id)
                        await deleteInventoryItem(item.id)
                      } finally {
                        setDeletingItemId(null)
                      }
                    }}
                    disabled={deletingItemId === item.id}
                    className="app-button bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {deletingItemId === item.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {items.length === 0 && <p className="app-muted text-sm">No items added yet.</p>}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">{editingId ? 'Update Supply Item' : 'Add Supply Item'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="app-input" placeholder="Item name" required />
            <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as 'grocery' | 'vegetable' }))} className="app-input">
              <option value="grocery">Grocery list</option>
              <option value="vegetable">Vegetable list</option>
            </select>
            <input value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} className="app-input" type="number" step="0.01" placeholder="Available quantity" required />
            <input value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} className="app-input" placeholder="Unit, e.g. kg, pcs" required />
            <input value={form.lowStockThreshold} onChange={(e) => setForm((prev) => ({ ...prev, lowStockThreshold: e.target.value }))} className="app-input" type="number" step="0.01" placeholder="Low stock threshold" />
            <input value={form.lastPurchasedAt} onChange={(e) => setForm((prev) => ({ ...prev, lastPurchasedAt: e.target.value }))} className="app-input" type="date" />
            <input value={form.lastPrice} onChange={(e) => setForm((prev) => ({ ...prev, lastPrice: e.target.value }))} className="app-input" type="number" step="0.01" placeholder="Last price rate" />
            <input value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} className="app-input" placeholder="Storage note or reminder" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
            </button>
            {editingId && (
              <button type="button" disabled={isSubmitting} onClick={() => { setEditingId(null); setForm(blankForm) }} className="app-button app-button-ghost disabled:cursor-not-allowed disabled:opacity-70">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {renderSection('Grocery List', grouped.grocery)}
        {renderSection('Vegetable List', grouped.vegetable)}
      </div>

      <SupplyReportsBoard />
    </div>
  )
}
