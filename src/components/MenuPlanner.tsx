'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Menu, MenuItem } from '@/types'
import { FileImage, Send, X } from 'lucide-react'
import html2canvas from 'html2canvas'
import { addWeeks, format, startOfWeek } from 'date-fns'

const parseNames = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

function ArrayInput({
  values,
  onChange,
  className,
  placeholder,
  disabled,
  title,
}: {
  values?: string[]
  onChange: (val: string[]) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  title?: string
}) {
  const [localValue, setLocalValue] = useState(() => (values || []).join(', '))

  useEffect(() => {
    const newStr = (values || []).join(', ')
    const localParsed = parseNames(localValue).join(', ')
    if (localParsed !== newStr) {
      setLocalValue(newStr)
    }
  }, [values, localValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalValue(e.target.value)
    onChange(parseNames(e.target.value))
  }

  return (
    <textarea
      value={localValue}
      onChange={handleChange}
      className={`${className || ''} min-h-[80px] resize-y w-full`}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
    />
  )
}

export function MenuPlanner() {
  const { menus, updateMenu, currentUser, addNotification } = useData()
  const getWeekKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 2 }), 'yyyy-MM-dd')
  const parseWeekKey = (week: string) => new Date(`${week}T12:00:00`)
  const [selectedWeek, setSelectedWeek] = useState(() => getWeekKey(new Date()))
  const [menu, setMenu] = useState<Menu | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [viewingMenu, setViewingMenu] = useState<Menu | null>(null)
  const [isRenderingExport, setIsRenderingExport] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const canManageMenu = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'
  const lastSavedSnapshot = useRef('')
  const isDirty = !!menu && JSON.stringify(menu) !== lastSavedSnapshot.current

  const buildDefaultMenu = (week: string): Menu => {
    const days = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', "Lord's Day", 'Monday']
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
    const defaultMenu = buildDefaultMenu(selectedWeek)
    const nextMenu = existing
      ? {
          ...existing,
          items: existing.items?.length ? existing.items : defaultMenu.items,
          purchasers: existing.purchasers || [],
        }
      : defaultMenu

    setMenu((current) => {
      if (!current || current.week !== selectedWeek) {
        setTimeout(() => setSaveState(existing ? 'saved' : 'idle'), 0)
        lastSavedSnapshot.current = JSON.stringify(nextMenu)
        return nextMenu
      }
      if (!current.id && existing) {
        setTimeout(() => setSaveState('saved'), 0)
        lastSavedSnapshot.current = JSON.stringify(nextMenu)
        return nextMenu
      }
      return current
    })
  }, [menus, selectedWeek])

  const savedWeeks = useMemo(
    () => [...menus].sort((a, b) => b.week.localeCompare(a.week)),
    [menus],
  )

  const updateMenuDraft = (nextMenu: Menu) => {
    setMenu(nextMenu)
    if (saveState !== 'saving') {
      setSaveState('idle')
    }
  }

  const updateMenuItem = (index: number, field: keyof MenuItem, value: any) => {
    if (!menu) return
    const newItems = [...(menu.items || [])]
    newItems[index] = { ...newItems[index], [field]: value }
    updateMenuDraft({ ...menu, items: newItems })
  }

  const saveMenu = () => {
    if (!menu) return

    void (async () => {
      try {
        setSaveState('saving')
        const savedMenu = await updateMenu(menu)
        if (!savedMenu) {
          setSaveState('error')
          return
        }
        setMenu(savedMenu)
        lastSavedSnapshot.current = JSON.stringify(savedMenu)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    })()
  }

  const renderMenuImage = async () => {
    const wrapper = document.getElementById('menu-export-area')
    const tableContainer = document.getElementById('menu-table-container')
    if (!wrapper || !tableContainer || !menu) return null

    const originalOverflow = tableContainer.style.overflowX
    const originalWidth = tableContainer.style.width
    const originalWrapperWidth = wrapper.style.width

    setIsRenderingExport(true)
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)))

    tableContainer.style.overflowX = 'visible'
    tableContainer.style.width = `${tableContainer.scrollWidth}px`
    wrapper.style.width = `${tableContainer.scrollWidth + 32}px`

    try {
      return await html2canvas(wrapper, { scale: 2.5, backgroundColor: '#ffffff' })
    } finally {
      tableContainer.style.overflowX = originalOverflow
      tableContainer.style.width = originalWidth
      wrapper.style.width = originalWrapperWidth
      setIsRenderingExport(false)
    }
  }

  const exportPNG = async () => {
    if (!menu) return
    const canvas = await renderMenuImage()
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `menu-${menu.week}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const sendWeeklyMenu = async () => {
    if (!menu) return

    try {
      setIsSending(true)
      // Ensure current changes are saved to the server before generating the image/sharing
      setSaveState('saving')
      const savedMenu = await updateMenu(menu)
      if (!savedMenu) {
        setSaveState('error')
        return
      }
      setMenu(savedMenu)
      lastSavedSnapshot.current = JSON.stringify(savedMenu)
      setSaveState('saved')

      const canvas = await renderMenuImage()
      if (!canvas) return
      const dataUrl = canvas.toDataURL('image/png')

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/png')
      })
      if (!blob) return

      const file = new File([blob], `menu-${savedMenu.week}.png`, { type: 'image/png' })
      const fallbackText = `Weekly menu for ${savedMenu.week} is ready.`

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: `Weekly Menu - ${savedMenu.week}`, text: fallbackText, files: [file] })
        } catch (err) {
          console.log('Share canceled', err)
        }
      } else {
        const link = document.createElement('a')
        link.download = `menu-${savedMenu.week}.png`
        link.href = dataUrl
        link.click()
      }

      await addNotification({
        title: `Weekly Menu for ${savedMenu.week}`,
        message: `[MENU_IMAGE]${dataUrl}`,
        category: 'menu',
        menuData: savedMenu,
        emailImageDataUrl: dataUrl,
      })
    } catch {
      setSaveState('error')
    } finally {
      setIsSending(false)
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
          Only admins and coordinators can update the weekly menu.
        </div>
      )}
      <div className="app-panel rounded-3xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h2 className="text-xl font-semibold">Weekly Menu Planner</h2>
            <p className="app-muted mt-1 text-sm">
              Plan this week or future weeks, then save only when you are ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={saveMenu}
              disabled={!canManageMenu}
              className="app-button app-button-primary flex-1 md:flex-none justify-center"
              title="Save this week's menu right away."
            >
              Save Now
            </button>
            <button
              onClick={exportPNG}
              className="app-button app-button-secondary flex flex-1 md:flex-none items-center justify-center space-x-1"
              title="Download the visible weekly menu as a PNG image."
            >
              <FileImage size={16} />
              <span>Export PNG</span>
            </button>
            <button
              type="button"
              onClick={() => void sendWeeklyMenu()}
              disabled={!canManageMenu || isSending}
              className="app-button app-button-primary flex flex-1 md:flex-none items-center justify-center space-x-1"
              title="Share this weekly menu as a PNG and publish it in the app and by email."
            >
              <Send size={16} />
              <span>{isSending ? 'Sharing...' : 'Share & Send'}</span>
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedWeek(getWeekKey(new Date()))}
              className="app-button app-button-ghost"
              title="Jump to the current planning week."
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setSelectedWeek(getWeekKey(addWeeks(new Date(), 1)))}
              className="app-button app-button-ghost"
              title="Jump to one week ahead."
            >
              1 Week Ahead
            </button>
            <button
              type="button"
              onClick={() => setSelectedWeek(getWeekKey(addWeeks(new Date(), 2)))}
              className="app-button app-button-ghost"
              title="Jump to two weeks ahead."
            >
              2 Weeks Ahead
            </button>
          </div>
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
                  : isDirty
                    ? 'Unsaved changes'
                  : 'Ready to edit'}
          </div>
        </div>

        <div
          id="menu-export-area"
          className={`bg-[var(--surface)] p-4 -mx-4 rounded-2xl ${isRenderingExport ? 'shadow-none' : ''}`}
        >
          <div className="mb-4">
            <label className={`block font-medium mb-2 ${isRenderingExport ? 'text-base' : 'text-sm'}`}>Vegetable Purchasers (2 people)</label>
            <ArrayInput
              values={menu.purchasers || []}
              onChange={(purchasers) => updateMenuDraft({ ...menu, purchasers })}
              className={`app-input ${isRenderingExport ? 'text-6xl leading-tight min-h-[220px]' : 'text-lg leading-7'}`}
              placeholder="Enter purchaser names separated by commas"
              disabled={!canManageMenu}
              title="List the people responsible for buying vegetables this week."
            />
          </div>

          <div id="menu-table-container" className="overflow-x-auto bg-[var(--surface)] p-2 -mx-2 rounded-xl">
            <table className={`w-full table-auto border-collapse border border-[var(--border)] min-w-[1600px] ${isRenderingExport ? 'text-6xl' : 'text-lg'}`}>
            <thead>
              <tr className="bg-[var(--surface-soft)]">
                <th className={`border border-[var(--border)] ${isRenderingExport ? 'p-14 text-6xl' : 'p-2 text-lg font-semibold'}`}>Day</th>
                <th className={`border border-[var(--border)] ${isRenderingExport ? 'p-14 text-6xl' : 'p-2 text-lg font-semibold'}`}>Lunch</th>
                <th className={`border border-[var(--border)] ${isRenderingExport ? 'p-14 text-6xl' : 'p-2 text-lg font-semibold'}`}>Cooking Team</th>
                <th className={`border border-[var(--border)] ${isRenderingExport ? 'p-14 text-6xl' : 'p-2 text-lg font-semibold'}`}>Dinner</th>
                <th className={`border border-[var(--border)] ${isRenderingExport ? 'p-14 text-6xl' : 'p-2 text-lg font-semibold'}`}>Dinner Cooking Team</th>
              </tr>
            </thead>
            <tbody>
              {(menu.items || []).map((item, index) => (
                <tr key={item.day} className="border-b border-[var(--border)]">
                  <td className={`border border-[var(--border)] font-medium align-top ${isRenderingExport ? 'p-14 text-6xl' : 'p-2 text-lg leading-7'}`}>
                    {item.day === 'Sunday' ? "Lord's Day" : item.day}
                  </td>
                  <td className={`border border-[var(--border)] ${isRenderingExport ? 'p-14' : 'p-2'}`}>
                    <textarea
                      value={item.lunch || ''}
                      onChange={(e) => updateMenuItem(index, 'lunch', e.target.value)}
                      className={`app-input resize-y w-full ${isRenderingExport ? 'min-h-[300px] text-5xl leading-normal' : 'min-h-[80px] text-lg leading-7'}`}
                      placeholder="Lunch menu"
                      disabled={!canManageMenu}
                      title={`Enter the lunch menu for ${item.day}.`}
                    />
                  </td>
                  <td className={`border border-[var(--border)] ${isRenderingExport ? 'p-14' : 'p-2'}`}>
                    <ArrayInput
                      values={item.lunchCooks || []}
                      onChange={(cooks) => updateMenuItem(index, 'lunchCooks', cooks)}
                      className={`app-input ${isRenderingExport ? 'text-5xl leading-normal min-h-[300px]' : 'text-lg leading-7'}`}
                      placeholder="Enter cooking team names"
                      disabled={!canManageMenu}
                      title={`Enter the lunch cooking team names for ${item.day}.`}
                    />
                  </td>
                  <td className={`border border-[var(--border)] ${isRenderingExport ? 'p-14' : 'p-2'}`}>
                    <textarea
                      value={item.dinner || ''}
                      onChange={(e) => updateMenuItem(index, 'dinner', e.target.value)}
                      className={`app-input resize-y w-full ${isRenderingExport ? 'min-h-[300px] text-5xl leading-normal' : 'min-h-[80px] text-lg leading-7'}`}
                      placeholder="Dinner menu"
                      disabled={!canManageMenu}
                      title={`Enter the dinner menu for ${item.day}.`}
                    />
                  </td>
                  <td className={`border border-[var(--border)] ${isRenderingExport ? 'p-14' : 'p-2'}`}>
                    <ArrayInput
                      values={item.dinnerCooks || []}
                      onChange={(cooks) => updateMenuItem(index, 'dinnerCooks', cooks)}
                      className={`app-input ${isRenderingExport ? 'text-5xl leading-normal min-h-[300px]' : 'text-lg leading-7'}`}
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
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h3 className="mb-4 text-lg font-semibold">Saved Weeks</h3>
        <div className="flex flex-wrap gap-2">
          {savedWeeks.map((savedMenu) => (
            <button
              key={savedMenu.week}
              type="button"
              onClick={() => setViewingMenu(savedMenu)}
              className={`app-button ${
                savedMenu.week === selectedWeek ? 'bg-[var(--surface-soft)] border border-[var(--primary)] text-[var(--primary-strong)]' : 'app-button-ghost bg-[var(--surface-soft)] border border-[var(--border)]'
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

      {viewingMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4 py-6 backdrop-blur-sm overflow-y-auto">
          <div className="app-panel w-full max-w-5xl rounded-3xl p-6 shadow-2xl my-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Menu for {viewingMenu.week}</h3>
              <button onClick={() => setViewingMenu(null)} className="app-button app-button-ghost p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            {viewingMenu.purchasers && viewingMenu.purchasers.length > 0 && (
              <div className="mb-4 text-sm bg-[var(--surface-soft)] px-4 py-3 rounded-2xl border border-[var(--border)]">
                <span className="font-semibold">Vegetable Purchasers: </span>
                {viewingMenu.purchasers.join(', ')}
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full table-auto text-sm text-left">
                <thead>
                  <tr className="bg-[var(--surface-soft)]">
                    <th className="p-3 border-b border-[var(--border)] font-semibold">Day</th>
                    <th className="p-3 border-b border-[var(--border)] font-semibold">Lunch</th>
                    <th className="p-3 border-b border-[var(--border)] font-semibold">Cooking Team</th>
                    <th className="p-3 border-b border-[var(--border)] font-semibold">Dinner</th>
                    <th className="p-3 border-b border-[var(--border)] font-semibold">Dinner Team</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingMenu.items || []).map((item) => (
                    <tr key={item.day} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-medium border-r border-[var(--border)]">{item.day === 'Sunday' ? "Lord's Day" : item.day}</td>
                      <td className="p-3 border-r border-[var(--border)] whitespace-pre-wrap">{item.lunch || '-'}</td>
                      <td className="p-3 border-r border-[var(--border)] text-[var(--primary-strong)] font-medium">{item.lunchCooks?.join(', ') || '-'}</td>
                      <td className="p-3 border-r border-[var(--border)] whitespace-pre-wrap">{item.dinner || '-'}</td>
                      <td className="p-3 text-[var(--primary-strong)] font-medium">{item.dinnerCooks?.join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setViewingMenu(null)} className="app-button app-button-ghost">Close View</button>
              {canManageMenu && (
                <button onClick={() => { setSelectedWeek(viewingMenu.week); setViewingMenu(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="app-button app-button-primary">Edit This Menu</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
