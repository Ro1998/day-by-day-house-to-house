export interface Expense {
  id: string
  date: string
  type: 'in' | 'out'
  category: string
  amount: number
  description: string
  user: string
}

export interface MonthlyPayment {
  id: string
  month: string
  paid: boolean
  amount: number
  user: string
}

export interface MenuItem {
  day: string
  lunch: string
  dinner: string
  lunchCooks: string[]
  dinnerCooks: string[]
}

export interface Menu {
  week: string // start date
  items: MenuItem[]
  purchasers: string[]
}

export interface User {
  id: string
  name: string
  role: string
}

export interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
}