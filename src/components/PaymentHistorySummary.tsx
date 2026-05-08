'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { MonthlyPayment } from '@/types'
import { formatCurrency } from '@/lib/format'

interface PaymentHistoryItem {
  memberName: string
  userId?: string
  months: Array<{
    month: string
    paid: boolean
    amount: number
    paymentType: string | null
    note: string | null
    id: string
  }>
}

interface PaymentHistoryResponse {
  history: PaymentHistoryItem[]
  unpaidSummary: Record<string, string[]>
  totalPeople: number
  totalUnpaidEntries: number
}

export function PaymentHistorySummary() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PaymentHistoryResponse | null>(null)
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set())
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [allMonths, setAllMonths] = useState<string[]>([])

  useEffect(() => {
    fetchPaymentHistory()
  }, [])

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/monthly-payments/history')
      if (res.ok) {
        const responseData = await res.json()
        setData(responseData)

        // Extract all unique months and sort them
        const months = new Set<string>()
        responseData.history.forEach((person: PaymentHistoryItem) => {
          person.months.forEach((m) => {
            months.add(m.month)
          })
        })
        const sortedMonths = Array.from(months).sort().reverse()
        setAllMonths(sortedMonths)
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (memberName: string) => {
    const newSet = new Set(expandedPeople)
    if (newSet.has(memberName)) {
      newSet.delete(memberName)
    } else {
      newSet.add(memberName)
    }
    setExpandedPeople(newSet)
  }

  const togglePaymentStatus = async (paymentId: string, currentPaid: boolean, monthData: any) => {
    try {
      setUpdatingId(paymentId)

      const res = await fetch('/api/monthly-payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: paymentId,
          month: monthData.month,
          memberName: monthData.memberName,
          paymentType: monthData.paymentType,
          amount: monthData.amount,
          note: monthData.note,
          paid: !currentPaid, // Toggle payment status
        }),
      })

      if (res.ok) {
        await fetchPaymentHistory()
      }
    } catch (error) {
      console.error('Failed to update payment:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="app-panel rounded-3xl p-6">
        <p className="app-muted text-center text-sm">Loading payment history...</p>
      </div>
    )
  }

  if (!data || data.history.length === 0) {
    return (
      <div className="app-panel rounded-3xl p-6">
        <p className="app-muted text-center text-sm">No payment history available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">Payment Status Overview</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--primary-strong)]">{data.totalPeople}</p>
            <p className="app-muted text-sm">Total People</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{data.totalUnpaidEntries}</p>
            <p className="app-muted text-sm">Unpaid Entries</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{Object.keys(data.unpaidSummary).length}</p>
            <p className="app-muted text-sm">People With Pending</p>
          </div>
        </div>
      </div>

      {/* Unpaid Summary Alert */}
      {Object.keys(data.unpaidSummary).length > 0 && (
        <div className="app-panel rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="mb-3 font-semibold text-amber-900 dark:text-amber-200">Unpaid Months Summary</h3>
              <div className="space-y-2">
                {Object.entries(data.unpaidSummary).map(([person, months]) => (
                  <div key={person} className="text-sm text-amber-800 dark:text-amber-100">
                    <span className="font-medium">{person}:</span> {(months as string[]).join(', ')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History by Person */}
      <div className="space-y-3">
        {data.history.map((person) => {
          const isExpanded = expandedPeople.has(person.memberName)
          const unpaidMonths = person.months.filter((m) => !m.paid).length
          const totalAmount = person.months.reduce((sum, m) => sum + m.amount, 0)
          const paidAmount = person.months.filter((m) => m.paid).reduce((sum, m) => sum + m.amount, 0)

          return (
            <div key={person.memberName} className="app-panel rounded-3xl p-6">
              <button
                onClick={() => toggleExpanded(person.memberName)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-semibold">{person.memberName}</h3>
                    <div className="flex flex-wrap gap-4">
                      <span className="text-sm text-green-600">
                        Paid: {person.months.filter((m) => m.paid).length}
                      </span>
                      <span className={`text-sm ${unpaidMonths > 0 ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                        Unpaid: {unpaidMonths}
                      </span>
                      <span className="app-muted text-sm">Total: {formatCurrency(totalAmount)}</span>
                      <span className="text-sm text-green-600">Collected: {formatCurrency(paidAmount)}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-6 space-y-4 border-t border-[var(--border)] pt-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    {person.months.sort((a, b) => b.month.localeCompare(a.month)).map((month) => (
                      <button
                        key={month.id}
                        onClick={() =>
                          togglePaymentStatus(month.id, month.paid, {
                            ...month,
                            memberName: person.memberName,
                          })
                        }
                        disabled={updatingId === month.id}
                        className={`rounded-2xl p-4 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 ${
                          month.paid
                            ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950/30'
                            : 'border-2 border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
                        } hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold">{month.month}</p>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              {month.paymentType || 'custom'}
                            </p>
                            <p className="mt-1 font-semibold">{formatCurrency(month.amount)}</p>
                            {month.note && <p className="mt-1 text-xs italic text-gray-600 dark:text-gray-400">{month.note}</p>}
                          </div>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                              month.paid
                                ? 'bg-green-500 text-white'
                                : 'border-2 border-red-500 text-red-500'
                            }`}
                          >
                            {month.paid ? '✓' : '×'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
