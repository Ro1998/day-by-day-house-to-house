'use client'

import { useEffect, useState, useMemo } from 'react'
import { useData } from '@/components/DataProvider'
import { Pie, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { formatCurrency } from '@/lib/format'
import { format, startOfWeek, addWeeks, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { SupplyReportsBoard } from '@/components/SupplyReportsBoard'
import { X, Calendar as CalendarIcon, MapPin, Video, Clock, Plus, ExternalLink, Loader2, Pencil, Trash2, Eye } from 'lucide-react'

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
    events,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useData()
  const [suggestionForm, setSuggestionForm] = useState({ suggestion: '', preferredDay: '', preferredMeal: '' })
  const [availabilityForm, setAvailabilityForm] = useState({ days: ["Lord's Day"], meals: ['lunch'] as ('lunch' | 'dinner')[], available: true, note: '' })
  const [reviewedAvailabilityIds, setReviewedAvailabilityIds] = useState<string[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventForm, setEventForm] = useState({ title: '', date: '', time: '', type: 'offline' as 'online' | 'offline', location: '', venue: '', description: '' })
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [showFullMenu, setShowFullMenu] = useState(false)
  const canSeeFullCashInDetails = currentUser?.role === 'admin' || currentUser?.role === 'overseer'
  const isGeneralUser = currentUser?.role === 'user'
  const canManageEvents = currentUser?.role === 'admin' || currentUser?.role === 'overseer'
  
  const toggleDay = (day: string) => setAvailabilityForm(prev => prev.days.includes(day) ? { ...prev, days: prev.days.filter(d => d !== day) } : { ...prev, days: [...prev.days, day] })
  const toggleMeal = (meal: 'lunch' | 'dinner') => setAvailabilityForm(prev => prev.meals.includes(meal) ? { ...prev, meals: prev.meals.filter(m => m !== meal) } : { ...prev, meals: [...prev.meals, meal] })

  const cashIn = useMemo(() => expenses.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0), [expenses])
  const cashOut = useMemo(() => expenses.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0), [expenses])

  const categoryData = useMemo(() => expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>), [expenses])

  const pieData = useMemo(() => ({
    labels: Object.keys(categoryData),
    datasets: [{
      data: Object.values(categoryData),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    }],
  }), [categoryData])

  const barData = useMemo(() => ({
    labels: ['Cash In', 'Cash Out', 'Balance'],
    datasets: [{
      label: 'Amount',
      data: [cashIn, cashOut, monthlyBalance],
      backgroundColor: ['#4CAF50', '#F44336', '#2196F3'],
    }],
  }), [cashIn, cashOut, monthlyBalance])

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentWeek = format(startOfWeek(new Date(), { weekStartsOn: 2 }), 'yyyy-MM-dd')
  const nextWeek = format(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 2 }), 'yyyy-MM-dd')
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(currentMonth))
  const monthIncome = monthExpenses.filter((expense) => expense.type === 'in').reduce((sum, expense) => sum + expense.amount, 0)
  const monthSpend = monthExpenses.filter((expense) => expense.type === 'out').reduce((sum, expense) => sum + expense.amount, 0)
  const lowBalance = monthIncome > 0 ? monthlyBalance < monthIncome * 0.2 : monthlyBalance < 0
  
  const [activitiesLimit, setActivitiesLimit] = useState(5)
  const generalActivities = useMemo(() => 
    activities.filter((activity) => !/income|cash in|paid/i.test(activity.action)).slice(0, activitiesLimit),
    [activities, activitiesLimit]
  )

  const eatingPeople = [...new Set(
    monthlyPayments
      .filter((payment) => payment.month === currentMonth && payment.paid)
      .map((payment) => payment.memberName),
  )].filter(n => n !== 'Hidden').sort((a, b) => a.localeCompare(b))
  const eatingPeopleCount = monthlyPayments.filter((payment) => payment.month === currentMonth && payment.paid).length

  const isMenuPopulated = (m: any) => m?.items?.some((i: any) => i.lunch || i.dinner)
  const currentWeekMenu = menus.find((m) => m.week === currentWeek)
  const nextWeekMenu = menus.find((m) => m.week === nextWeek)

  const today = new Date().getDay() // 0=Sun, 1=Mon, 2=Tue...
  const isTransitionPeriod = today === 0 || today === 1 // Sunday or Monday

  // Logic: Prioritize the menu the user likely wants to see right now.
  let displayMenu = currentWeekMenu
  if (isTransitionPeriod && isMenuPopulated(nextWeekMenu)) {
    // On Sun/Mon, if the upcoming menu is already posted, show it.
    displayMenu = nextWeekMenu
  } else if (!isMenuPopulated(currentWeekMenu) && isMenuPopulated(nextWeekMenu)) {
    // If current week hasn't been planned but next week has, show next.
    displayMenu = nextWeekMenu
  } else if (!isMenuPopulated(displayMenu)) {
    // Otherwise, show the latest menu that actually has content.
    displayMenu = [...menus].filter(isMenuPopulated).sort((a, b) => b.week.localeCompare(a.week))[0] || currentWeekMenu || nextWeekMenu
  }

  const isNextWeek = displayMenu?.week === nextWeek
  const displayWeekLabel = displayMenu 
    ? displayMenu.week === currentWeek 
      ? "This Week's Menu" 
      : displayMenu.week === nextWeek 
        ? "Next Week's Menu" 
        : `Menu for ${displayMenu.week}`
    : "Weekly Menu"

  // Filter events to show only today and future events
  const todayStart = startOfDay(new Date())
  const upcomingEvents = events
    .filter(e => startOfDay(parseISO(e.date)) >= todayStart)
    .sort((a, b) => a.date.localeCompare(b.date))

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
    displayMenu?.items?.flatMap((item) => [...(item.lunchCooks || []), ...(item.dinnerCooks || [])]) ?? [],
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

  const resetEventForm = () => {
    setEventForm({ title: '', date: '', time: '', type: 'offline', location: '', venue: '', description: '' })
    setEditingEventId(null)
    setShowEventForm(false)
  }

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsCreatingEvent(true)
      if (editingEventId) {
        await updateEvent({ id: editingEventId, ...eventForm })
      } else {
        await addEvent(eventForm)
      }
      resetEventForm()
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const startEditingEvent = (event: typeof upcomingEvents[number]) => {
    setEditingEventId(event.id)
    setEventForm({
      title: event.title,
      date: event.date,
      time: event.time,
      type: event.type,
      location: event.location || '',
      venue: event.venue || '',
      description: event.description || '',
    })
    setShowEventForm(true)
  }

  const handleDeleteEvent = async (event: typeof upcomingEvents[number]) => {
    const confirmed = window.confirm(`Delete "${event.title}" on ${event.date}?`)
    if (!confirmed) return
    await deleteEvent(event.id)
    if (editingEventId === event.id) {
      resetEventForm()
    }
  }

  if (isGeneralUser) {
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

        <div className="grid grid-cols-1 gap-6">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-2 text-lg font-semibold">Remaining Balance This Month</h3>
            <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(monthlyBalance)}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 app-panel rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">{displayWeekLabel}</h3>
              {displayMenu && (
                <button type="button" onClick={() => setShowFullMenu((prev) => !prev)} className="app-button app-button-ghost px-3 py-2 text-sm">
                  <Eye size={16} />
                  <span>{showFullMenu ? 'Hide Full Menu' : 'Open Full Menu'}</span>
                </button>
              )}
            </div>
            {!showFullMenu && (
              <div className="space-y-3">
                {displayMenu?.items?.map((item) => (
                  <div key={item.day} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <div className="font-semibold">{item.day === 'Sunday' ? "Lord's Day" : item.day}</div>
                    <div className="app-muted text-sm">Lunch: {item.lunch || 'Not set'} | Dinner: {item.dinner || 'Not set'}</div>
                    <div className="app-muted text-sm">Cooking: {[...(item.lunchCooks || []), ...(item.dinnerCooks || [])].join(', ') || 'Not assigned'}</div>
                  </div>
                ))}
                {!displayMenu && <p className="app-muted text-sm">No menu published yet.</p>}
              </div>
            )}
            {showFullMenu && displayMenu && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm">
                  <span className="font-semibold">Vegetable Purchasers: </span>
                  {displayMenu.purchasers?.join(', ') || 'Not assigned'}
                </div>
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                  <table className="min-w-[1050px] w-full table-auto text-left">
                    <thead>
                      <tr className="bg-[var(--surface-soft)] text-base">
                        <th className="border-b border-[var(--border)] p-4 font-semibold">Day</th>
                        <th className="border-b border-[var(--border)] p-4 font-semibold">Lunch</th>
                        <th className="border-b border-[var(--border)] p-4 font-semibold">Cooking Team</th>
                        <th className="border-b border-[var(--border)] p-4 font-semibold">Dinner</th>
                        <th className="border-b border-[var(--border)] p-4 font-semibold">Dinner Team</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayMenu.items?.map((item) => (
                        <tr key={item.day} className="align-top border-b border-[var(--border)] last:border-0 text-[15px]">
                          <td className="border-r border-[var(--border)] p-4 font-semibold">{item.day}</td>
                          <td className="border-r border-[var(--border)] p-4 whitespace-pre-wrap">{item.lunch || '-'}</td>
                          <td className="border-r border-[var(--border)] p-4 text-[var(--primary-strong)] font-medium">{item.lunchCooks?.join(', ') || '-'}</td>
                          <td className="border-r border-[var(--border)] p-4 whitespace-pre-wrap">{item.dinner || '-'}</td>
                          <td className="p-4 text-[var(--primary-strong)] font-medium">{item.dinnerCooks?.join(', ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="app-panel rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarIcon size={20} className="text-[var(--primary-strong)]" />
                Events & Meetings
              </h3>
            </div>
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="border-l-2 border-[var(--primary)] pl-4 py-1">
                  <div className="text-xs font-bold text-[var(--primary-strong)] uppercase tracking-wider">
                    {isToday(parseISO(event.date)) ? 'Today' : isTomorrow(parseISO(event.date)) ? 'Tomorrow' : format(parseISO(event.date), 'EEE, MMM d')}
                  </div>
                  <div className="font-semibold text-sm">{event.title}</div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] app-muted">
                    <span className="flex items-center gap-1"><Clock size={12} /> {event.time}</span>
                    <span className="flex items-center gap-1">
                      {event.type === 'online' ? <Video size={12} /> : <MapPin size={12} />}
                      {event.location || event.venue}
                    </span>
                  </div>
                  {event.googleCalendarUrl && (
                    <a
                      href={event.googleCalendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary-strong)] hover:underline"
                    >
                      <ExternalLink size={12} />
                      Add to Google Calendar
                    </a>
                  )}
                </div>
              ))}
              {upcomingEvents.length === 0 && (
                <p className="app-muted text-sm">No upcoming meetings or events scheduled.</p>
              )}
            {activities.length > activitiesLimit && (
              <button onClick={() => setActivitiesLimit(prev => prev + 10)} className="text-[var(--primary)] text-sm font-medium mt-2 hover:underline">
                Show More
              </button>
            )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Eating This Month</h3>
            <p className="app-muted mb-3 text-sm">{eatingPeopleCount} people marked as paid</p>
          </div>
          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Cooking Team {isNextWeek ? 'Next Week' : 'This Week'}</h3>
            <p className="app-muted mb-3 text-sm">{cookingPeople.length} people {isNextWeek ? 'assigned' : 'participating'}</p>
            <div className="flex flex-wrap gap-2">
              {cookingPeople.map((name) => (
                <span key={name} className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]">
                  {name}
                </span>
              ))}
              {cookingPeople.length === 0 && <span className="app-muted text-sm">No cooking team names added for {displayMenu?.week || 'this week'} yet.</span>}
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
            {activities.length > activitiesLimit && (
              <button onClick={() => setActivitiesLimit(prev => prev + 10)} className="text-[var(--primary)] text-sm font-medium mt-2 hover:underline">
                Show More
              </button>
            )}
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

      <div className={`grid grid-cols-1 gap-6 ${canSeeFullCashInDetails ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {canSeeFullCashInDetails && (
          <div className="app-panel rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-2">This Month&apos;s Income</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(monthIncome)}</p>
          </div>
        )}
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">This Month&apos;s Expenses</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(monthSpend)}</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Remaining Balance</h3>
          <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(monthlyBalance)}</p>
          <p className="app-muted mt-2 text-sm">Income minus expenses.</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className={`text-lg font-semibold ${lowBalance ? 'text-amber-600' : 'text-[var(--accent-strong)]'}`}>
            {lowBalance ? 'Low Balance Warning!' : 'Good'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 app-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{displayWeekLabel}</h3>
            {displayMenu && (
              <button type="button" onClick={() => setShowFullMenu((prev) => !prev)} className="app-button app-button-ghost px-3 py-2 text-sm">
                <Eye size={16} />
                <span>{showFullMenu ? 'Hide Full Menu' : 'Open Full Menu'}</span>
              </button>
            )}
          </div>
          {!showFullMenu && (
            <div className="space-y-3">
              {displayMenu?.items?.map((item) => (
                <div key={item.day} className="rounded-2xl bg-[var(--surface-soft)] p-4">
                  <div className="font-semibold">{item.day === 'Sunday' ? "Lord's Day" : item.day}</div>
                  <div className="app-muted text-sm">Lunch: {item.lunch || 'Not set'} | Dinner: {item.dinner || 'Not set'}</div>
                  <div className="app-muted text-sm">Cooking: {[...(item.lunchCooks || []), ...(item.dinnerCooks || [])].join(', ') || 'Not assigned'}</div>
                </div>
              ))}
              {!displayMenu && <p className="app-muted text-sm">No menu published yet.</p>}
            </div>
          )}
          {showFullMenu && displayMenu && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm">
                <span className="font-semibold">Vegetable Purchasers: </span>
                {displayMenu.purchasers?.join(', ') || 'Not assigned'}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="min-w-[1050px] w-full table-auto text-left">
                  <thead>
                    <tr className="bg-[var(--surface-soft)] text-base">
                      <th className="border-b border-[var(--border)] p-4 font-semibold">Day</th>
                      <th className="border-b border-[var(--border)] p-4 font-semibold">Lunch</th>
                      <th className="border-b border-[var(--border)] p-4 font-semibold">Cooking Team</th>
                      <th className="border-b border-[var(--border)] p-4 font-semibold">Dinner</th>
                      <th className="border-b border-[var(--border)] p-4 font-semibold">Dinner Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayMenu.items?.map((item) => (
                      <tr key={item.day} className="align-top border-b border-[var(--border)] last:border-0 text-[15px]">
                        <td className="border-r border-[var(--border)] p-4 font-semibold">{item.day}</td>
                        <td className="border-r border-[var(--border)] p-4 whitespace-pre-wrap">{item.lunch || '-'}</td>
                        <td className="border-r border-[var(--border)] p-4 text-[var(--primary-strong)] font-medium">{item.lunchCooks?.join(', ') || '-'}</td>
                        <td className="border-r border-[var(--border)] p-4 whitespace-pre-wrap">{item.dinner || '-'}</td>
                        <td className="p-4 text-[var(--primary-strong)] font-medium">{item.dinnerCooks?.join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="app-panel rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon size={20} className="text-[var(--primary-strong)]" />
              Community Calendar
            </h3>
            {canManageEvents && (
              <button 
                onClick={() => {
                  if (showEventForm) {
                    resetEventForm()
                    return
                  }
                  setShowEventForm(true)
                }}
                className="p-2 rounded-full hover:bg-[var(--surface-soft)] text-[var(--primary-strong)]"
              >
                {showEventForm ? <X size={20} /> : <Plus size={20} />}
              </button>
            )}
          </div>

          {showEventForm && (
            <form onSubmit={handleEventSubmit} className="mb-6 space-y-3 p-4 bg-[var(--surface-soft)] rounded-2xl border border-[var(--border)]">
              <input 
                className="app-input text-sm" 
                placeholder="Event Title" 
                value={eventForm.title}
                onChange={e => setEventForm({...eventForm, title: e.target.value})}
                required 
              />
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  className="app-input text-xs" 
                  value={eventForm.date}
                  onChange={e => setEventForm({...eventForm, date: e.target.value})}
                  required 
                />
                <input 
                  type="time" 
                  className="app-input text-xs" 
                  value={eventForm.time}
                  onChange={e => setEventForm({...eventForm, time: e.target.value})}
                  required 
                />
              </div>
              <select 
                className="app-input text-sm"
                value={eventForm.type}
                onChange={e => setEventForm({...eventForm, type: e.target.value as any})}
              >
                <option value="offline">In-person (Offline)</option>
                <option value="online">Online Meeting</option>
              </select>
              <input 
                className="app-input text-sm" 
                placeholder={eventForm.type === 'online' ? 'Link / ID' : 'Venue / Location'} 
                value={eventForm.type === 'online' ? eventForm.location : eventForm.venue}
                onChange={e => setEventForm(prev => eventForm.type === 'online' ? {...prev, location: e.target.value} : {...prev, venue: e.target.value})}
              />
              <textarea
                className="app-input min-h-[96px] text-sm"
                placeholder="Optional details for the email and calendar invite"
                value={eventForm.description}
                onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-3 py-2 text-xs app-muted">
                {editingEventId
                  ? 'Saving changes will update the calendar item for everyone. Only admin and overseer can edit or delete events.'
                  : 'Creating an event will email approved users, include an Add to Google Calendar link, and open Google Calendar for the admin.'}
              </div>
              <div className="flex gap-3">
                {editingEventId && (
                  <button
                    type="button"
                    onClick={resetEventForm}
                    disabled={isCreatingEvent}
                    className="app-button app-button-ghost w-full text-xs py-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancel Edit
                  </button>
                )}
                <button type="submit" disabled={isCreatingEvent} className="app-button app-button-primary w-full text-xs py-2 disabled:cursor-not-allowed disabled:opacity-70">
                {isCreatingEvent ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {editingEventId ? 'Saving Event...' : 'Creating Event...'}
                  </span>
                ) : editingEventId ? 'Save Event Changes' : 'Add Event'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="border-l-2 border-[var(--primary)] pl-4 py-1 transition-all duration-200 ease-out">
                <div className="text-xs font-bold text-[var(--primary-strong)] uppercase tracking-wider">
                  {isToday(parseISO(event.date)) ? 'Today' : isTomorrow(parseISO(event.date)) ? 'Tomorrow' : format(parseISO(event.date), 'EEE, MMM d')}
                </div>
                <div className="font-semibold text-sm">{event.title}</div>
                <div className="flex items-center gap-3 mt-1 text-[11px] app-muted">
                  <span className="flex items-center gap-1"><Clock size={12} /> {event.time}</span>
                  <span className="flex items-center gap-1">
                    {event.type === 'online' ? <Video size={12} /> : <MapPin size={12} />}
                    {event.location || event.venue}
                  </span>
                </div>
                {event.description && (
                  <div className="mt-2 text-xs app-muted">{event.description}</div>
                )}
                {event.googleCalendarUrl && (
                  <a
                    href={event.googleCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary-strong)] hover:underline"
                  >
                    <ExternalLink size={12} />
                    Add to Google Calendar
                  </a>
                )}
                {canManageEvents && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditingEvent(event)}
                      className="app-button app-button-ghost px-3 py-1.5 text-xs"
                    >
                      <Pencil size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEvent(event)}
                      className="app-button border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
            {upcomingEvents.length === 0 && <p className="app-muted text-sm">No upcoming meetings scheduled.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Eating This Month</h3>
          <p className="text-2xl font-bold text-[var(--accent-strong)]">{eatingPeopleCount}</p>
        </div>
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Cooking {isNextWeek ? 'Next Week' : 'This Week'}</h3>
          <p className="text-2xl font-bold text-[var(--primary)]">{cookingPeople.length}</p>
        </div>
      </div>

      {canSeeFullCashInDetails ? (
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
      ) : (
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-2">Cash Flow Access</h3>
          <p className="app-muted text-sm">
            Cash-in details are hidden for your role. You can still see the monthly remaining balance and outgoing expenses.
          </p>
        </div>
      )}

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
          <h3 className="mb-4 text-lg font-semibold">People Cooking {isNextWeek ? 'Next Week' : 'This Week'}</h3>
          <div className="flex flex-wrap gap-2">
            {cookingPeople.map((name) => (
              <span key={name} className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]">
                {name}
              </span>
            ))}
            {cookingPeople.length === 0 && (
              <p className="app-muted text-sm">No cooking names added for the week of {displayMenu?.week || 'the current week'} yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-3xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
          <div className="space-y-2">
            {activities
              .filter((a) => currentUser?.role === 'admin' || !/income|cash in|paid/i.test(a.action))
              .slice().reverse().slice(0, activitiesLimit).map(activity => (
              <div key={activity.id} className="app-muted text-sm">
                <span className="font-medium">{activity.user}</span> {activity.action} at {new Date(activity.timestamp).toLocaleString()}
              </div>
            ))}
            {activities.length > activitiesLimit && (
              <button onClick={() => setActivitiesLimit(prev => prev + 10)} className="text-[var(--primary)] text-sm font-medium mt-2 hover:underline">
                Show More
              </button>
            )}
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
