export type UserRole = 'admin' | 'coordinator' | 'overseer' | 'user'

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
  paymentType?: 'both-meals' | 'one-meal' | 'per-meal' | 'custom'
  note?: string | null
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
  username?: string | null
  email?: string | null
  phone?: string | null
  passwordResetTokenExpiresAt?: string | null
  role: UserRole
  approved: boolean
}

export interface InventoryItem {
  id: string
  name: string
  category: 'grocery' | 'vegetable'
  quantity: number
  unit: string
  lowStockThreshold: number
  lastPurchasedAt?: string | null
  lastPrice?: number | null
  note?: string | null
  user: string
  userId?: string
}

export interface Notification {
  id: string
  title: string
  message: string
  category: 'general' | 'menu'
  createdBy: string
  createdById?: string
  recipientUserIds?: string[]
  readByUserIds?: string[]
  createdAt: string
}

export interface MenuSuggestion {
  id: string
  suggestion: string
  preferredDay?: string | null
  preferredMeal?: string | null
  status: 'pending' | 'reviewed'
  user: string
  userId?: string
  createdAt: string
}

export interface Availability {
  id: string
  week: string
  day: string
  meal: 'lunch' | 'dinner'
  available: boolean
  note?: string | null
  user: string
  userId?: string
  createdAt: string
}

export interface SupplyReport {
  id: string
  title: string
  category: 'grocery' | 'vegetable' | 'maintenance'
  itemName?: string | null
  message: string
  status: 'missing' | 'urgent' | 'resolved' | 'in-consideration' | 'will-take-time'
  response?: string | null
  createdBy: string
  createdById?: string
  createdAt: string
  updatedAt: string
}

export interface CommunityEvent {
  id: string
  title: string
  date: string
  time: string
  type: 'online' | 'offline'
  location?: string | null
  venue?: string | null
  description?: string | null
  createdBy: string
  createdById?: string
  createdAt?: string
  googleCalendarUrl?: string
}

export interface CommunityEventInput {
  title: string
  date: string
  time: string
  type: 'online' | 'offline'
  location?: string | null
  venue?: string | null
  description?: string | null
}

export interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
  userId?: string
}

export type PersonalMoneyKind = 'income' | 'expense' | 'received' | 'given' | 'receivable' | 'settled'

export interface PersonalMoneyEntry {
  id: string
  date: string
  month: string
  year: string
  kind: PersonalMoneyKind
  category: string
  amount: number
  counterparty?: string | null
  description: string
  createdBy: string
  createdById?: string
  createdAt: string
}

export type BookMoneyType = 'HWMR' | 'LS'

export interface BookMoneyRecord {
  id: string
  month: string
  year: string
  bookType: BookMoneyType
  bookName: string
  priceLabel: string
  unitPrice: number
  englishPrice: number
  hindiPrice: number
  englishVolumes: number
  hindiVolumes: number
  mk1English: number
  mk1Hindi: number
  mk2English: number
  mk2Hindi: number
  knEnglish: number
  knHindi: number
  mk1PaidAmount: number
  mk1PaidMethod?: string | null
  mk1PaidBy?: string | null
  mk1PaidAt?: string | null
  mk2PaidAmount: number
  mk2PaidMethod?: string | null
  mk2PaidBy?: string | null
  mk2PaidAt?: string | null
  knPaidAmount: number
  knPaidMethod?: string | null
  knPaidBy?: string | null
  knPaidAt?: string | null
  mk1Settled: boolean
  mk2Settled: boolean
  knSettled: boolean
  deadline?: string | null
  note?: string | null
  southDelhiSettled: boolean
  settlementNote?: string | null
  createdBy: string
  createdById?: string
  createdAt: string
}

export interface ApiError {
  error: string
}
