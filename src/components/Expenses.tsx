'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Download, FileImage, FileSpreadsheet, FileText, Trash2, Undo, X } from 'lucide-react'
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
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exportConfig, setExportConfig] = useState({
    dateFrom: '',
    dateTo: '',
    format: 'pdf' as 'pdf' | 'xlsx' | 'png',
  })

  const categories = ['grocery', 'vegetables', 'gas', 'others', 'food money', 'offering', 'separate meal']
  const formatCategoryLabel = (category: string) => category.replace(/\b\w/g, (char) => char.toUpperCase())
  const canSeeFullCashInDetails = currentUser?.role === 'admin' || currentUser?.role === 'overseer'
  const isGeneralUser = currentUser?.role === 'user'
  const canManageEntries = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'

  const getExpenseCategoryLabel = (expense: typeof expenses[number]) => (
    expense.type === 'in' && !canSeeFullCashInDetails
      ? 'Cash In'
      : formatCategoryLabel(expense.category)
  )

  const getExpenseAmountLabel = (expense: typeof expenses[number]) => (
    expense.type === 'in' && !canSeeFullCashInDetails
      ? 'Hidden'
      : formatCurrency(expense.amount)
  )

  const getExpenseDescriptionLabel = (expense: typeof expenses[number]) => (
    expense.type === 'in' && !canSeeFullCashInDetails
      ? 'Hidden for your role'
      : expense.description
  )

  const getExpenseUserLabel = (expense: typeof expenses[number]) => (
    expense.type === 'in' && !canSeeFullCashInDetails
      ? 'Restricted'
      : expense.user
  )

  const getVisibleExpenses = (filters: typeof filter) => {
    const filteredExpenses = expenses.filter(exp => {
      const dateMatch = (!filters.dateFrom || exp.date >= filters.dateFrom) &&
                        (!filters.dateTo || exp.date <= filters.dateTo)
      const categoryMatch = !filters.category || exp.category === filters.category
      return dateMatch && categoryMatch
    })

    return isGeneralUser
      ? filteredExpenses.filter((expense) => expense.type === 'out')
      : filteredExpenses
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    try {
      setIsSubmitting(true)
      await addExpense({
        date: new Date().toISOString().split('T')[0],
        type: form.type,
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
        user: currentUser.name,
      })
      setForm({ type: 'out', category: '', amount: '', description: '' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentMonthKey = getCurrentMonthKey()
  const visibleExpenses = getVisibleExpenses(filter)
  const visibleIncomeTotal = expenses
    .filter((expense) => (!filter.dateFrom || expense.date >= filter.dateFrom) &&
      (!filter.dateTo || expense.date <= filter.dateTo) &&
      (!filter.category || expense.category === filter.category))
    .filter((expense) => expense.date.startsWith(currentMonthKey) && expense.type === 'in')
    .reduce((sum, expense) => sum + expense.amount, 0)

  const exportRows = getVisibleExpenses({ ...filter, dateFrom: exportConfig.dateFrom, dateTo: exportConfig.dateTo })

  const exportPDF = (rows: typeof visibleExpenses) => {
    const doc = new jsPDF()
    doc.text('Cash Flow Report', 20, 20)
    let y = 40
    rows.forEach(exp => {
      doc.text(`${exp.date} - ${exp.category} - INR ${exp.amount} - ${exp.description}`, 20, y)
      y += 10
    })
    doc.save('expenses.pdf')
  }

  const exportXLS = (rows: typeof visibleExpenses) => {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
    XLSX.writeFile(wb, 'expenses.xlsx')
  }

  const exportPNG = async (rows: typeof visibleExpenses) => {
    const element = document.createElement('div')
    element.style.position = 'fixed'
    element.style.left = '-9999px'
    element.style.top = '0'
    element.style.padding = '24px'
    element.style.background = '#ffffff'
    element.style.color = '#1f2937'
    element.style.width = '900px'
    element.innerHTML = `
      <h2 style="margin:0 0 16px;font-size:24px;">Cash Flow Report</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:1px solid #d1d5db;padding:8px;">Date</th>
            <th style="text-align:left;border-bottom:1px solid #d1d5db;padding:8px;">Type</th>
            <th style="text-align:left;border-bottom:1px solid #d1d5db;padding:8px;">Category</th>
            <th style="text-align:left;border-bottom:1px solid #d1d5db;padding:8px;">Amount</th>
            <th style="text-align:left;border-bottom:1px solid #d1d5db;padding:8px;">Description</th>
            <th style="text-align:left;border-bottom:1px solid #d1d5db;padding:8px;">User</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((exp) => `
            <tr>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px;">${exp.date}</td>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px;">${exp.type}</td>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px;">${exp.category}</td>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px;">${formatCurrency(exp.amount)}</td>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px;">${exp.description}</td>
              <td style="border-bottom:1px solid #e5e7eb;padding:8px;">${exp.user}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    document.body.appendChild(element)
    const canvas = await html2canvas(element)
    document.body.removeChild(element)
    const link = document.createElement('a')
    link.download = 'cash-flow.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      setIsDeleting(true)
      await deleteExpense(pendingDelete.id)
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async () => {
    if (exportRows.length === 0) {
      return
    }

    if (exportConfig.format === 'pdf') {
      exportPDF(exportRows)
    } else if (exportConfig.format === 'xlsx') {
      exportXLS(exportRows)
    } else {
      await exportPNG(exportRows)
    }

    setIsExportOpen(false)
  }

  const renderExpenseCards = () => (
    <div className="space-y-3 md:hidden">
      {visibleExpenses.map((exp) => (
        <div key={exp.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 transition-all duration-200 ease-out">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{exp.description}</div>
              <div className="app-muted mt-1 text-xs">{exp.date} | {getExpenseCategoryLabel(exp)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{getExpenseAmountLabel(exp)}</div>
              <div className="app-muted text-[11px] uppercase">{exp.type}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="app-muted text-xs">{getExpenseUserLabel(exp)}</div>
            {canManageEntries && (
              <button
                type="button"
                onClick={() => setPendingDelete({ id: exp.id, description: exp.description })}
                className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 hover:text-red-800"
                title="Open a confirmation box before deleting this entry."
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
      {visibleExpenses.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm app-muted">
          No cash flow entries found for this filter.
        </div>
      )}
    </div>
  )

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
                disabled={isDeleting}
                className="app-button app-button-ghost disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="app-button inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Trash2 size={16} />
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-lg rounded-3xl p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Export Cash Flow</h3>
                <p className="app-muted mt-1 text-sm">Choose the date range and format, then export in one step.</p>
              </div>
              <button onClick={() => setIsExportOpen(false)} className="text-[var(--text-soft)] hover:text-[var(--text)]" aria-label="Close export dialog">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="date"
                value={exportConfig.dateFrom}
                onChange={(e) => setExportConfig((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="app-input"
              />
              <input
                type="date"
                value={exportConfig.dateTo}
                onChange={(e) => setExportConfig((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="app-input"
              />
              <select
                value={exportConfig.format}
                onChange={(e) => setExportConfig((prev) => ({ ...prev, format: e.target.value as 'pdf' | 'xlsx' | 'png' }))}
                className="app-input md:col-span-2"
              >
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel</option>
                <option value="png">PNG</option>
              </select>
            </div>
            <p className="app-muted mt-4 text-sm">
              {exportRows.length} entries ready to export.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsExportOpen(false)} className="app-button app-button-ghost">
                Cancel
              </button>
              <button onClick={() => void handleExport()} className="app-button app-button-primary inline-flex items-center gap-2" disabled={exportRows.length === 0}>
                {exportConfig.format === 'pdf' && <FileText size={16} />}
                {exportConfig.format === 'xlsx' && <FileSpreadsheet size={16} />}
                {exportConfig.format === 'png' && <FileImage size={16} />}
                Export
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
      {canManageEntries && (
      <div className="app-panel rounded-3xl p-4 sm:p-6">
        <h2 className="text-xl font-semibold mb-4">Add Cash Flow Entry</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
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
                <option key={cat} value={cat}>{formatCategoryLabel(cat)}</option>
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
            disabled={!canManageEntries || isSubmitting}
            className="app-button app-button-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-70"
            title="Save this new cash flow entry to the list."
          >
            {isSubmitting ? 'Saving...' : 'Add Expense'}
          </button>
        </form>
      </div>
      )}

      <div className="app-panel rounded-3xl p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Cash Flow Entries</h2>
            <div className="flex flex-wrap items-center gap-2">
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setExportConfig((prev) => ({
                      ...prev,
                      dateFrom: filter.dateFrom,
                      dateTo: filter.dateTo,
                    }))
                    setIsExportOpen(true)
                  }}
                  className="app-button app-button-ghost inline-flex items-center gap-2 px-3 py-2"
                  title="Open the cash flow export options."
                >
                  <Download size={16} />
                  Export
                </button>
              )}
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
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <option key={cat} value={cat}>{formatCategoryLabel(cat)}</option>
              ))}
            </select>
          </div>
        </div>
        {renderExpenseCards()}
        <div id="cash-flow-table" className="hidden overflow-x-auto md:block">
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
                <tr key={exp.id} className="border-b border-[var(--border)] transition-all duration-200 ease-out">
                  <td className="p-2">{exp.date}</td>
                  <td className="p-2">{exp.type}</td>
                  <td className="p-2">{getExpenseCategoryLabel(exp)}</td>
                  <td className="p-2">{getExpenseAmountLabel(exp)}</td>
                  <td className="p-2">{getExpenseDescriptionLabel(exp)}</td>
                  <td className="p-2">{getExpenseUserLabel(exp)}</td>
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
