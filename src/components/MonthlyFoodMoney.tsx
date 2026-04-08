'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useData } from '@/components/DataProvider'
import { formatCurrency } from '@/lib/format'
import { MoreVertical, Trash2 } from 'lucide-react'
import type { MonthlyPayment } from '@/types'

type PaymentType = 'both-meals' | 'one-meal' | 'per-meal' | 'custom'

const PAYMENT_TYPE_OPTIONS: Array<{ value: PaymentType; label: string }> = [
  { value: 'both-meals', label: 'Both meals' },
  { value: 'one-meal', label: 'One meal' },
  { value: 'per-meal', label: 'Per meal' },
  { value: 'custom', label: 'Custom amount' },
]

const getSuggestedAmount = (paymentType: PaymentType, mealCount: number) => {
  switch (paymentType) {
    case 'both-meals':
      return 2500
    case 'one-meal':
      return 1250
    case 'per-meal':
      return mealCount > 0 ? mealCount : 0
    default:
      return 0
  }
}

const getPaymentTypeLabel = (paymentType?: string | null) => {
  switch (paymentType) {
    case 'both-meals':
      return 'Both meals'
    case 'one-meal':
      return 'One meal'
    case 'per-meal':
      return 'Per meal'
    default:
      return 'Custom'
  }
}

export function MonthlyFoodMoney() {
  const { monthlyPayments, addMonthlyPayment, updateMonthlyPayment, deleteMonthlyPayment, currentUser, users } = useData()
  const canManageEntries = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const approvedMembers = useMemo(
    () => users.filter((user) => user.approved).sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  )
  const knownNames = useMemo(
    () => [...new Set([
      ...approvedMembers.map((user) => user.name),
      ...monthlyPayments.map((payment) => payment.memberName),
    ])].filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [approvedMembers, monthlyPayments],
  )
  const [form, setForm] = useState({
    month: currentMonth,
    memberName: '',
    paymentType: 'both-meals' as PaymentType,
    mealCount: '',
    amount: '2500',
    note: '',
  })
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<MonthlyPayment & { amountStr: string; mealCountStr: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MonthlyPayment | null>(null)

  const monthEntries = useMemo(
    () => monthlyPayments
      .filter((payment) => payment.month === selectedMonth)
      .sort((a, b) => a.memberName.localeCompare(b.memberName)),
    [monthlyPayments, selectedMonth],
  )

  const monthlyList = useMemo(
    () => monthEntries.slice().sort((a, b) => a.memberName.localeCompare(b.memberName)),
    [monthEntries],
  )

  const syncAmountForType = (paymentType: PaymentType, mealCountValue: string) => {
    if (paymentType === 'custom') return

    const mealCount = Number(mealCountValue || '0')
    const amount = getSuggestedAmount(paymentType, mealCount)
    setForm((prev) => ({ ...prev, paymentType, mealCount: mealCountValue, amount: String(amount) }))
  }

  const syncAmountForTypeEdit = (paymentType: PaymentType, mealCountValue: string) => {
    if (paymentType === 'custom') {
      setEditingPayment((prev) => prev ? { ...prev, paymentType, mealCountStr: mealCountValue } : null)
      return
    }
    const mealCount = Number(mealCountValue || '0')
    const amount = getSuggestedAmount(paymentType, mealCount)
    setEditingPayment((prev) => prev ? { ...prev, paymentType, mealCountStr: mealCountValue, amountStr: String(amount) } : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !form.memberName) return

    await addMonthlyPayment({
      month: form.month,
      memberName: form.memberName,
      paymentType: form.paymentType,
      note: form.note.trim() || null,
      paid: false,
      amount: parseFloat(form.amount) || 0,
      user: currentUser.name,
    })

    setSelectedMonth(form.month)
    setForm({
      month: currentMonth,
      memberName: '',
      paymentType: 'both-meals',
      mealCount: '',
      amount: '2500',
      note: '',
    })
  }

  const markAsPaid = async (paymentId: string) => {
    const payment = monthlyPayments.find((entry) => entry.id === paymentId)
    if (!payment || !currentUser) return

    await addMonthlyPayment({
      month: payment.month,
      memberName: payment.memberName,
      paymentType: payment.paymentType ?? 'custom',
      note: payment.note ?? null,
      paid: true,
      amount: payment.amount,
      user: currentUser.name,
    })
  }

  const paidCount = monthlyList.filter((payment) => payment.paid).length
  const pendingCount = monthlyList.length - paidCount
  const totalDue = monthlyList.reduce((sum, payment) => sum + payment.amount, 0)
  const totalPaid = monthlyList.filter((payment) => payment.paid).reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="space-y-6">
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4">
          <div className="app-panel w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-semibold text-red-700">Delete Entry?</h3>
            <p className="app-muted mb-6 text-sm">
              Are you sure you want to delete the entry for <span className="font-semibold text-[var(--text)]">{pendingDelete.memberName} ({pendingDelete.month})</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPendingDelete(null)} className="app-button app-button-ghost">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteMonthlyPayment(pendingDelete.id)
                  setPendingDelete(null)
                }}
                className="app-button inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 size={16} />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-xl rounded-3xl p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-semibold">Edit Monthly Payment</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                await updateMonthlyPayment({
                  id: editingPayment.id,
                  month: editingPayment.month,
                  memberName: editingPayment.memberName,
                  paymentType: editingPayment.paymentType,
                  amount: parseFloat(editingPayment.amountStr) || 0,
                  note: editingPayment.note?.trim() || null,
                  paid: editingPayment.paid,
                })
                setEditingPayment(null)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Month</label>
                  <input type="month" value={editingPayment.month} onChange={(e) => setEditingPayment({ ...editingPayment, month: e.target.value })} className="app-input" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Name</label>
                  <input value={editingPayment.memberName} onChange={(e) => setEditingPayment({ ...editingPayment, memberName: e.target.value })} className="app-input" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Plan</label>
                  <select value={editingPayment.paymentType} onChange={(e) => syncAmountForTypeEdit(e.target.value as PaymentType, editingPayment.mealCountStr)} className="app-input">
                    {PAYMENT_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Meals</label>
                    <input type="number" value={editingPayment.mealCountStr} onChange={(e) => syncAmountForTypeEdit(editingPayment.paymentType as PaymentType, e.target.value)} className="app-input" min="0" step="1" disabled={editingPayment.paymentType !== 'per-meal'} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Amount Due</label>
                    <input type="number" value={editingPayment.amountStr} onChange={(e) => setEditingPayment({ ...editingPayment, amountStr: e.target.value })} className="app-input" min="0" step="0.01" required />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Note</label>
                <input type="text" value={editingPayment.note || ''} onChange={(e) => setEditingPayment({ ...editingPayment, note: e.target.value })} className="app-input" placeholder="Optional note" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingPayment(null)} className="app-button app-button-ghost">Cancel</button>
                <button type="submit" className="app-button app-button-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {!currentUser && (
        <div className="app-panel rounded-2xl px-4 py-3 text-sm">
          Log in first to add monthly payments.
        </div>
      )}
      {canManageEntries && (
        <div className="app-panel rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-semibold">Add Monthly Food Money Status</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <input
                type="month"
                value={form.month}
                onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
                className="app-input"
                required
              />
              <input
                list="monthly-member-names"
                value={form.memberName}
                onChange={(e) => setForm((prev) => ({ ...prev, memberName: e.target.value }))}
                className="app-input"
                placeholder="Enter any name"
                required
              />
              <datalist id="monthly-member-names">
                {knownNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <select
                value={form.paymentType}
                onChange={(e) => {
                  const nextType = e.target.value as PaymentType
                  syncAmountForType(nextType, form.mealCount)
                }}
                className="app-input"
              >
                {PAYMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Per meal count"
                value={form.mealCount}
                onChange={(e) => syncAmountForType(form.paymentType, e.target.value)}
                className="app-input"
                min="0"
                step="1"
                disabled={form.paymentType !== 'per-meal'}
              />
              <input
                type="number"
                placeholder="Amount due"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className="app-input"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="text"
                placeholder="Note, for example lunch only, dinner only, or per meal details"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="app-input"
              />
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
                Suggested due: <span className="font-semibold text-[var(--primary-strong)]">{formatCurrency(parseFloat(form.amount) || 0)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={!canManageEntries}
              className="app-button app-button-primary"
            >
              Add To Monthly List
            </button>
          </form>
        </div>
      )}

      <div className="app-panel rounded-3xl p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold">Monthly Status Overview</h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="app-input max-w-xs"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--primary-strong)]">{monthlyList.length}</p>
            <p className="app-muted text-sm">People In List</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-strong)]">{paidCount}</p>
            <p className="app-muted text-sm">Paid</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(totalDue)}</p>
            <p className="app-muted text-sm">Total Due</p>
          </div>
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">Reminder List</h2>
        <div className="flex flex-wrap gap-2">
          {monthlyList.filter((payment) => !payment.paid).map((payment) => (
            <span
              key={payment.id}
              className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]"
            >
              {payment.memberName} - {formatCurrency(payment.amount)} pending
            </span>
          ))}
          {monthlyList.filter((payment) => !payment.paid).length === 0 && (
            <p className="app-muted text-sm">Everyone has paid for {selectedMonth}.</p>
          )}
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-strong)]">{formatCurrency(totalPaid)}</p>
            <p className="app-muted text-sm">Cash In Posted</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--primary-strong)]">{pendingCount}</p>
            <p className="app-muted text-sm">Pending</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--primary)]">{knownNames.length}</p>
            <p className="app-muted text-sm">Known Names</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-strong)]">{approvedMembers.length}</p>
            <p className="app-muted text-sm">Approved Users</p>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-semibold">Monthly Food Money List</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-2 text-left">Month</th>
                <th className="p-2 text-left">Person</th>
                <th className="p-2 text-left">Plan</th>
                <th className="p-2 text-left">Note</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Amount Due</th>
                <th className="p-2 text-left">Recorded By</th>
                <th className="p-2 text-left">Action</th>
                {canManageEntries && <th className="p-2 text-right">Options</th>}
              </tr>
            </thead>
            <tbody>
              {monthlyList.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--border)]">
                  <td className="p-2">{payment.month}</td>
                  <td className="p-2 font-medium">{payment.memberName}</td>
                  <td className="p-2">{getPaymentTypeLabel(payment.paymentType)}</td>
                  <td className="p-2">{payment.note || '-'}</td>
                  <td className="p-2">
                    <span
                      className={`rounded-full px-2 py-1 text-sm ${
                        payment.paid
                          ? 'bg-[var(--accent)]/20 text-[var(--accent-strong)]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {payment.paid ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-2">{formatCurrency(payment.amount)}</td>
                  <td className="p-2">{payment.user}</td>
                  <td className="p-2">
                    {canManageEntries && !payment.paid ? (
                      <button
                        type="button"
                        onClick={() => markAsPaid(payment.id)}
                        className="app-button app-button-primary px-4 py-2"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className="app-muted text-sm">
                        {payment.paid ? 'Cash in updated' : 'Pending'}
                      </span>
                    )}
                  </td>
                  {canManageEntries && (
                    <td className="p-2 text-right">
                      {openMenuId === payment.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayment({
                                ...payment,
                                amountStr: String(payment.amount),
                                mealCountStr: payment.paymentType === 'per-meal' ? String(payment.amount) : '',
                              })
                              setOpenMenuId(null)
                            }}
                            className="app-button app-button-ghost px-3 py-1.5 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPendingDelete(payment); setOpenMenuId(null); }}
                            className="app-button border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(null)}
                            className="app-button app-button-ghost px-2 py-1.5 text-xs text-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(payment.id)}
                          className="p-2 app-button-ghost rounded-full hover:bg-[var(--surface-soft)]"
                        >
                          <MoreVertical size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {monthlyList.length === 0 && (
          <p className="app-muted mt-4 text-sm">No entries saved for {selectedMonth} yet.</p>
        )}
      </div>
    </div>
  )
}
