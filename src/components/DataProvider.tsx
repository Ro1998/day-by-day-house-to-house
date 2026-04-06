'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Activity, ApiError, Expense, Menu, MonthlyPayment, User } from '@/types'

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
  addExpense: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  undoDelete: () => void
  addMonthlyPayment: (payment: Omit<MonthlyPayment, 'id' | 'userId'>) => Promise<void>
  updateMenu: (menu: Menu) => Promise<void>
  createUser: (name: string) => Promise<User | null>
  login: (user: User) => void
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
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null

    const savedUser = localStorage.getItem('currentUser')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [budget, setBudget] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null)

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
        const [expensesRes, paymentsRes, menusRes, usersRes, activitiesRes] = await Promise.all([
          fetch('/api/expenses'),
          fetch('/api/monthly-payments'),
          fetch('/api/menus'),
          fetch('/api/users'),
          fetch('/api/activities')
        ])
        const expensesData = await readJson<Expense[]>(expensesRes, 'Failed to load expenses')
        const paymentsData = await readJson<MonthlyPayment[]>(paymentsRes, 'Failed to load monthly payments')
        const menusData = await readJson<Menu[]>(menusRes, 'Failed to load menus')
        const usersData = await readJson<User[]>(usersRes, 'Failed to load users')
        const activitiesData = await readJson<Activity[]>(activitiesRes, 'Failed to load activities')

        setExpenses(expensesData)
        setMonthlyPayments(paymentsData)
        setMenus(menusData)
        setUsers(usersData)
        setActivities(activitiesData)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load application data'
        setError(message)
        console.error('Failed to load data', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser))
    else localStorage.removeItem('currentUser')
  }, [currentUser])

  const balance = expenses.reduce((acc, exp) => acc + (exp.type === 'in' ? exp.amount : -exp.amount), 0)

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId'>) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expense, userId: currentUser.id })
      })
      const newExpense = await readJson<Expense>(res, 'Failed to create expense')
      setExpenses(prev => [...prev, newExpense])
      await logActivity(`Added expense: ${expense.description}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create expense')
    }
  }

  const deleteExpense = async (id: string) => {
    try {
      setError(null)
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      await readJson<{ success: boolean }>(res, 'Failed to delete expense')
      const expense = expenses.find(e => e.id === id)
      if (expense) {
        setDeletedExpense(expense)
        setExpenses(prev => prev.filter(e => e.id !== id))
        await logActivity(`Deleted expense: ${expense.description}`)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete expense')
    }
  }

  const undoDelete = () => {
    if (deletedExpense) {
      // Note: Undo would require re-adding to DB, but for simplicity, just local
      setExpenses(prev => [...prev, deletedExpense])
      setDeletedExpense(null)
    }
  }

  const addMonthlyPayment = async (payment: Omit<MonthlyPayment, 'id' | 'userId'>) => {
    if (!currentUser) return
    try {
      setError(null)
      const res = await fetch('/api/monthly-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payment, userId: currentUser.id })
      })
      const newPayment = await readJson<MonthlyPayment>(res, 'Failed to create monthly payment')
      setMonthlyPayments(prev => [...prev, newPayment])
      await logActivity(`Added monthly payment for ${payment.month}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create monthly payment')
    }
  }

  const updateMenu = async (menu: Menu) => {
    if (!currentUser) return
    const existing = menus.find(m => m.week === menu.week)
    const method = existing ? 'PUT' : 'POST'
    const body = existing ? { ...menu, id: existing.id } : { ...menu, userId: currentUser.id }
    try {
      setError(null)
      const res = await fetch('/api/menus', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const updatedMenu = await readJson<Menu>(res, 'Failed to save menu')
      setMenus(prev => {
        const index = prev.findIndex(m => m.week === menu.week)
        if (index >= 0) {
          const newMenus = [...prev]
          newMenus[index] = updatedMenu
          return newMenus
        } else {
          return [...prev, updatedMenu]
        }
      })
      await logActivity(`Updated menu for week ${menu.week}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save menu')
    }
  }

  const createUser = async (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a name before creating a user.')
      return null
    }

    try {
      setError(null)
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          role: users.length === 0 ? 'admin' : 'user',
        }),
      })
      const user = await readJson<User>(res, 'Failed to create user')
      setUsers(prev => [...prev, user])
      setCurrentUser(user)
      return user
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user')
      return null
    }
  }

  const login = (user: User) => {
    setCurrentUser(user)
  }

  const logout = () => {
    setCurrentUser(null)
  }

  const logActivity = async (action: string) => {
    if (currentUser) {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, action })
      })
      if (res.ok) {
        const activity = await res.json()
        setActivities(prev => [activity, ...prev])
      }
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
      addExpense,
      deleteExpense,
      undoDelete,
      addMonthlyPayment,
      updateMenu,
      createUser,
      login,
      logout,
      logActivity,
    }}>
      {children}
    </DataContext.Provider>
  )
}
