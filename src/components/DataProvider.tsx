'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Activity, ApiError, Expense, Menu, MonthlyPayment, User, UserRole } from '@/types'

interface DataContextType {
  expenses: Expense[]
  monthlyPayments: MonthlyPayment[]
  menus: Menu[]
  users: User[]
  activities: Activity[]
  currentUser: User | null
  balance: number
  budget: number
  loading: boolean
  error: string | null
  notice: string | null
  addExpense: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  undoDelete: () => Promise<void>
  addMonthlyPayment: (payment: Omit<MonthlyPayment, 'id' | 'userId'>) => Promise<void>
  updateMenu: (menu: Menu) => Promise<void>
  createUser: (input: {
    name: string
    username: string
    password: string
    securityAnswers: Record<string, string>
  }) => Promise<User | null>
  resetPasswordWithSecurityAnswers: (input: {
    username: string
    newPassword: string
    securityAnswers: Record<string, string>
  }) => Promise<boolean>
  createAdminResetLink: (userId: string) => Promise<{ resetLink: string; expiresAt: string } | null>
  resetPasswordWithToken: (input: { token: string; newPassword: string }) => Promise<boolean>
  updateUserAccess: (input: { id: string; role: UserRole; approved: boolean }) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  login: (input: { username: string; password: string }) => Promise<boolean>
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
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [budget] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null)

  const authHeaders = (): Record<string, string> => (
    currentUser ? { 'x-user-id': currentUser.id } : {}
  )

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
    const loadData = async () => {
      try {
        setError(null)

        if (!currentUser) {
          setUsers([])
          setExpenses([])
          setMonthlyPayments([])
          setMenus([])
          setActivities([])
          return
        }

        const usersRes = await fetch('/api/users', {
          headers: authHeaders(),
        })
        if (usersRes.ok) {
          const usersData = await readJson<User[]>(usersRes, 'Failed to load users')
          setUsers(usersData)

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
          setUsers([])
        }

        const [expensesRes, paymentsRes, menusRes, activitiesRes] = await Promise.all([
          fetch('/api/expenses', { headers: authHeaders() }),
          fetch('/api/monthly-payments', { headers: authHeaders() }),
          fetch('/api/menus', { headers: authHeaders() }),
          fetch('/api/activities', { headers: authHeaders() }),
        ])

        const expensesData = await readJson<Expense[]>(expensesRes, 'Failed to load expenses')
        const paymentsData = await readJson<MonthlyPayment[]>(paymentsRes, 'Failed to load monthly payments')
        const menusData = await readJson<Menu[]>(menusRes, 'Failed to load menus')
        const activitiesData = await readJson<Activity[]>(activitiesRes, 'Failed to load activities')

        setExpenses(expensesData)
        setMonthlyPayments(paymentsData)
        setMenus(menusData)
        setActivities(activitiesData)
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load application data'
        setError(message)
        console.error('Failed to load data', loadError)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentUser?.id])

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

  const createUser = async (input: {
    name: string
    username: string
    password: string
    securityAnswers: Record<string, string>
  }) => {
    const trimmedName = input.name.trim()
    const trimmedUsername = input.username.trim().toLowerCase()
    if (!trimmedName || !trimmedUsername || !input.password.trim()) {
      setError('Please fill in name, username, and password before creating a user.')
      return null
    }

    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          username: trimmedUsername,
          password: input.password,
          securityAnswers: input.securityAnswers,
        }),
      })
      const user = await readJson<User>(res, 'Failed to create user')

      if (user.approved) {
        setCurrentUser(user)
        setNotice('Your admin account is ready. You are now signed in.')
        return user
      }

      setNotice('Account request submitted. Ask an admin to approve your access and assign your role.')
      return null
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to create user')
      return null
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
      const res = await fetch('/api/auth/forgot-password', {
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
      const res = await fetch('/api/auth/reset-with-token', {
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

  const updateUserAccess = async (input: { id: string; role: UserRole; approved: boolean }) => {
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

  const login = async (input: { username: string; password: string }) => {
    try {
      setError(null)
      setNotice(null)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: input.username.trim().toLowerCase(), password: input.password }),
      })
      const user = await readJson<User>(res, 'Failed to sign in')
      setCurrentUser(user)
      return true
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Failed to sign in')
      return false
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

  return (
    <DataContext.Provider value={{
      expenses,
      monthlyPayments,
      menus,
      users,
      activities,
      currentUser,
      balance,
      budget,
      loading,
      error,
      notice,
      addExpense,
      deleteExpense,
      undoDelete,
      addMonthlyPayment,
      updateMenu,
      createUser,
      resetPasswordWithSecurityAnswers,
      createAdminResetLink,
      resetPasswordWithToken,
      updateUserAccess,
      deleteUser,
      login,
      logout,
      logActivity,
    }}
    >
      {children}
    </DataContext.Provider>
  )
}
