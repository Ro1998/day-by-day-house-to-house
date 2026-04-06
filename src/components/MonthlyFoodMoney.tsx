'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import { format } from 'date-fns'

export function MonthlyFoodMoney() {
  const { monthlyPayments, addMonthlyPayment, currentUser } = useData()
  const [form, setForm] = useState({
    month: format(new Date(), 'yyyy-MM'),
    paid: false,
    amount: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    addMonthlyPayment({
      month: form.month,
      paid: form.paid,
      amount: parseFloat(form.amount) || 0,
      user: currentUser.name,
    })
    setForm({ month: format(new Date(), 'yyyy-MM'), paid: false, amount: '' })
  }

  const currentMonth = format(new Date(), 'yyyy-MM')
  const currentPayments = monthlyPayments.filter(p => p.month === currentMonth)

  return (
    <div className="space-y-6">
      {!currentUser && (
        <div className="app-panel rounded-2xl px-4 py-3 text-sm">
          Log in first to add monthly payments.
        </div>
      )}
      <div className="app-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">Add Monthly Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="month"
              value={form.month}
              onChange={(e) => setForm(prev => ({ ...prev, month: e.target.value }))}
              className="app-input"
              required
            />
            <label className="flex items-center space-x-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3">
              <input
                type="checkbox"
                checked={form.paid}
                onChange={(e) => setForm(prev => ({ ...prev, paid: e.target.checked }))}
              />
              <span>Paid</span>
            </label>
            <input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              className="app-input"
            />
          </div>
          <button
            type="submit"
            disabled={!currentUser}
            className="app-button app-button-primary"
          >
            Add Payment
          </button>
        </form>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">Monthly Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-2">Month</th>
                <th className="text-left p-2">Paid</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">User</th>
              </tr>
            </thead>
            <tbody>
              {monthlyPayments.map(payment => (
                <tr key={payment.id} className="border-b border-[var(--border)]">
                  <td className="p-2">{payment.month}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      payment.paid ? 'bg-[var(--accent)]/30 text-[var(--primary-strong)]' : 'bg-[var(--primary)]/15 text-[var(--primary-strong)]'
                    }`}>
                      {payment.paid ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="p-2">${payment.amount}</td>
                  <td className="p-2">{payment.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">Current Month Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--primary)]">{currentPayments.length}</p>
            <p className="app-muted text-sm">Total Entries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--accent-strong)]">
              {currentPayments.filter(p => p.paid).length}
            </p>
            <p className="app-muted text-sm">Paid</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--primary-strong)]">
              ${currentPayments.reduce((sum, p) => sum + p.amount, 0)}
            </p>
            <p className="app-muted text-sm">Total Amount</p>
          </div>
        </div>
      </div>
    </div>
  )
}
