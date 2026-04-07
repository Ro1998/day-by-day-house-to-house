'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import { FileImage, FileSpreadsheet, FileText, Trash2, Undo } from 'lucide-react'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
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
  const [pendingDelete, setPendingDelete] = useState<{ id: string; description: string } | null>(null)

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
    doc.text('Cash Flow Report', 20, 20)
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

  const exportPNG = async () => {
    const element = document.getElementById('cash-flow-table')
    if (!element) return

    const canvas = await html2canvas(element)
    const link = document.createElement('a')
    link.download = 'cash-flow.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  const categories = ['grocery', 'vegetables', 'gas', 'others', 'food money', 'offering', 'separate meal']

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await deleteExpense(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-6">
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4">
          <div className="app-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="mb-2 text-xl font-semibold text-red-700">Delete Entry?</h3>
            <p className="app-muted mb-6 text-sm">
              This will remove <span className="font-semibold text-[var(--text)]">"{pendingDelete.description}"</span> from the cash flow list.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="app-button app-button-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="app-button inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 size={16} />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
        <h2 className="text-xl font-semibold mb-4">Add Cash Flow Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={form.type}
              onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as 'in' | 'out' }))}
              className="app-input"
              title="Choose whether this entry adds money to the balance or records money spent."
            >
              <option value="in">Cash In</option>
              <option value="out">Cash Out</option>
            </select>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="app-input"
              title="Pick the category this cash flow entry belongs to."
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
              title="Enter the amount for this cash in or cash out entry."
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="app-input"
              title="Add a short note so the entry is easy to identify later."
              required
            />
          </div>
          <button
            type="submit"
            disabled={!canManageEntries}
            className="app-button app-button-primary"
            title="Save this new cash flow entry to the list."
          >
            Add Expense
          </button>
        </form>
      </div>
      )}

      <div className="app-panel rounded-3xl p-6">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Cash Flow Entries</h2>
            {notice?.includes('Deleted') && (
              <button
                onClick={undoDelete}
                className="app-button app-button-secondary flex items-center space-x-1 px-3 py-2"
                title="Restore the most recently deleted entry."
              >
                <Undo size={16} />
                <span>Undo</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input
              type="date"
              placeholder="From Date"
              value={filter.dateFrom}
              onChange={(e) => setFilter(prev => ({ ...prev, dateFrom: e.target.value }))}
              className="app-input"
              title="Show entries from this date onward."
            />
            <input
              type="date"
              placeholder="To Date"
              value={filter.dateTo}
              onChange={(e) => setFilter(prev => ({ ...prev, dateTo: e.target.value }))}
              className="app-input"
              title="Show entries up to this date."
            />
            <select
              value={filter.category}
              onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value }))}
              className="app-input"
              title="Filter the list to one category only."
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportPDF}
                className="app-button app-button-ghost inline-flex items-center gap-2 px-3 py-2"
                title="Download the currently filtered cash flow entries as a PDF file."
              >
                <FileText size={16} />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={exportXLS}
                className="app-button app-button-secondary inline-flex items-center gap-2 px-3 py-2"
                title="Download the currently filtered cash flow entries as an Excel file."
              >
                <FileSpreadsheet size={16} />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => void exportPNG()}
                className="app-button app-button-ghost inline-flex items-center gap-2 px-3 py-2"
                title="Download the current cash flow table as a PNG image."
              >
                <FileImage size={16} />
                <span>PNG</span>
              </button>
            </div>
          </div>
        </div>
        <div id="cash-flow-table" className="overflow-x-auto">
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
                        type="button"
                        onClick={() => setPendingDelete({ id: exp.id, description: exp.description })}
                        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-red-700 transition-colors hover:bg-red-100 hover:text-red-800"
                        title="Open a confirmation box before deleting this entry."
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
