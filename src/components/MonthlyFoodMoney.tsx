'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useData } from '@/components/DataProvider'
import { formatCurrency } from '@/lib/format'

export function MonthlyFoodMoney() {
  const { monthlyPayments, addMonthlyPayment, currentUser, users } = useData()
  const canManageEntries = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'
  const currentMonth = format(new Date(), 'yyyy-MM')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const approvedMembers = useMemo(
    () => users.filter((user) => user.approved).sort((a, b) => a.name.localeCompare(b.name)),
    [users],
  )
  const [form, setForm] = useState({
    month: currentMonth,
    memberName: '',
    paid: false,
    amount: '',
  })

  const monthEntries = useMemo(
    () => monthlyPayments
      .filter((payment) => payment.month === selectedMonth)
      .sort((a, b) => a.memberName.localeCompare(b.memberName)),
    [monthlyPayments, selectedMonth],
  )

  const paymentByMember = useMemo(
    () => new Map(monthEntries.map((payment) => [payment.memberName, payment])),
    [monthEntries],
  )

  const membersNeedingReminder = approvedMembers.filter((member) => {
    const entry = paymentByMember.get(member.name)
    return !entry || !entry.paid
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !form.memberName) return

    await addMonthlyPayment({
      month: form.month,
      memberName: form.memberName,
      paid: form.paid,
      amount: parseFloat(form.amount) || 0,
      user: currentUser.name,
    })

    setSelectedMonth(form.month)
    setForm({
      month: currentMonth,
      memberName: '',
      paid: false,
      amount: '',
    })
  }

  return (
    <div className="space-y-6">
      {!currentUser && (
        <div className="app-panel rounded-2xl px-4 py-3 text-sm">
          Log in first to add monthly payments.
        </div>
      )}
      {canManageEntries && (
        <div className="app-panel rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-semibold">Add Monthly Food Money Status</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <input
                type="month"
                value={form.month}
                onChange={(e) => setForm((prev) => ({ ...prev, month: e.target.value }))}
                className="app-input"
                required
              />
              <select
                value={form.memberName}
                onChange={(e) => setForm((prev) => ({ ...prev, memberName: e.target.value }))}
                className="app-input"
                required
              >
                <option value="">Select person</option>
                {approvedMembers.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                className="app-input"
                min="0"
                step="0.01"
                required
              />
              <label className="flex items-center space-x-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={(e) => setForm((prev) => ({ ...prev, paid: e.target.checked }))}
                />
                <span>Mark as paid and add cash in</span>
              </label>
            </div>
            <button
              type="submit"
              disabled={!canManageEntries}
              className="app-button app-button-primary"
            >
              Save Monthly Entry
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
            <p className="text-2xl font-bold text-[var(--primary-strong)]">{approvedMembers.length}</p>
            <p className="app-muted text-sm">Total People</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--accent-strong)]">
              {monthEntries.filter((payment) => payment.paid).length}
            </p>
            <p className="app-muted text-sm">Paid This Month</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--primary)]">
              {formatCurrency(monthEntries.filter((payment) => payment.paid).reduce((sum, payment) => sum + payment.amount, 0))}
            </p>
            <p className="app-muted text-sm">Cash In From Paid Entries</p>
          </div>
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">Reminder List</h2>
        <div className="flex flex-wrap gap-2">
          {membersNeedingReminder.map((member) => (
            <span
              key={member.id}
              className="rounded-full bg-[var(--primary)]/15 px-3 py-2 text-sm text-[var(--primary-strong)]"
            >
              {member.name} - payment pending
            </span>
          ))}
          {membersNeedingReminder.length === 0 && (
            <p className="app-muted text-sm">Everyone has paid for {selectedMonth}.</p>
          )}
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">Monthly Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-2 text-left">Month</th>
                <th className="p-2 text-left">Person</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Reminder</th>
                <th className="p-2 text-left">Amount</th>
                <th className="p-2 text-left">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--border)]">
                  <td className="p-2">{payment.month}</td>
                  <td className="p-2 font-medium">{payment.memberName}</td>
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
                  <td className="p-2">
                    {payment.paid ? 'No reminder needed' : 'Reminder needed'}
                  </td>
                  <td className="p-2">{formatCurrency(payment.amount)}</td>
                  <td className="p-2">{payment.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {monthEntries.length === 0 && (
          <p className="app-muted mt-4 text-sm">No entries saved for {selectedMonth} yet.</p>
        )}
      </div>
    </div>
  )
}
