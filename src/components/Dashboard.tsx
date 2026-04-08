'use client'

import { useEffect, useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Pie, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { formatCurrency } from '@/lib/format'
import { format, startOfWeek } from 'date-fns'
import { SupplyReportsBoard } from '@/components/SupplyReportsBoard'
import { X } from 'lucide-react'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const REPORT_STATUS_LABELS = {
  missing: 'Missing',
  urgent: 'Urgent',
  resolved: 'Resolved',
  'in-consideration': 'In Consideration',
  'will-take-time': 'Will Take Time',
} as const

export function Dashboard() {
  const {
    expenses,
    monthlyBalance,
    activities,
    currentUser,
    monthlyPayments,
    menus,
    notifications,
    unreadNotifications,
    markNotificationAsRead,
    menuSuggestions,
    availabilities,
    addMenuSuggestion,
    addAvailability,
    reviewAvailability,
    updateMenuSuggestionStatus,
    supplyReports,
  } = useData()
  const [suggestionForm, setSuggestionForm] = useState({ suggestion: '', preferredDay: '', preferredMeal: '' })
  const [availabilityForm, setAvailabilityForm] = useState({ days: ["Lord's Day"], meals: ['lunch'] as ('lunch' | 'dinner')[], available: true, note: '' })
  const [reviewedAvailabilityIds, setReviewedAvailabilityIds] = useState<string[]>([])

  const toggleDay = (day: string) => setAvailabilityForm(prev => prev.days.includes(day) ? { ...prev, days: prev.days.filter(d => d !== day) } : { ...prev, days: [...prev.days, day] })
  const toggleMeal = (meal: 'lunch' | 'dinner') => setAvailabilityForm(prev => prev.meals.includes(meal) ? { ...prev, meals: prev.meals.filter(m => m !== meal) } : { ...prev, meals: [...prev.meals, meal] })

  const cashIn = expenses.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0)
  const cashOut = expenses.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0)

  const categoryData = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  const pieData = {
    labels: Object.keys(categoryData),
    datasets: [{
      data: Object.values(categoryData),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    }],
  }

  const barData = {
    labels: ['Cash In', 'Cash Out', 'Balance'],
    datasets: [{
      label: 'Amount',
      data: [cashIn, cashOut, monthlyBalance],
      backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
    }],
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 2 }), 'yyyy-MM-dd')
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(currentMonth))
  const monthIncome = monthExpenses.filter((expense) => expense.type === 'in').reduce((sum, expense) => sum + expense.amount, 0)
  const monthSpend = monthExpenses.filter((expense) => expense.type === 'out').reduce((sum, expense) => sum + expense.amount, 0)
  const lowBalance = monthIncome > 0 ? monthlyBalance < monthIncome * 0.2 : monthlyBalance < 0
  const generalActivities = activities.filter((activity) => !/income|cash in|paid/i.test(activity.action)).slice(0, 5)
  const eatingPeople = [...new Set(
    monthlyPayments
      .filter((payment) => payment.month === currentMonth && payment.paid)
      .map((payment) => payment.memberName),
  )].filter(n => n !== 'Hidden').sort((a, b) => a.localeCompare(b))
  const eatingPeopleCount = monthlyPayments.filter((payment) => payment.month === currentMonth && payment.paid).length
  const currentWeekMenu = menus.find((menu) => menu.week === currentWeek)
  const currentWeekAvailabilities = availabilities.filter((entry) => (
    entry.week === currentWeek && !reviewedAvailabilityIds.includes(entry.id)
  ))
  const availabilityReviewGroups = currentWeekAvailabilities.reduce((groups, entry) => {
    const key = `${entry.userId ?? entry.user}-${entry.createdAt.slice(0, 19)}-${entry.available}-${entry.note ?? ''}`
    const existing = groups.get(key)

    if (existing) {
      existing.ids.push(entry.id)
      existing.selections.push({
        label: `${entry.day === 'Sunday' ? "Lord's Day" : entry.day} - ${entry.meal}`,
        sortKey: `${entry.day}-${entry.meal}`,
      })
      return groups
    }

    groups.set(key, {
      ids: [entry.id],
      user: entry.user,
      available: entry.available,
      note: entry.note,
      createdAt: entry.createdAt,
      selections: [{
        label: `${entry.day === 'Sunday' ? "Lord's Day" : entry.day} - ${entry.meal}`,
        sortKey: `${entry.day}-${entry.meal}`,
      }],
    })
    return groups
  }, new Map<string, {
    ids: string[]
    user: string
    available: boolean
    note?: string | null
    createdAt: string
    selections: Array<{ label: string; sortKey: string }>
  }>())
  const pendingSuggestions = menuSuggestions.filter((suggestion) => suggestion.status === 'pending')
  const cookingPeople = [...new Set(
    currentWeekMenu?.items?.flatMap((item) => [...(item.lunchCooks || []), ...(item.dinnerCooks || [])]) ?? [],
  )].sort((a, b) => a.localeCompare(b))
  const dashboardReports = supplyReports.filter((report) => (
    report.category === 'maintenance' || report.category === 'grocery' || report.category === 'vegetable'
  ))

  useEffect(() => {
    setReviewedAvailabilityIds((prev) => prev.filter((id) => availabilities.some((entry) => entry.id === id)))
  }, [availabilities])

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addMenuSuggestion(suggestionForm)
    setSuggestionForm({ suggestion: '', preferredDay: '', preferredMeal: '' })
  }

  const handleAvailabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (availabilityForm.days.length === 0 || availabilityForm.meals.length === 0) {
      alert('Please select at least one day and one meal.')
      return
    }
    await addAvailability({
      week: currentWeek,
      entries: availabilityForm.days.flatMap((day) => (
        availabilityForm.meals.map((meal) => ({
          day,
          meal,
          available: availabilityForm.available,
          note: availabilityForm.note,
        }))
      )),
    })
    setAvailabilityForm({ days: ["Lord's Day"], meals: ['lunch'], available: true, note: '' })
  }

  const handleReviewAvailability = async (ids: string[]) => {
    setReviewedAvailabilityIds((prev) => [...new Set([...prev, ...ids])])
    await reviewAvailability(ids)
  }

  if (currentUser?.role === 'user') {
    return (
      <div className="space-y-6">
        {unreadNotifications.length > 0 && (
          <div className="space-y-3">
            {unreadNotifications.map((notification) => (
              <div key={notification.id} className="app-panel relative rounded-3xl p-6 border-l-4 border-l-[var(--primary)]">
                <button
                  onClick={() => markNotificationAsRead(notification.id)}
                  className="absolute right-4 top-4 p-2 text-[var(--text-soft)] hover:text-[var(--text)] transition-colors"
                  title="Hide Notification"
                >
                  <X size={20} />
                </button>
                <div className="mb-2 flex items-center gap-3 pr-8">
                  <h3 className="text-lg font-semibold">{notification.title}</h3>
                  <span className="app-muted text-xs">{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                {notification.message.startsWith('[MENU_IMAGE]') ? (
                  <img src={notification.message.replace('[MENU_IMAGE]', '')} alt="Weekly Menu" className="mt-2 w-full rounded-xl border border-[var(--border)] object-contain max-h-96" />
                ) : (
                  <p className="text-sm">{notification.message}</p>
                )}
                <p className="app-muted mt-2 text-xs">From {notification.createdBy}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">This Month&apos;s Expenses</h3>
            <p className="text-2xl font-bold text-[var(--primary-strong)]">{formatCurrency(monthSpend)}</p>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">This Month&apos;s Income</h3>
            <p className="text-2xl font-bold text-[var(--accent-strong)]">{formatCurrency(monthIncome)}</p>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">Visible Entries</h3>
            <p className="text-2xl font-bold text-[var(--primary)]">
              {monthExpenses.filter((expense) => expense.type === 'out').length}
            </p>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">Cooking This Week</h3>
            <p className="text-2xl font-bold text-[var(--accent-strong)]">{cookingPeople.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Eating This Month</h3>
            <p className="app-muted mb-3 text-sm">{eatingPeopleCount} people marked as paid</p>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Cooking Team This Week</h3>
            <p className="app-muted mb-3 text-sm">{cookingPeople.length} people participating</p>
            <div className="flex flex-wrap gap-2">
              {cookingPeople.map((name) => (
                <span key={name} className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]">
                  {name}
                </span>
              ))}
              {cookingPeople.length === 0 && <span className="app-muted text-sm">No cooking team names added for this week yet.</span>}
            </div>
          </div>
        </div>

        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Activities</h3>
          <div className="space-y-2">
            {generalActivities.map((activity) => (
              <div key={activity.id} className="app-muted text-sm">
                <span className="font-medium">{activity.user}</span> {activity.action}
              </div>
            ))}
            {generalActivities.length === 0 && (
              <div className="app-muted text-sm">No recent visible activities.</div>
            )}
          </div>
        </div>

        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">This Week&apos;s Menu</h3>
          <div className="space-y-3">
            {currentWeekMenu?.items?.map((item) => (
              <div key={item.day} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                <div className="font-semibold">{item.day === 'Sunday' ? "Lord's Day" : item.day}</div>
                <div className="app-muted text-sm">Lunch: {item.lunch || 'Not set'} | Dinner: {item.dinner || 'Not set'}</div>
                <div className="app-muted text-sm">Cooking: {[...(item.lunchCooks || []), ...(item.dinnerCooks || [])].join(', ') || 'Not assigned'}</div>
              </div>
            ))}
            {!currentWeekMenu && <p className="app-muted text-sm">No menu published for this week yet.</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Suggest a Menu Item</h3>
            <form onSubmit={handleSuggestionSubmit} className="space-y-4">
              <input className="app-input" value={suggestionForm.suggestion} onChange={(e) => setSuggestionForm((prev) => ({ ...prev, suggestion: e.target.value }))} placeholder="What would you like to cook?" required />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <select className="app-input" value={suggestionForm.preferredDay} onChange={(e) => setSuggestionForm((prev) => ({ ...prev, preferredDay: e.target.value }))}>
                  <option value="">Preferred day</option>
                  {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', "Lord's Day", 'Monday'].map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
                <select className="app-input" value={suggestionForm.preferredMeal} onChange={(e) => setSuggestionForm((prev) => ({ ...prev, preferredMeal: e.target.value }))}>
                  <option value="">Preferred meal</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
              <button type="submit" className="app-button app-button-primary">Send Suggestion</button>
            </form>
          </div>

          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Share Your Availability</h3>
            <form onSubmit={handleAvailabilitySubmit} className="space-y-4">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Days</label>
                <div className="flex flex-wrap gap-2">
                  {['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', "Lord's Day", 'Monday'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${availabilityForm.days.includes(day) ? 'bg-[var(--primary)] text-[var(--primary-strong)] border-[var(--primary)]' : 'bg-[var(--surface-soft)] text-[var(--text)] border-[var(--border)]'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Meals</label>
                <div className="flex gap-2">
                  {(['lunch', 'dinner'] as const).map(meal => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => toggleMeal(meal)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${availabilityForm.meals.includes(meal) ? 'bg-[var(--primary)] text-[var(--primary-strong)] border-[var(--primary)]' : 'bg-[var(--surface-soft)] text-[var(--text)] border-[var(--border)]'}`}
                    >
                      {meal}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <select className="app-input" value={availabilityForm.available ? 'yes' : 'no'} onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, available: e.target.value === 'yes' }))}>
                  <option value="yes">Available to cook</option>
                  <option value="no">Not available</option>
                </select>
                <input className="app-input" value={availabilityForm.note} onChange={(e) => setAvailabilityForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Optional note" />
              </div>
              <button type="submit" className="app-button app-button-secondary">Send Availability</button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Notifications</h3>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => {
                const isUnread = unreadNotifications.some(n => n.id === notification.id)
                return (
                <div 
                  key={notification.id} 
                  className={`rounded-2xl ${isUnread ? 'bg-[var(--primary)]/10 cursor-pointer' : 'bg-[var(--surface-soft)]'} p-4`}
                  onClick={() => isUnread && markNotificationAsRead(notification.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">
                      {notification.title}
                      {isUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--primary-strong)]"></span>}
                    </div>
                    <span className="app-muted text-xs">{new Date(notification.createdAt).toLocaleString()}</span>
                  </div>
                  {notification.message.startsWith('[MENU_IMAGE]') ? (
                    <img src={notification.message.replace('[MENU_IMAGE]', '')} alt="Weekly Menu" className="mt-3 w-full rounded-xl border border-[var(--border)] object-contain max-h-48" />
                  ) : (
                    <div className="app-muted mt-2 text-sm">{notification.message}</div>
                  )}
                </div>
              )})}
              {notifications.length === 0 && <div className="app-muted text-sm">No notifications yet.</div>}
            </div>
          </div>
          
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Maintenance And Shortage Reports</h3>
            <div className="space-y-3">
              {dashboardReports.map((report) => (
                <div key={report.id} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{report.title}</div>
                    {report.status === 'urgent' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">URGENT</span>}
                    {report.status === 'resolved' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">RESOLVED</span>}
                    {report.status === 'in-consideration' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">IN CONSIDERATION</span>}
                    {report.status === 'will-take-time' && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">WILL TAKE TIME</span>}
                  </div>
                  <div className="app-muted text-sm">
                    {report.category} {report.itemName ? `| ${report.itemName}` : ''} | Reported by {report.createdBy}
                  </div>
                  <div className="mt-2 text-sm">{report.message}</div>
                  <div className="app-muted mt-2 text-sm">Status: {REPORT_STATUS_LABELS[report.status]}</div>
                  {report.response && (
                    <div className="app-muted mt-2 text-sm">
                      Reply: {report.response}
                    </div>
                  )}
                </div>
              ))}
              {dashboardReports.length === 0 && <p className="app-muted text-sm">No maintenance or shortage reports yet.</p>}
            </div>
          </div>
        </div>

        <SupplyReportsBoard />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {unreadNotifications.length > 0 && (
        <div className="space-y-3">
          {unreadNotifications.map((notification) => (
            <div key={notification.id} className="app-panel relative rounded-3xl p-6 border-l-4 border-l-[var(--primary)]">
              <button
                onClick={() => markNotificationAsRead(notification.id)}
                className="absolute right-4 top-4 p-2 text-[var(--text-soft)] hover:text-[var(--text)] transition-colors"
                title="Hide Notification"
              >
                <X size={20} />
              </button>
              <div className="mb-2 flex items-center gap-3 pr-8">
                <h3 className="text-lg font-semibold">{notification.title}</h3>
                <span className="app-muted text-xs">{new Date(notification.createdAt).toLocaleString()}</span>
              </div>
              {notification.message.startsWith('[MENU_IMAGE]') ? (
                <img src={notification.message.replace('[MENU_IMAGE]', '')} alt="Weekly Menu" className="mt-2 w-full rounded-xl border border-[var(--border)] object-contain max-h-96" />
              ) : (
                <p className="text-sm">{notification.message}</p>
              )}
              <p className="app-muted mt-2 text-xs">From {notification.createdBy}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Remaining Balance</h3>
          <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(monthlyBalance)}</p>
          <p className="app-muted mt-2 text-sm">This month&apos;s income minus this month&apos;s expenses.</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className={`text-lg font-semibold ${lowBalance ? 'text-amber-600' : 'text-[var(--accent-strong)]'}`}>
            {lowBalance ? 'Low Balance Warning!' : 'Good'}
          </p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Eating This Month</h3>
          <p className="text-2xl font-bold text-[var(--accent-strong)]">{eatingPeopleCount}</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Cooking This Week</h3>
          <p className="text-2xl font-bold text-[var(--primary)]">{cookingPeople.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          <Pie data={pieData} />
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-4">Cash Flow</h3>
          <Bar data={barData} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Eating This Month</h3>
          <div className="flex flex-wrap gap-2">
            {currentUser?.role === 'admin' ? (
              eatingPeople.map((name) => (
                <span key={name} className="rounded-full bg-[var(--accent)]/15 px-3 py-2 text-sm text-[var(--accent-strong)]">
                  {name}
                </span>
              ))
            ) : (
              <p className="app-muted text-sm">Details hidden. {eatingPeopleCount} people paid.</p>
            )}
            {eatingPeopleCount === 0 && (
              <p className="app-muted text-sm">No one has been marked paid for {currentMonth} yet.</p>
            )}
          </div>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">People Cooking This Week</h3>
          <div className="flex flex-wrap gap-2">
            {cookingPeople.map((name) => (
              <span key={name} className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]">
                {name}
              </span>
            ))}
            {cookingPeople.length === 0 && (
              <p className="app-muted text-sm">No cooking names added for the week of {currentWeek} yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">This Week&apos;s Menu</h3>
          <div className="space-y-3">
            {currentWeekMenu?.items?.map((item) => (
              <div key={item.day} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                <div className="font-semibold">{item.day === 'Sunday' ? "Lord's Day" : item.day}</div>
                <div className="app-muted text-sm">Lunch: {item.lunch || 'Not set'} | Dinner: {item.dinner || 'Not set'}</div>
                <div className="app-muted text-sm">Cooking: {[...(item.lunchCooks || []), ...(item.dinnerCooks || [])].join(', ') || 'Not assigned'}</div>
              </div>
            ))}
            {!currentWeekMenu && <p className="app-muted text-sm">No menu published for this week yet.</p>}
          </div>
        </div>

        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-2">
            {activities
              .filter((a) => currentUser?.role === 'admin' || !/income|cash in|paid/i.test(a.action))
              .slice(-5).reverse().map(activity => (
              <div key={activity.id} className="app-muted text-sm">
                <span className="font-medium">{activity.user}</span> {activity.action} at {new Date(activity.timestamp).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Pending Menu Suggestions</h3>
          <div className="space-y-3">
            {pendingSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                <div className="font-semibold">{suggestion.suggestion}</div>
                <div className="app-muted text-sm">
                  From {suggestion.user}
                  {suggestion.preferredDay ? ` | ${suggestion.preferredDay === 'Sunday' ? "Lord's Day" : suggestion.preferredDay}` : ''}
                  {suggestion.preferredMeal ? ` | ${suggestion.preferredMeal}` : ''}
                </div>
                <button
                  type="button"
                  onClick={() => updateMenuSuggestionStatus(suggestion.id, 'reviewed')}
                  className="app-button app-button-ghost mt-3 px-3 py-2"
                >
                  Mark Reviewed
                </button>
              </div>
            ))}
            {pendingSuggestions.length === 0 && <p className="app-muted text-sm">No pending menu suggestions.</p>}
          </div>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Cooking Availability This Week</h3>
          <div className="space-y-3">
            {Array.from(availabilityReviewGroups.values()).map((group) => (
              <div key={group.ids.join('-')} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{group.user}</div>
                    <div className="app-muted text-sm">
                      {group.available ? 'Available to cook' : 'Not available'} | {new Date(group.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleReviewAvailability(group.ids)}
                    className="app-button app-button-ghost px-3 py-2 text-xs"
                  >
                    Reviewed
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.selections
                    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
                    .map((selection) => (
                      <span key={selection.label} className="rounded-full bg-[var(--primary)]/12 px-3 py-1.5 text-xs font-semibold text-[var(--primary-strong)]">
                        {selection.label}
                      </span>
                    ))}
                </div>
                {group.note && <div className="app-muted mt-3 text-sm">{group.note}</div>}
              </div>
            ))}
            {currentWeekAvailabilities.length === 0 && <p className="app-muted text-sm">No availability submissions for this week.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Recent Notifications</h3>
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => {
              const isUnread = unreadNotifications.some(n => n.id === notification.id)
              return (
              <div 
                key={notification.id} 
                className={`rounded-2xl ${isUnread ? 'bg-[var(--primary)]/10 cursor-pointer' : 'bg-[var(--surface-soft)]'} p-4`}
                onClick={() => isUnread && markNotificationAsRead(notification.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">
                    {notification.title}
                    {isUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--primary-strong)]"></span>}
                  </div>
                  <span className="app-muted text-xs">{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                {notification.message.startsWith('[MENU_IMAGE]') ? (
                  <img src={notification.message.replace('[MENU_IMAGE]', '')} alt="Weekly Menu" className="mt-3 w-full rounded-xl border border-[var(--border)] object-contain max-h-48" />
                ) : (
                  <div className="app-muted mt-2 text-sm">{notification.message}</div>
                )}
              </div>
            )})}
            {notifications.length === 0 && <p className="app-muted text-sm">No notifications sent yet.</p>}
          </div>
        </div>
        
        <div className="app-panel rounded-3xl p-6">
          <h3 className="mb-4 text-lg font-semibold">Maintenance And Shortage Reports</h3>
          <div className="space-y-3">
            {dashboardReports.map((report) => (
              <div key={report.id} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{report.title}</div>
                  {report.status === 'urgent' && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">URGENT</span>}
                  {report.status === 'resolved' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">RESOLVED</span>}
                </div>
                <div className="app-muted text-sm">
                  {report.category} {report.itemName ? `| ${report.itemName}` : ''} | Reported by {report.createdBy}
                </div>
                <div className="mt-2 text-sm">{report.message}</div>
                {report.response && <div className="app-muted mt-2 text-sm">Reply: {report.response}</div>}
              </div>
            ))}
            {dashboardReports.length === 0 && <p className="app-muted text-sm">No maintenance or shortage reports yet.</p>}
          </div>
        </div>
      </div>

      <SupplyReportsBoard />
    </div>
  )
}
