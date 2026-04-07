'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Menu, MenuItem } from '@/types'
import { FileImage } from 'lucide-react'
import html2canvas from 'html2canvas'
import { addWeeks, format, startOfWeek } from 'date-fns'

const parseNames = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export function MenuPlanner() {
  const { menus, updateMenu, currentUser, addNotification } = useData()
  const getWeekKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 2 }), 'yyyy-MM-dd')
  const parseWeekKey = (week: string) => new Date(`${week}T12:00:00`)
  const [selectedWeek, setSelectedWeek] = useState(() => getWeekKey(new Date()))
  const [menu, setMenu] = useState<Menu | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const canManageMenu = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'
  const lastSavedSnapshot = useRef('')

  const buildDefaultMenu = (week: string): Menu => {
    const days = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday']
    const items: MenuItem[] = days.map((day) => ({
      day,
      lunch: '',
      dinner: '',
      lunchCooks: [],
      dinnerCooks: [],
    }))

    return {
      week,
      items,
      purchasers: [],
    }
  }

  useEffect(() => {
    const existing = menus.find((entry) => entry.week === selectedWeek)
    const nextMenu = existing ? { ...existing } : buildDefaultMenu(selectedWeek)
    setMenu(nextMenu)
    lastSavedSnapshot.current = JSON.stringify(nextMenu)
    setSaveState(existing ? 'saved' : 'idle')
  }, [menus, selectedWeek])

  useEffect(() => {
    if (!menu || !canManageMenu) return

    const snapshot = JSON.stringify(menu)
    if (snapshot === lastSavedSnapshot.current) return

    const timeout = window.setTimeout(async () => {
      try {
        setSaveState('saving')
        await updateMenu(menu)
        lastSavedSnapshot.current = snapshot
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 900)

    return () => window.clearTimeout(timeout)
  }, [menu, canManageMenu, updateMenu])

  const savedWeeks = useMemo(
    () => [...menus].sort((a, b) => b.week.localeCompare(a.week)),
    [menus],
  )

  const updateMenuItem = (index: number, field: keyof MenuItem, value: any) => {
    if (!menu) return
    const newItems = [...menu.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setMenu({ ...menu, items: newItems })
  }

  const saveMenu = () => {
    if (!menu) return

    void (async () => {
      try {
        setSaveState('saving')
        await updateMenu(menu)
        lastSavedSnapshot.current = JSON.stringify(menu)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    })()
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

  const sendWeeklyMenu = async () => {
    if (!menu) return
    const lines = menu.items.map((item) => (
      `${item.day}: Lunch - ${item.lunch || 'TBD'} (${item.lunchCooks.join(', ') || 'TBD'}), Dinner - ${item.dinner || 'TBD'} (${item.dinnerCooks.join(', ') || 'TBD'})`
    ))
    await addNotification({
      title: `Weekly Menu for ${menu.week}`,
      message: lines.join('\n'),
      category: 'menu',
    })
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
          <div>
            <h2 className="text-xl font-semibold">Weekly Menu Planner</h2>
            <p className="app-muted mt-1 text-sm">
              Auto-saves by week so you can review older menus any time.
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={saveMenu}
              disabled={!canManageMenu}
              className="app-button app-button-primary"
              title="Save this week's menu right away."
            >
              Save Now
            </button>
            <button
              onClick={exportPNG}
              className="app-button app-button-secondary flex items-center space-x-1"
              title="Download the visible weekly menu as a PNG image."
            >
              <FileImage size={16} />
              <span>Export PNG</span>
            </button>
            <button
              type="button"
              onClick={() => void sendWeeklyMenu()}
              disabled={!canManageMenu}
              className="app-button app-button-ghost"
              title="Send this weekly menu as a notification to everyone in the app."
            >
              Send Menu
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[auto_auto_minmax(0,1fr)_auto] md:items-center">
          <button
            type="button"
            onClick={() => setSelectedWeek(getWeekKey(addWeeks(parseWeekKey(selectedWeek), -1)))}
            className="app-button app-button-ghost"
            title="Open the menu saved for the previous week."
          >
            Previous Week
          </button>
          <button
            type="button"
            onClick={() => setSelectedWeek(getWeekKey(addWeeks(parseWeekKey(selectedWeek), 1)))}
            className="app-button app-button-ghost"
            title="Open the menu saved for the next week."
          >
            Next Week
          </button>
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(getWeekKey(parseWeekKey(e.target.value)))}
            className="app-input"
            title="Pick any date in a week to review or edit that week's menu."
          />
          <div className="text-sm font-medium text-[var(--primary-strong)]">
            {saveState === 'saving'
              ? 'Saving changes...'
              : saveState === 'saved'
                ? 'All changes saved'
                : saveState === 'error'
                  ? 'Save failed, try Save Now'
                  : 'Ready to edit'}
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
            title="List the people responsible for buying vegetables this week."
          />
        </div>

        <div id="menu-table" className="overflow-x-auto">
          <table className="w-full table-auto border-collapse border border-[var(--border)]">
            <thead>
              <tr className="bg-[var(--surface-soft)]">
                <th className="border border-[var(--border)] p-2">Day</th>
                <th className="border border-[var(--border)] p-2">Lunch</th>
                <th className="border border-[var(--border)] p-2">Cooking Team</th>
                <th className="border border-[var(--border)] p-2">Dinner</th>
                <th className="border border-[var(--border)] p-2">Dinner Cooking Team</th>
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
                      title={`Enter the lunch menu for ${item.day}.`}
                    />
                  </td>
                  <td className="border border-[var(--border)] p-2">
                    <input
                      type="text"
                      value={item.lunchCooks.join(', ')}
                      onChange={(e) => updateMenuItem(index, 'lunchCooks', parseNames(e.target.value))}
                      className="app-input"
                      placeholder="Enter cooking team names"
                      disabled={!canManageMenu}
                      title={`Enter the lunch cooking team names for ${item.day}.`}
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
                      title={`Enter the dinner menu for ${item.day}.`}
                    />
                  </td>
                  <td className="border border-[var(--border)] p-2">
                    <input
                      type="text"
                      value={item.dinnerCooks.join(', ')}
                      onChange={(e) => updateMenuItem(index, 'dinnerCooks', parseNames(e.target.value))}
                      className="app-input"
                      placeholder="Enter dinner cooking team names"
                      disabled={!canManageMenu}
                      title={`Enter the dinner cooking team names for ${item.day}.`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h3 className="mb-4 text-lg font-semibold">Saved Weeks</h3>
        <div className="flex flex-wrap gap-2">
          {savedWeeks.map((savedMenu) => (
            <button
              key={savedMenu.week}
              type="button"
              onClick={() => setSelectedWeek(savedMenu.week)}
              className={`app-button ${
                savedMenu.week === selectedWeek ? 'app-button-primary' : 'app-button-ghost'
              }`}
              title={`Open the saved menu for the week starting ${savedMenu.week}.`}
            >
              {savedMenu.week}
            </button>
          ))}
          {savedWeeks.length === 0 && (
            <p className="app-muted text-sm">No weekly menus have been saved yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
