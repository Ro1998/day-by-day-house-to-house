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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Add Monthly Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="month"
              value={form.month}
              onChange={(e) => setForm(prev => ({ ...prev, month: e.target.value }))}
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              required
            />
            <label className="flex items-center space-x-2">
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
              className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Payment
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Monthly Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2">Month</th>
                <th className="text-left p-2">Paid</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">User</th>
              </tr>
            </thead>
            <tbody>
              {monthlyPayments.map(payment => (
                <tr key={payment.id} className="border-b dark:border-gray-700">
                  <td className="p-2">{payment.month}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-sm ${
                      payment.paid ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
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

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Current Month Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{currentPayments.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Entries</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {currentPayments.filter(p => p.paid).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Paid</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              ${currentPayments.reduce((sum, p) => sum + p.amount, 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
          </div>
        </div>
      </div>
    </div>
  )
}