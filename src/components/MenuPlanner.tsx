'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/components/DataProvider'
import { Menu, MenuItem } from '@/types'
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import { format, addDays, startOfWeek } from 'date-fns'

export function MenuPlanner() {
  const { menus, updateMenu, users, currentUser } = useData()
  const [currentWeek, setCurrentWeek] = useState('')
  const [menu, setMenu] = useState<Menu | null>(null)

  useEffect(() => {
    const tuesday = startOfWeek(new Date(), { weekStartsOn: 2 }) // Tuesday
    const weekStr = format(tuesday, 'yyyy-MM-dd')
    setCurrentWeek(weekStr)
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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Weekly Menu Planner</h2>
          <div className="flex space-x-2">
            <button
              onClick={saveMenu}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Menu
            </button>
            <button
              onClick={exportPNG}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center space-x-1"
            >
              <Download size={16} />
              <span>Export PNG</span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Vegetable Purchasers (2 people)</label>
          <div className="flex flex-wrap gap-2">
            {users.map(user => (
              <label key={user.id} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={menu.purchasers.includes(user.name)}
                  onChange={(e) => {
                    const newPurchasers = e.target.checked
                      ? [...menu.purchasers, user.name]
                      : menu.purchasers.filter(p => p !== user.name)
                    setMenu({ ...menu, purchasers: newPurchasers })
                  }}
                />
                <span>{user.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div id="menu-table" className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 p-2">Day</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2">Lunch</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2">Lunch Cooks (2)</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2">Dinner</th>
                <th className="border border-gray-300 dark:border-gray-600 p-2">Dinner Cooks (2)</th>
              </tr>
            </thead>
            <tbody>
              {menu.items.map((item, index) => (
                <tr key={item.day} className="border-b border-gray-300 dark:border-gray-600">
                  <td className="border border-gray-300 dark:border-gray-600 p-2 font-medium">
                    {item.day}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">
                    <input
                      type="text"
                      value={item.lunch}
                      onChange={(e) => updateMenuItem(index, 'lunch', e.target.value)}
                      className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Lunch menu"
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">
                    <div className="flex flex-wrap gap-1">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center space-x-1 text-sm">
                          <input
                            type="checkbox"
                            checked={item.lunchCooks.includes(user.name)}
                            onChange={(e) => {
                              const cooks = e.target.checked
                                ? [...item.lunchCooks, user.name]
                                : item.lunchCooks.filter(c => c !== user.name)
                              updateMenuItem(index, 'lunchCooks', cooks)
                            }}
                          />
                          <span>{user.name}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">
                    <input
                      type="text"
                      value={item.dinner}
                      onChange={(e) => updateMenuItem(index, 'dinner', e.target.value)}
                      className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Dinner menu"
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 p-2">
                    <div className="flex flex-wrap gap-1">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center space-x-1 text-sm">
                          <input
                            type="checkbox"
                            checked={item.dinnerCooks.includes(user.name)}
                            onChange={(e) => {
                              const cooks = e.target.checked
                                ? [...item.dinnerCooks, user.name]
                                : item.dinnerCooks.filter(c => c !== user.name)
                              updateMenuItem(index, 'dinnerCooks', cooks)
                            }}
                          />
                          <span>{user.name}</span>
                        </label>
                      ))}
                    </div>
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