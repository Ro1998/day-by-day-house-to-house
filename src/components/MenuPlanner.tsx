'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/components/DataProvider'
import { Menu, MenuItem } from '@/types'
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import { format, startOfWeek } from 'date-fns'

const parseNames = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export function MenuPlanner() {
  const { menus, updateMenu, currentUser } = useData()
  const [menu, setMenu] = useState<Menu | null>(null)
  const canManageMenu = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'

  useEffect(() => {
    const tuesday = startOfWeek(new Date(), { weekStartsOn: 2 }) // Tuesday
    const weekStr = format(tuesday, 'yyyy-MM-dd')
    const existing = menus.find(m => m.week === weekStr)
    if (existing) {
      setMenu(existing)
    } else {
      const days = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday']
      const items: MenuItem[] = days.map(day => ({
        day,
        lunch: '',
        dinner: '',
        lunchCooks: [],
        dinnerCooks: [],
      }))
      setMenu({
        week: weekStr,
        items,
        purchasers: [],
      })
    }
  }, [menus])

  const updateMenuItem = (index: number, field: keyof MenuItem, value: any) => {
    if (!menu) return
    const newItems = [...menu.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setMenu({ ...menu, items: newItems })
  }

  const saveMenu = () => {
    if (menu) updateMenu(menu)
  }

  const exportPNG = async () => {
    const element = document.getElementById('menu-table')
    if (element) {
      const canvas = await html2canvas(element)
      const link = document.createElement('a')
      link.download = 'menu.png'
      link.href = canvas.toDataURL()
      link.click()
    }
  }

  if (!menu) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      {!currentUser && (
        <div className="app-panel rounded-2xl px-4 py-3 text-sm">
          Log in first to save a weekly menu.
        </div>
      )}
      {currentUser && !canManageMenu && (
        <div className="app-panel rounded-2xl px-4 py-3 text-sm">
          Only the Coordinator (CO) or Admin can update the weekly menu.
        </div>
      )}
      <div className="app-panel rounded-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Weekly Menu Planner</h2>
          <div className="flex space-x-2">
            <button
              onClick={saveMenu}
              disabled={!canManageMenu}
              className="app-button app-button-primary"
            >
              Save Menu
            </button>
            <button
              onClick={exportPNG}
              className="app-button app-button-secondary flex items-center space-x-1"
            >
              <Download size={16} />
              <span>Export PNG</span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Vegetable Purchasers (2 people)</label>
          <input
            type="text"
            value={menu.purchasers.join(', ')}
            onChange={(e) => setMenu({ ...menu, purchasers: parseNames(e.target.value) })}
            className="app-input"
            placeholder="Enter purchaser names separated by commas"
            disabled={!canManageMenu}
          />
        </div>

        <div id="menu-table" className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-[var(--border)]">
            <thead>
              <tr className="bg-[var(--surface-soft)]">
                <th className="border border-[var(--border)] p-2">Day</th>
                <th className="border border-[var(--border)] p-2">Lunch</th>
                <th className="border border-[var(--border)] p-2">Lunch Cooks (2)</th>
                <th className="border border-[var(--border)] p-2">Dinner</th>
                <th className="border border-[var(--border)] p-2">Dinner Cooks (2)</th>
              </tr>
            </thead>
            <tbody>
              {menu.items.map((item, index) => (
                <tr key={item.day} className="border-b border-[var(--border)]">
                  <td className="border border-[var(--border)] p-2 font-medium">
                    {item.day}
                  </td>
                  <td className="border border-[var(--border)] p-2">
                    <input
                      type="text"
                      value={item.lunch}
                      onChange={(e) => updateMenuItem(index, 'lunch', e.target.value)}
                      className="app-input"
                      placeholder="Lunch menu"
                      disabled={!canManageMenu}
                    />
                  </td>
                  <td className="border border-[var(--border)] p-2">
                    <input
                      type="text"
                      value={item.lunchCooks.join(', ')}
                      onChange={(e) => updateMenuItem(index, 'lunchCooks', parseNames(e.target.value))}
                      className="app-input"
                      placeholder="Enter lunch cook names"
                      disabled={!canManageMenu}
                    />
                  </td>
                  <td className="border border-[var(--border)] p-2">
                    <input
                      type="text"
                      value={item.dinner}
                      onChange={(e) => updateMenuItem(index, 'dinner', e.target.value)}
                      className="app-input"
                      placeholder="Dinner menu"
                      disabled={!canManageMenu}
                    />
                  </td>
                  <td className="border border-[var(--border)] p-2">
                    <input
                      type="text"
                      value={item.dinnerCooks.join(', ')}
                      onChange={(e) => updateMenuItem(index, 'dinnerCooks', parseNames(e.target.value))}
                      className="app-input"
                      placeholder="Enter dinner cook names"
                      disabled={!canManageMenu}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
