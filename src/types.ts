export type UserRole = 'admin' | 'coordinator' | 'user'

export interface Expense {
  id: string
  date: string
  type: 'in' | 'out'
  category: string
  amount: number
  description: string
  user: string
  userId?: string
}

export interface MonthlyPayment {
  id: string
  month: string
  paid: boolean
  amount: number
  memberName: string
  reminderSent?: boolean
  expenseId?: string | null
  user: string
  userId?: string
  createdAt?: string
}

export interface MenuItem {
  day: string
  lunch: string
  dinner: string
  lunchCooks: string[]
  dinnerCooks: string[]
}

export interface Menu {
  id?: string
  week: string // start date
  items: MenuItem[]
  purchasers: string[]
  userId?: string
  user?: string
  createdAt?: string
}

export interface User {
  id: string
  name: string
  role: UserRole
  approved: boolean
}

export interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
  userId?: string
}

export interface ApiError {
  error: string
}
