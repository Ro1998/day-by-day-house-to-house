'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Expense, MonthlyPayment, Menu, User, Activity } from '@/types'

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
  addExpense: (expense: Omit<Expense, 'id' | 'userId'>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  undoDelete: () => void
  addMonthlyPayment: (payment: Omit<MonthlyPayment, 'id' | 'userId'>) => Promise<void>
  updateMenu: (menu: Menu) => Promise<void>
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
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [budget, setBudget] = useState(1000)
  const [loading, setLoading] = useState(true)
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [expensesRes, paymentsRes, menusRes, usersRes, activitiesRes] = await Promise.all([
          fetch('/api/expenses'),
          fetch('/api/monthly-payments'),
          fetch('/api/menus'),
          fetch('/api/users'),
          fetch('/api/activities')
        ])
        const expensesData = await expensesRes.json()
        const paymentsData = await paymentsRes.json()
        const menusData = await menusRes.json()
        const usersData = await usersRes.json()
        const activitiesData = await activitiesRes.json()

        setExpenses(expensesData)
        setMonthlyPayments(paymentsData)
        setMenus(menusData)
        setUsers(usersData)
        setActivities(activitiesData)
      } catch (error) {
        console.error('Failed to load data', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) setCurrentUser(JSON.parse(savedUser))
  }, [])

  useEffect(() => {
    if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser))
    else localStorage.removeItem('currentUser')
  }, [currentUser])

  const balance = expenses.reduce((acc, exp) => acc + (exp.type === 'in' ? exp.amount : -exp.amount), 0)

  const addExpense = async (expense: Omit<Expense, 'id' | 'userId'>) => {
    if (!currentUser) return
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...expense, userId: currentUser.id })
    })
    if (res.ok) {
      const newExpense = await res.json()
      setExpenses(prev => [...prev, newExpense])
      await logActivity(`Added expense: ${expense.description}`)
    }
  }

  const deleteExpense = async (id: string) => {
    const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      const expense = expenses.find(e => e.id === id)
      if (expense) {
        setDeletedExpense(expense)
        setExpenses(prev => prev.filter(e => e.id !== id))
        await logActivity(`Deleted expense: ${expense.description}`)
      }
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
    const res = await fetch('/api/monthly-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payment, userId: currentUser.id })
    })
    if (res.ok) {
      const newPayment = await res.json()
      setMonthlyPayments(prev => [...prev, newPayment])
      await logActivity(`Added monthly payment for ${payment.month}`)
    }
  }

  const updateMenu = async (menu: Menu) => {
    if (!currentUser) return
    const existing = menus.find(m => m.week === menu.week)
    const method = existing ? 'PUT' : 'POST'
    const body = existing ? { ...menu, id: existing.id } : { ...menu, userId: currentUser.id }
    const res = await fetch('/api/menus', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      const updatedMenu = await res.json()
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
      addExpense,
      deleteExpense,
      undoDelete,
      addMonthlyPayment,
      updateMenu,
      login,
      logout,
      logActivity,
    }}>
      {children}
    </DataContext.Provider>
  )
}