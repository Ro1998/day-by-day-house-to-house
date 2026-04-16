'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  Activity,
  ApiError,
  Availability,
  Expense,
  InventoryItem,
  Menu,
  MenuSuggestion,
  MonthlyPayment,
  Notification,
  SupplyReport,
  CommunityEvent,
  User,
  UserRole,
} from '@/types'

interface DataContextType {
  expenses: Expense[]
  monthlyPayments: MonthlyPayment[]
  menus: Menu[]
  users: User[]
  activities: Activity[]
  inventoryItems: InventoryItem[]
  notifications: Notification[]
  unreadNotifications: Notification[]
  markNotificationAsRead: (id: string) => Promise<void>
  menuSuggestions: MenuSuggestion[]
  availabilities: Availability[]
  supplyReports: SupplyReport[]
  currentUser: User | null
  balance: number
  monthlyBalance: number
  loading: boolean
  isSyncing: boolean
  lastSyncTime: Date | null
  error: string | null
  notice: string | null
  addExpense: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  undoDelete: () => Promise<void>
  addMonthlyPayment: (payment: Omit<MonthlyPayment, 'id' | 'userId'>) => Promise<void>
  updateMonthlyPayment: (input: Partial<MonthlyPayment> & { id: string }) => Promise<void>
  deleteMonthlyPayment: (id: string) => Promise<void>
  updateMenu: (menu: Menu) => Promise<void>
  requestRegistrationOtp: (input: {
    name: string
    username: string
    email: string
    phone?: string
    password: string
    securityAnswers: Record<string, string>
  }) => Promise<boolean>
  verifyRegistrationOtp: (input: { email: string; otp: string }) => Promise<{ user: User | null; submitted: boolean }>
  resetPasswordWithSecurityAnswers: (input: {
    username: string
    newPassword: string
    securityAnswers: Record<string, string>
  }) => Promise<boolean>
  createAdminResetLink: (userId: string) => Promise<{ resetLink: string; expiresAt: string } | null>
  resetPasswordWithToken: (input: { token: string; newPassword: string }) => Promise<boolean>
  updateUserAccess: (input: { id: string; role: UserRole; approved: boolean; phone?: string }) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  addInventoryItem: (input: Omit<InventoryItem, 'id' | 'user' | 'userId'>) => Promise<void>
  updateInventoryItem: (input: InventoryItem) => Promise<void>
  deleteInventoryItem: (id: string) => Promise<void>
  addNotification: (input: {
    title: string
    message: string
    category?: 'general' | 'menu'
    menuData?: Menu
    emailImageDataUrl?: string
    recipientUserIds?: string[]
  }) => Promise<void>
  updateNotification: (id: string, input: { title: string; message: string }) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  addMenuSuggestion: (input: { suggestion: string; preferredDay?: string; preferredMeal?: string }) => Promise<void>
  updateMenuSuggestionStatus: (id: string, status: 'pending' | 'reviewed') => Promise<void>
  addAvailability: (input: { week: string; entries: Array<{ day: string; meal: 'lunch' | 'dinner'; available: boolean; note?: string }> }) => Promise<void>
  reviewAvailability: (ids: string[]) => Promise<void>
  addSupplyReport: (input: { title: string; category: 'grocery' | 'vegetable' | 'maintenance'; itemName?: string; message: string; status?: 'missing' | 'urgent' | 'resolved' | 'in-consideration' | 'will-take-time' }) => Promise<void>
  updateSupplyReport: (input: { id: string; status?: 'missing' | 'urgent' | 'resolved' | 'in-consideration' | 'will-take-time'; response?: string }) => Promise<void>
  events: CommunityEvent[]
  addEvent: (event: Omit<CommunityEvent, 'id' | 'createdBy'>) => Promise<void>
  login: (input: { username: string; password: string }) => Promise<{ success: boolean; pendingApproval: boolean }>
  logout: () => void
  logActivity: (action: string) => Promise<void>
}

const DataContext = createContext<DataContextType | null>(null)

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [menuSuggestions, setMenuSuggestions] = useState<MenuSuggestion[]>([])
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [supplyReports, setSupplyReports] = useState<SupplyReport[]>([])
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const authHeaders = (): Record<string, string> => (
    currentUser ? { 'x-user-id': currentUser.id } : {}
  )

  const triggerRefresh = () => setRefreshTick((tick) => tick + 1)

  const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit, timeoutMs = 15000) => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('The request took too long. Please try again.')
      }
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  const readJson = async <T,>(res: Response, fallbackMessage: string): Promise<T> => {
    let payload: T | ApiError | null = null

    try {
      payload = await res.json()
    } catch {
      payload = null
    }

    if (!res.ok) {
      const message = payload && typeof payload === 'object' && 'error' in payload
        ? payload.error
        : fallbackMessage
      throw new Error(message)
    }

    if (payload === null) {
      throw new Error(fallbackMessage)
    }

    return payload as T
  }

  useEffect(() => {
    // Safely track the component mount status to prevent memory leaks
    let isMounted = true
    let isPolling = false
    const loadData = async () => {
      if (isPolling) return
      isPolling = true
      if (isMounted && !loading) {
        setIsSyncing(true)
      }
      try {
        setError(null)

        if (!currentUser) {
          setUsers([])
          setExpenses([])
          setMonthlyPayments([])
          setMenus([])
          setActivities([])
          setInventoryItems([])
          setNotifications([])
          setMenuSuggestions([])
          setAvailabilities([])
          setSupplyReports([])
          return
        }

        const usersRes = await fetch('/api/users', {
          headers: authHeaders(),
          cache: 'no-store',
        })
        if (usersRes.ok) {
          const usersData = await readJson<User[]>(usersRes, 'Failed to load users')
          setUsers(prev => JSON.stringify(prev) === JSON.stringify(usersData) ? prev : usersData)

          const refreshedCurrentUser = currentUser
            ? usersData.find((user) => user.id === currentUser.id) ?? null
            : null

          if (currentUser && !refreshedCurrentUser) {
            setCurrentUser(null)
          } else if (
            refreshedCurrentUser &&
            JSON.stringify(refreshedCurrentUser) !== JSON.stringify(currentUser)
          ) {
            setCurrentUser(refreshedCurrentUser)
          }
        } else {
          await readJson<ApiError>(usersRes, 'Failed to load users')
        }

        const [expensesRes, paymentsRes, menusRes, activitiesRes, inventoryRes, notificationsRes, suggestionsRes, availabilitiesRes, supplyReportsRes, eventsRes] = await Promise.all([
          fetch('/api/expenses', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/monthly-payments', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/menus', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/activities', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/inventory', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/notifications', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/menu-suggestions', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/availability', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/supply-reports', { headers: authHeaders(), cache: 'no-store' }),
          fetch('/api/events', { headers: authHeaders(), cache: 'no-store' }),
        ])

        const expensesData = await readJson<Expense[]>(expensesRes, 'Failed to load expenses')
        const paymentsData = await readJson<MonthlyPayment[]>(paymentsRes, 'Failed to load monthly payments')
        const menusData = await readJson<Menu[]>(menusRes, 'Failed to load menus')
        const activitiesData = await readJson<Activity[]>(activitiesRes, 'Failed to load activities')
        const inventoryData = await readJson<InventoryItem[]>(inventoryRes, 'Failed to load inventory')
        const notificationsData = await readJson<Notification[]>(notificationsRes, 'Failed to load notifications')
        const suggestionsData = await readJson<MenuSuggestion[]>(suggestionsRes, 'Failed to load menu suggestions')
        const availabilitiesData = await readJson<Availability[]>(availabilitiesRes, 'Failed to load availability')
        const supplyReportsData = await readJson<SupplyReport[]>(supplyReportsRes, 'Failed to load supply reports')
        const eventsData = await readJson<CommunityEvent[]>(eventsRes, 'Failed to load events')

        // Check for low stock and add notifications
        if (currentUser.role === 'admin') {
          const lowStockItems = inventoryData.filter(item => item.quantity <= item.lowStockThreshold)
          for (const item of lowStockItems) {
            const existingNotification = notificationsData.find(n => n.title === `Low Stock: ${item.name}`)
            if (!existingNotification) {
              try {
                const res = await fetch('/api/notifications', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...authHeaders() },
                  body: JSON.stringify({
                    title: `Low Stock: ${item.name}`,
                    message: `${item.name} is running low. Current quantity: ${item.quantity} ${item.unit}`,
                    category: 'general',
                    userId: currentUser.id
                  }),
                })
                if (res.ok) {
                  const notification = await readJson<Notification>(res, 'Failed to create notification')
                  notificationsData.push(notification)
                }
              } catch {
                // Ignore errors for auto-generated notifications
              }
            }
          }
        }

        if (isMounted) {
          setExpenses(prev => JSON.stringify(prev) === JSON.stringify(expensesData) ? prev : expensesData)
          setMonthlyPayments(prev => JSON.stringify(prev) === JSON.stringify(paymentsData) ? prev : paymentsData)
          setMenus(prev => JSON.stringify(prev) === JSON.stringify(menusData) ? prev : menusData)
          setActivities(prev => JSON.stringify(prev) === JSON.stringify(activitiesData) ? prev : activitiesData)
          setInventoryItems(prev => JSON.stringify(prev) === JSON.stringify(inventoryData) ? prev : inventoryData)
          setNotifications(prev => JSON.stringify(prev) === JSON.stringify(notificationsData) ? prev : notificationsData)
          setMenuSuggestions(prev => JSON.stringify(prev) === JSON.stringify(suggestionsData) ? prev : suggestionsData)
          setAvailabilities(prev => JSON.stringify(prev) === JSON.stringify(availabilitiesData) ? prev : availabilitiesData)
          setSupplyReports(prev => JSON.stringify(prev) === JSON.stringify(supplyReportsData) ? prev : supplyReportsData)
          setEvents(prev => JSON.stringify(prev) === JSON.stringify(eventsData) ? prev : eventsData)
          setLastSyncTime(new Date())
          setError(null)
        }
      } catch (loadError) {
        if (isMounted) {
          const message = loadError instanceof Error ? loadError.message : 'Failed to load application data'
          setError(message)
          console.error('Failed to load data', loadError)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
          setIsSyncing(false)
        }
        isPolling = false
      }
    }

    loadData()
    const intervalId = setInterval(loadData, 2000)
    return () => {
      clearInterval(intervalId)
      isMounted = false
    }
  }, [currentUser?.id, refreshTick])

  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return

    let timeoutId: number

    const resetTimer = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        setNotice('You were signed out after 10 minutes of inactivity.')
        setCurrentUser(null)
      }, 10 * 60 * 1000)
    }

    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer))
    resetTimer()

    return () => {
      window.clearTimeout(timeoutId)
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer))
    }
  }, [currentUser])

  const balance = expenses.reduce((acc, exp) => acc + (exp.type === 'in' ? exp.amount : -exp.amount), 0)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyBalance = expenses
    .filter((expense) => expense.date.startsWith(currentMonth))
    .reduce((acc, expense) => acc + (expense.type === 'in' ? expense.amount : -expense.amount), 0)

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId'>) => {
    if (!currentUser) return

    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...expense, userId: currentUser.id }),
      })
      const newExpense = await readJson<Expense>(res, 'Failed to create expense')
      setExpenses((prev) => [...prev, newExpense])
      await logActivity(`Added ${expense.type === 'in' ? 'income' : 'expense'}: ${expense.description}`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create expense')
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      setError(null)
      setNotice(null)
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      await readJson<{ success: boolean }>(res, 'Failed to delete expense')
      const expense = expenses.find((entry) => entry.id === id)

      if (expense) {
        setDeletedExpense(expense)
        setExpenses((prev) => prev.filter((entry) => entry.id !== id))
        setNotice(`Deleted "${expense.description}". You can undo this action.`)
        await logActivity(`Deleted ${expense.type === 'in' ? 'income' : 'expense'}: ${expense.description}`)
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to delete expense')
    }
  }

  const undoDelete = async () => {
    if (!deletedExpense || !currentUser) return

    try {
      setError(null)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          date: deletedExpense.date,
          type: deletedExpense.type,
          category: deletedExpense.category,
          amount: deletedExpense.amount,
          description: deletedExpense.description,
          userId: deletedExpense.userId ?? currentUser.id,
        }),
      })
      const restoredExpense = await readJson<Expense>(res, 'Failed to restore expense')
      setExpenses((prev) => [...prev, restoredExpense])
      setDeletedExpense(null)
      setNotice(`Restored "${restoredExpense.description}".`)
      await logActivity(`Restored ${restoredExpense.type === 'in' ? 'income' : 'expense'}: ${restoredExpense.description}`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to restore expense')
    }
  }

  const addMonthlyPayment = async (payment: Omit<MonthlyPayment, 'id' | 'userId'>) => {
    if (!currentUser) return

    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/monthly-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...payment, userId: currentUser.id }),
      })
      const newPayment = await readJson<MonthlyPayment>(res, 'Failed to create monthly payment')
      setMonthlyPayments((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.id === newPayment.id)
        const next = existingIndex >= 0
          ? prev.map((entry) => entry.id === newPayment.id ? newPayment : entry)
          : [...prev, newPayment]

        return next.sort((a, b) => (
          `${b.month}-${b.memberName}`.localeCompare(`${a.month}-${a.memberName}`)
        ))
      })

      if (newPayment.paid) {
        const cashInExpense: Expense = {
          id: newPayment.expenseId ?? `payment-${newPayment.id}`,
          date: `${newPayment.month}-01`,
          type: 'in',
          category: 'food money',
          amount: newPayment.amount,
          description: `Monthly food money paid by ${newPayment.memberName} for ${newPayment.month}${newPayment.note ? ` (${newPayment.note})` : ''}`,
          user: currentUser.name,
          userId: currentUser.id,
        }
        setExpenses((prev) => {
          const existingIndex = prev.findIndex((entry) => entry.id === cashInExpense.id)
          if (existingIndex >= 0) {
            return prev.map((entry) => entry.id === cashInExpense.id ? cashInExpense : entry)
          }

          return [...prev, cashInExpense]
        })
      }

      await logActivity(
        `${newPayment.paid ? 'Marked paid' : 'Added reminder'} for ${newPayment.memberName} (${newPayment.month})`,
      )
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create monthly payment')
    }
  }

  const updateMonthlyPayment = async (input: Partial<MonthlyPayment> & { id: string }) => {
    if (!currentUser) return
    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/monthly-payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(input),
      })
      const updated = await readJson<MonthlyPayment>(res, 'Failed to update monthly payment')
      setMonthlyPayments((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry))
      await logActivity(`Updated monthly payment for ${updated.memberName} (${updated.month})`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update monthly payment')
    }
  }

  const deleteMonthlyPayment = async (id: string) => {
    if (!currentUser) return
    try {
      setError(null)
      setNotice(null)
      const res = await fetch(`/api/monthly-payments?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      await readJson<{ success: boolean }>(res, 'Failed to delete monthly payment')
      const payment = monthlyPayments.find(p => p.id === id)
      setMonthlyPayments((prev) => prev.filter((entry) => entry.id !== id))
      if (payment) {
        setNotice(`Deleted monthly payment for ${payment.memberName}.`)
        await logActivity(`Deleted monthly payment for ${payment.memberName} (${payment.month})`)
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to delete monthly payment')
    }
  }

  const updateMenu = async (menu: Menu) => {
    if (!currentUser) return

    const existing = menus.find((entry) => entry.week === menu.week)
    const method = existing ? 'PUT' : 'POST'
    const body = existing ? { ...menu, id: existing.id } : { ...menu, userId: currentUser.id }

    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/menus', {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      })
      const updatedMenu = await readJson<Menu>(res, 'Failed to save menu')
      setMenus((prev) => {
        const index = prev.findIndex((entry) => entry.week === menu.week)
        if (index >= 0) {
          const next = [...prev]
          next[index] = updatedMenu
          return next
        }

        return [...prev, updatedMenu]
      })
      await logActivity(`Updated menu for week ${menu.week}`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to save menu')
    }
  }

  const requestRegistrationOtp = async (input: {
    name: string
    username: string
    email: string
    phone?: string
    password: string
    securityAnswers: Record<string, string>
  }) => {
    const trimmedName = input.name.trim()
    const trimmedUsername = input.username.trim().toLowerCase()
    const trimmedEmail = input.email.trim().toLowerCase()
    const trimmedPhone = input.phone?.trim() || ''
    if (!trimmedName || !trimmedUsername || !trimmedEmail || !input.password.trim()) {
      setError('Please fill in name, username, email, and password before creating a user.')
      return false
    }

    try {
      setError(null)
      setNotice(null)
      const res = await fetchWithTimeout('/api/auth/register/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          username: trimmedUsername,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          password: input.password,
          securityAnswers: input.securityAnswers,
        }),
      })
      await readJson<{ success: boolean }>(res, 'Failed to send verification code')
      setNotice(`We sent a verification code to ${trimmedEmail}. Enter it to finish your registration.`)
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to send verification code')
      return false
    }
  }

  const verifyRegistrationOtp = async (input: { email: string; otp: string }) => {
    const trimmedEmail = input.email.trim().toLowerCase()
    if (!trimmedEmail || !input.otp.trim()) {
      setError('Please enter your email and the verification code.')
      return { user: null, submitted: false }
    }

    try {
      setError(null)
      setNotice(null)
      const res = await fetchWithTimeout('/api/auth/register/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          otp: input.otp.trim(),
        }),
      })
      const user = await readJson<User>(res, 'Failed to verify registration code')
      if (user.approved) {
        setCurrentUser(user)
        setNotice('Your admin account is ready. You are now signed in.')
        return { user, submitted: true }
      }

      setNotice('Email verified. Your account request was sent to the admin for approval.')
      return { user: null, submitted: true }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to verify registration code')
      return { user: null, submitted: false }
    }
  }

  const resetPasswordWithSecurityAnswers = async (input: {
    username: string
    newPassword: string
    securityAnswers: Record<string, string>
  }) => {
    if (!input.username.trim() || !input.newPassword.trim()) {
      setError('Please fill in username, new password, and your security answers.')
      return false
    }

    try {
      setError(null)
      setNotice(null)
      const res = await fetchWithTimeout('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: input.username.trim().toLowerCase(),
          newPassword: input.newPassword,
          securityAnswers: input.securityAnswers,
        }),
      })
      await readJson<{ success: boolean }>(res, 'Failed to reset password')
      setNotice('Password reset successful. You can sign in with your new password now.')
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to reset password')
      return false
    }
  }

  const createAdminResetLink = async (userId: string) => {
    if (!currentUser) return null

    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/auth/admin-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId }),
      })
      const payload = await readJson<{ resetToken: string; expiresAt: string }>(res, 'Failed to create reset link')
      const resetLink = `${window.location.origin}/?resetToken=${payload.resetToken}`
      setNotice('Reset link created successfully.')
      return { resetLink, expiresAt: payload.expiresAt }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create reset link')
      return null
    }
  }

  const resetPasswordWithToken = async (input: { token: string; newPassword: string }) => {
    if (!input.token.trim() || !input.newPassword.trim()) {
      setError('A reset token and new password are required.')
      return false
    }

    try {
      setError(null)
      setNotice(null)
      const res = await fetchWithTimeout('/api/auth/reset-with-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      await readJson<{ success: boolean }>(res, 'Failed to reset password with link')
      setNotice('Password reset successful. Please sign in with your new password.')
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to reset password with link')
      return false
    }
  }

  const updateUserAccess = async (input: { id: string; role: UserRole; approved: boolean; phone?: string }) => {
    if (!currentUser) return

    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(input),
      })
      const updatedUser = await readJson<User>(res, 'Failed to update user access')
      setUsers((prev) => prev.map((entry) => entry.id === updatedUser.id ? updatedUser : entry))

      if (currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser)
      }

      setNotice(`Updated access for ${updatedUser.name}.`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update user access')
    }
  }

  const deleteUser = async (id: string) => {
    if (!currentUser) return

    try {
      setError(null)
      setNotice(null)
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      await readJson<{ success: boolean }>(res, 'Failed to delete user')
      const removedUser = users.find((entry) => entry.id === id)
      setUsers((prev) => prev.filter((entry) => entry.id !== id))
      if (removedUser) {
        setNotice(`Deleted user ${removedUser.name}.`)
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to delete user')
    }
  }

  const addInventoryItem = async (input: Omit<InventoryItem, 'id' | 'user' | 'userId'>) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...input, userId: currentUser.id }),
      })
      const item = await readJson<InventoryItem>(res, 'Failed to add inventory item')
      setInventoryItems((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to add inventory item')
    }
  }

  const updateInventoryItem = async (input: InventoryItem) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(input),
      })
      const item = await readJson<InventoryItem>(res, 'Failed to update inventory item')
      setInventoryItems((prev) => prev.map((entry) => entry.id === item.id ? item : entry))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update inventory item')
    }
  }

  const deleteInventoryItem = async (id: string) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch(`/api/inventory?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      await readJson<{ success: boolean }>(res, 'Failed to delete inventory item')
      setInventoryItems((prev) => prev.filter((entry) => entry.id !== id))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to delete inventory item')
    }
  }

  const addNotification = async (input: {
    title: string
    message: string
    category?: 'general' | 'menu'
    menuData?: Menu
    emailImageDataUrl?: string
    recipientUserIds?: string[]
  }) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...input, userId: currentUser.id }),
      })
      const notification = await readJson<Notification>(res, 'Failed to create notification')
      setNotifications((prev) => [notification, ...prev])
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create notification')
    }
  }

  const updateNotification = async (id: string, input: { title: string; message: string }) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id, ...input }),
      })
      const updated = await readJson<Notification>(res, 'Failed to update notification')
      setNotifications((prev) => prev.map((n) => n.id === id ? updated : n))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update notification')
    }
  }

  const deleteNotification = async (id: string) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      await readJson<{ success: boolean }>(res, 'Failed to delete notification')
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to delete notification')
    }
  }

  const markNotificationAsRead = (id: string) => {
    if (!currentUser) return Promise.resolve()
    return (async () => {
      try {
        const res = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ id, markRead: true }),
        })
        const updated = await readJson<Notification>(res, 'Failed to mark notification as read')
        setNotifications((prev) => prev.map((entry) => entry.id === updated.id ? updated : entry))
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to mark notification as read')
      }
    })()
  }

  const addMenuSuggestion = async (input: { suggestion: string; preferredDay?: string; preferredMeal?: string }) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/menu-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...input, userId: currentUser.id }),
      })
      const suggestion = await readJson<MenuSuggestion>(res, 'Failed to create menu suggestion')
      setMenuSuggestions((prev) => [suggestion, ...prev])
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create menu suggestion')
    }
  }

  const updateMenuSuggestionStatus = async (id: string, status: 'pending' | 'reviewed') => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/menu-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id, status }),
      })
      const suggestion = await readJson<MenuSuggestion>(res, 'Failed to update menu suggestion')
      setMenuSuggestions((prev) => prev.map((entry) => entry.id === suggestion.id ? suggestion : entry))
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update menu suggestion')
    }
  }

  const addAvailability = async (input: { week: string; entries: Array<{ day: string; meal: 'lunch' | 'dinner'; available: boolean; note?: string }> }) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...input, userId: currentUser.id }),
      })
      const createdAvailabilities = await readJson<Availability[]>(res, 'Failed to add availability')
      setAvailabilities((prev) => [...createdAvailabilities, ...prev])
      triggerRefresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to add availability')
    }
  }

  const reviewAvailability = async (ids: string[]) => {
    if (!currentUser || ids.length === 0) return
    try {
      setError(null)
      const res = await fetch('/api/availability', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ids }),
      })
      await readJson<{ success: boolean }>(res, 'Failed to review availability')
      setAvailabilities((prev) => prev.filter((entry) => !ids.includes(entry.id)))
      triggerRefresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to review availability')
    }
  }

  const addSupplyReport = async (input: { title: string; category: 'grocery' | 'vegetable' | 'maintenance'; itemName?: string; message: string; status?: 'missing' | 'urgent' | 'resolved' | 'in-consideration' | 'will-take-time' }) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/supply-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...input, userId: currentUser.id }),
      })
      const report = await readJson<SupplyReport>(res, 'Failed to create supply report')
      setSupplyReports((prev) => [report, ...prev])
      triggerRefresh()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create supply report')
    }
  }

  const updateSupplyReport = async (input: { id: string; status?: 'missing' | 'urgent' | 'resolved' | 'in-consideration' | 'will-take-time'; response?: string }) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/supply-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(input),
      })
      const report = await readJson<SupplyReport>(res, 'Failed to update supply report')
      setSupplyReports((prev) => prev.map((entry) => entry.id === report.id ? report : entry))
      triggerRefresh()

      if (input.status === 'resolved' && (report as any).createdBy) {
        await addNotification({
          title: `Resolved: ${report.title}`,
          message: `@[${(report as any).createdBy}] Your report has been resolved. ${report.response ? `Note: ${report.response}` : ''}`,
          category: 'general'
        })
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to update supply report')
    }
  }

  const addEvent = async (event: Omit<CommunityEvent, 'id' | 'createdBy'>) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...event, createdBy: currentUser.name }),
      })
      const newEvent = await readJson<CommunityEvent>(res, 'Failed to create event')
      setEvents((prev) => [...prev, newEvent].sort((a, b) => a.date.localeCompare(b.date)))
      
      // Auto-notify everyone about the new event
      await addNotification({
        title: `New Event: ${event.title}`,
        message: `${event.title} scheduled for ${event.date} at ${event.time}. Location: ${event.location || event.venue || 'TBD'}`,
        category: 'general'
      })
      
      await logActivity(`Scheduled event: ${event.title} on ${event.date}`)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create event')
    }
  }

  const login = async (input: { username: string; password: string }) => {
    try {
      setError(null)
      setNotice(null)
      const res = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: input.username.trim().toLowerCase(), password: input.password }),
      })
      const user = await readJson<User>(res, 'Failed to sign in')
      setCurrentUser(user)
      return { success: true, pendingApproval: false }
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Failed to sign in'
      setError(message)
      return {
        success: false,
        pendingApproval: message === 'Your account is waiting for admin approval.',
      }
    }
  }

  const logout = () => {
    setNotice(null)
    setCurrentUser(null)
  }

  const logActivity = async (action: string) => {
    if (!currentUser) return

    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ userId: currentUser.id, action }),
    })

    if (res.ok) {
      const activity = await res.json()
      setActivities((prev) => [activity, ...prev])
    }
  }

  const unreadNotifications = currentUser
    ? notifications.filter((notification) => !(notification.readByUserIds ?? []).includes(currentUser.id))
    : []

  return (
    <DataContext.Provider value={{
      expenses,
      monthlyPayments,
      menus,
      users,
      activities,
      inventoryItems,
      notifications,
      unreadNotifications,
      markNotificationAsRead,
      menuSuggestions,
      availabilities,
      supplyReports,
      currentUser,
      events,
      addEvent,
      balance,
      monthlyBalance,
      loading,
      isSyncing,
      lastSyncTime,
      error,
      notice,
      addExpense,
      deleteExpense,
      undoDelete,
      addMonthlyPayment,
      updateMonthlyPayment,
      deleteMonthlyPayment,
      updateMenu,
      requestRegistrationOtp,
      verifyRegistrationOtp,
      resetPasswordWithSecurityAnswers,
      createAdminResetLink,
      resetPasswordWithToken,
      updateUserAccess,
      deleteUser,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      addNotification,
      updateNotification,
      deleteNotification,
      addMenuSuggestion,
      updateMenuSuggestionStatus,
      addAvailability,
      reviewAvailability,
      addSupplyReport,
      updateSupplyReport,
      login,
      logout,
      logActivity,
    }}
    >
      {children}
    </DataContext.Provider>
  )
}
