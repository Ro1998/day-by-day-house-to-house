import type { Expense } from '@/types'

export interface MonthlyCashFlowSummary {
  monthKey: string
  cashIn: number
  cashOut: number
  openingBalance: number
  closingBalance: number
  totalAvailable: number
}

export const getPreviousMonthKey = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const getExpenseMonthKey = (expense: Expense) => expense.date.slice(0, 7)

export const getMonthlyCashFlowSummaries = (expenses: Expense[]) => {
  const entriesByMonth = expenses.reduce((map, expense) => {
    const monthKey = getExpenseMonthKey(expense)
    const existing = map.get(monthKey) ?? { cashIn: 0, cashOut: 0 }

    if (expense.type === 'in') {
      existing.cashIn += expense.amount
    } else {
      existing.cashOut += expense.amount
    }

    map.set(monthKey, existing)
    return map
  }, new Map<string, { cashIn: number; cashOut: number }>())

  let runningBalance = 0

  return Array.from(entriesByMonth.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, totals]) => {
      const openingBalance = runningBalance
      const totalAvailable = openingBalance + totals.cashIn
      const closingBalance = totalAvailable - totals.cashOut
      runningBalance = closingBalance

      return {
        monthKey,
        cashIn: totals.cashIn,
        cashOut: totals.cashOut,
        openingBalance,
        closingBalance,
        totalAvailable,
      }
    })
}

export const getMonthCashFlowSummary = (expenses: Expense[], monthKey: string): MonthlyCashFlowSummary => {
  const summaries = getMonthlyCashFlowSummaries(expenses)
  const existing = summaries.find((summary) => summary.monthKey === monthKey)

  if (existing) return existing

  const openingBalance = expenses
    .filter((expense) => getExpenseMonthKey(expense) < monthKey)
    .reduce((sum, expense) => sum + (expense.type === 'in' ? expense.amount : -expense.amount), 0)

  return {
    monthKey,
    cashIn: 0,
    cashOut: 0,
    openingBalance,
    closingBalance: openingBalance,
    totalAvailable: openingBalance,
  }
}
