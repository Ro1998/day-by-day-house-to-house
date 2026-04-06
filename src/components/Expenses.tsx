'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Trash2, Undo, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { formatCurrency, getCurrentMonthKey } from '@/lib/format'

export function Expenses() {
  const { expenses, addExpense, deleteExpense, undoDelete, currentUser, notice } = useData()
  const [form, setForm] = useState({
    type: 'out' as 'in' | 'out',
    category: '',
    amount: '',
    description: '',
  })
  const [filter, setFilter] = useState({ dateFrom: '', dateTo: '', category: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    addExpense({
      date: new Date().toISOString().split('T')[0],
      type: form.type,
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description,
      user: currentUser.name,
    })
    setForm({ type: 'out', category: '', amount: '', description: '' })
  }

  const filteredExpenses = expenses.filter(exp => {
    const dateMatch = (!filter.dateFrom || exp.date >= filter.dateFrom) &&
                      (!filter.dateTo || exp.date <= filter.dateTo)
    const categoryMatch = !filter.category || exp.category === filter.category
    return dateMatch && categoryMatch
  })
  const isGeneralUser = currentUser?.role === 'user'
  const canManageEntries = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'
  const currentMonthKey = getCurrentMonthKey()
  const visibleExpenses = isGeneralUser
    ? filteredExpenses.filter((expense) => expense.date.startsWith(currentMonthKey) && expense.type === 'out')
    : filteredExpenses
  const visibleIncomeTotal = filteredExpenses
    .filter((expense) => expense.date.startsWith(currentMonthKey) && expense.type === 'in')
    .reduce((sum, expense) => sum + expense.amount, 0)

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text('Expense Report', 20, 20)
    let y = 40
    visibleExpenses.forEach(exp => {
      doc.text(`${exp.date} - ${exp.category} - INR ${exp.amount} - ${exp.description}`, 20, y)
      y += 10
    })
    doc.save('expenses.pdf')
  }

  const exportXLS = () => {
    const ws = XLSX.utils.json_to_sheet(visibleExpenses)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
    XLSX.writeFile(wb, 'expenses.xlsx')
  }

  const categories = ['grocery', 'vegetables', 'gas', 'others', 'food money', 'offering', 'separate meal']

  return (
    <div className="space-y-6">
      {!currentUser && (
        <div className="app-panel rounded-2xl px-4 py-3 text-sm">
          Log in first to add or delete expenses.
        </div>
      )}
      {isGeneralUser && (
        <div className="app-panel rounded-3xl p-6">
          <h2 className="mb-2 text-xl font-semibold">This Month&apos;s Income</h2>
          <p className="text-2xl font-bold text-[var(--accent-strong)]">{formatCurrency(visibleIncomeTotal)}</p>
          <p className="app-muted mt-2 text-sm">Income details stay hidden for general users.</p>
        </div>
      )}
      {canManageEntries && (
      <div className="app-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={form.type}
              onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as 'in' | 'out' }))}
              className="app-input"
            >
              <option value="in">Cash In</option>
              <option value="out">Cash Out</option>
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="app-input"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
              className="app-input"
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="app-input"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!canManageEntries}
            className="app-button app-button-primary"
          >
            Add Expense
          </button>
        </form>
      </div>
      )}

      <div className="app-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-4">Filters & Export</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="date"
            placeholder="From Date"
            value={filter.dateFrom}
            onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="app-input"
          />
          <input
            type="date"
            placeholder="To Date"
            value={filter.dateTo}
            onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
            className="app-input"
          />
          <select
            value={filter.category}
            onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
            className="app-input"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex space-x-2">
            <button onClick={exportPDF} className="app-button app-button-ghost px-3 py-2">
              <Download size={16} />
            </button>
            <button onClick={exportXLS} className="app-button app-button-secondary px-3 py-2">
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Expense List</h2>
          {notice?.includes('Deleted') && (
            <button
              onClick={undoDelete}
              className="app-button app-button-secondary flex items-center space-x-1 px-3 py-2"
            >
              <Undo size={16} />
              <span>Undo</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Category</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleExpenses.map(exp => (
                <tr key={exp.id} className="border-b border-[var(--border)]">
                  <td className="p-2">{exp.date}</td>
                  <td className="p-2">{exp.type}</td>
                  <td className="p-2">{exp.category}</td>
                  <td className="p-2">{formatCurrency(exp.amount)}</td>
                  <td className="p-2">{exp.description}</td>
                  <td className="p-2">{exp.user}</td>
                  <td className="p-2">
                    {canManageEntries && (
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[var(--primary)] hover:text-[var(--primary-strong)]"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
