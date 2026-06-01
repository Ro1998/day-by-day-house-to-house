'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Expense } from '@/types'
import { useData } from '@/components/DataProvider'
import { ChevronDown, Download, FileImage, FileSpreadsheet, FileText, Trash2, Undo, X } from 'lucide-react'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import html2canvas from 'html2canvas'
import { formatCurrency, getCurrentMonthKey } from '@/lib/format'

export function Expenses() {
  const { expenses, addExpense, deleteExpense, undoDelete, currentUser, notice, monthlyCashFlowSummaries } = useData()
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
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})
  const [exportConfig, setExportConfig] = useState({
    dateFrom: '',
    dateTo: '',
    format: 'pdf' as 'pdf' | 'xlsx' | 'png',
  })
  const exportButtonRef = useRef<HTMLButtonElement | null>(null)
  const exportPanelRef = useRef<HTMLDivElement | null>(null)
  const [exportPanelPosition, setExportPanelPosition] = useState({ top: 0, left: 0, width: 0 })

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
  const groupedExpenses = useMemo(() => {
    const groups = visibleExpenses.reduce((map, expense) => {
      const monthKey = expense.date.slice(0, 7)
      const existing = map.get(monthKey)

      if (existing) {
        existing.push(expense)
      } else {
        map.set(monthKey, [expense])
      }

      return map
    }, new Map<string, Expense[]>())

    return Array.from(groups.entries())
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([monthKey, items]) => ({
        monthKey,
        items: [...items].sort((left, right) => right.date.localeCompare(left.date)),
      }))
  }, [visibleExpenses])
  const visibleIncomeTotal = expenses
    .filter((expense) => (!filter.dateFrom || expense.date >= filter.dateFrom) &&
      (!filter.dateTo || expense.date <= filter.dateTo) &&
      (!filter.category || expense.category === filter.category))
    .filter((expense) => expense.date.startsWith(currentMonthKey) && expense.type === 'in')
    .reduce((sum, expense) => sum + expense.amount, 0)

  const exportRows = getVisibleExpenses({ ...filter, dateFrom: exportConfig.dateFrom, dateTo: exportConfig.dateTo })

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
  }

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }))
  }

  const getExportRow = (expense: Expense) => ({
    Date: expense.date,
    Type: expense.type === 'in' ? 'Cash In' : 'Cash Out',
    Category: getExpenseCategoryLabel(expense),
    Amount: getExpenseAmountLabel(expense),
    Description: getExpenseDescriptionLabel(expense),
    User: getExpenseUserLabel(expense),
  })

  const wrapText = (doc: jsPDF, text: string, maxWidth: number) => {
    const safeText = text.trim() || '-'
    return doc.splitTextToSize(safeText, maxWidth) as string[]
  }

  const exportPDF = (rows: typeof visibleExpenses) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 12
    const startX = margin
    const columns = [
      { key: 'Date', label: 'Date', width: 26 },
      { key: 'Type', label: 'Type', width: 24 },
      { key: 'Category', label: 'Category', width: 35 },
      { key: 'Amount', label: 'Amount', width: 32 },
      { key: 'Description', label: 'Description', width: 102 },
      { key: 'User', label: 'User', width: 38 },
    ] as const
    const tableWidth = columns.reduce((sum, column) => sum + column.width, 0)
    const minRowHeight = 10
    const lineHeight = 5
    const cellPaddingX = 2.5
    const cellPaddingY = 3
    const titleY = 14
    const subtitleY = 21
    const headerY = 28

    const drawHeader = (y: number) => {
      doc.setFillColor(240, 244, 248)
      doc.rect(startX, y, tableWidth, minRowHeight, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)

      let x = startX
      columns.forEach((column) => {
        doc.rect(x, y, column.width, minRowHeight)
        doc.text(column.label, x + cellPaddingX, y + 6.5)
        x += column.width
      })
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Cash Flow Report', startX, titleY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Entries exported: ${rows.length}`, startX, subtitleY)
    drawHeader(headerY)

    let y = headerY + minRowHeight

    rows.forEach((expense) => {
      const row = getExportRow(expense)
      const cellLines = columns.map((column) => wrapText(doc, row[column.key], column.width - cellPaddingX * 2))
      const rowHeight = Math.max(
        minRowHeight,
        ...cellLines.map((lines) => lines.length * lineHeight + cellPaddingY * 2),
      )

      if (y + rowHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
        drawHeader(y)
        y += minRowHeight
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      let x = startX
      columns.forEach((column, index) => {
        doc.rect(x, y, column.width, rowHeight)
        doc.text(cellLines[index], x + cellPaddingX, y + cellPaddingY + lineHeight - 1)
        x += column.width
      })

      y += rowHeight
    })

    doc.save('expenses.pdf')
  }

  const exportXLS = (rows: typeof visibleExpenses) => {
    const sheetRows = rows.map(getExportRow)
    const ws = XLSX.utils.json_to_sheet(sheetRows)
    ws['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 42 },
      { wch: 18 },
    ]
    ws['!autofilter'] = {
      ref: `A1:F${Math.max(sheetRows.length + 1, 2)}`,
    }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
    XLSX.writeFile(wb, 'expenses.xlsx')
  }

  const exportPNG = async (rows: typeof visibleExpenses) => {
    const previewRows = rows.map(getExportRow)
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
            <th style="text-align:left;border:1px solid #d1d5db;padding:8px;background:#f8fafc;">Date</th>
            <th style="text-align:left;border:1px solid #d1d5db;padding:8px;background:#f8fafc;">Type</th>
            <th style="text-align:left;border:1px solid #d1d5db;padding:8px;background:#f8fafc;">Category</th>
            <th style="text-align:left;border:1px solid #d1d5db;padding:8px;background:#f8fafc;">Amount</th>
            <th style="text-align:left;border:1px solid #d1d5db;padding:8px;background:#f8fafc;">Description</th>
            <th style="text-align:left;border:1px solid #d1d5db;padding:8px;background:#f8fafc;">User</th>
          </tr>
        </thead>
        <tbody>
          ${previewRows.map((row) => `
            <tr>
              <td style="border:1px solid #e5e7eb;padding:8px;">${row.Date}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;">${row.Type}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;">${row.Category}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;">${row.Amount}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;">${row.Description}</td>
              <td style="border:1px solid #e5e7eb;padding:8px;">${row.User}</td>
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

  useEffect(() => {
    if (!isExportOpen) return

    const updatePosition = () => {
      const button = exportButtonRef.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const panelWidth = Math.min(window.innerWidth - 24, 520)
      const estimatedPanelHeight = 360
      const left = Math.min(
        Math.max(12, rect.right - panelWidth),
        window.innerWidth - panelWidth - 12,
      )
      const fitsBelow = rect.bottom + 10 + estimatedPanelHeight <= window.innerHeight - 12
      const top = fitsBelow
        ? rect.bottom + 10
        : Math.max(12, rect.top - estimatedPanelHeight - 10)

      setExportPanelPosition({ top, left, width: panelWidth })
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (exportPanelRef.current?.contains(target) || exportButtonRef.current?.contains(target)) {
        return
      }
      setIsExportOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExportOpen(false)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isExportOpen])

  useEffect(() => {
    if (groupedExpenses.length === 0) {
      setExpandedMonths({})
      return
    }

    setExpandedMonths((prev) => {
      const nextState = groupedExpenses.reduce<Record<string, boolean>>((acc, group, index) => {
        acc[group.monthKey] = prev[group.monthKey] ?? index === 0
        return acc
      }, {})

      const isSame = Object.keys(nextState).length === Object.keys(prev).length &&
        Object.entries(nextState).every(([key, value]) => prev[key] === value)

      return isSame ? prev : nextState
    })
  }, [groupedExpenses])

  const renderMonthSection = (monthKey: string, monthExpenses: Expense[], compact = false) => {
    const isOpen = expandedMonths[monthKey] ?? false
    const monthSummary = monthlyCashFlowSummaries.find((summary) => summary.monthKey === monthKey)
    const monthIn = monthExpenses
      .filter((expense) => expense.type === 'in')
      .reduce((sum, expense) => sum + expense.amount, 0)
    const monthOut = monthExpenses
      .filter((expense) => expense.type === 'out')
      .reduce((sum, expense) => sum + expense.amount, 0)

    return (
      <section key={monthKey} className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]">
        <button
          type="button"
          onClick={() => toggleMonth(monthKey)}
          className="flex w-full items-center justify-between gap-4 bg-[var(--surface-soft)] px-4 py-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--surface-soft)_82%,white)] sm:px-5"
          aria-expanded={isOpen}
        >
          <div className="min-w-0">
            <div className="text-base font-semibold">{formatMonthLabel(monthKey)}</div>
            <div className="app-muted mt-1 text-xs sm:text-sm">
              {monthExpenses.length} entries
              {canSeeFullCashInDetails ? ` | In ${formatCurrency(monthIn)}` : ''}
              {' | '}Out {formatCurrency(monthOut)}
              {monthSummary ? ` | Balance ${formatCurrency(monthSummary.closingBalance)}` : ''}
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`shrink-0 text-[var(--text-soft)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="border-t border-[var(--border)] p-3 sm:p-4">
              {monthSummary && (
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {canSeeFullCashInDetails && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                      <p className="app-muted text-xs">Balance Carried Forward</p>
                      <p className="mt-1 text-lg font-semibold">{formatCurrency(monthSummary.openingBalance)}</p>
                    </div>
                  )}
                  {canSeeFullCashInDetails && (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                      <p className="app-muted text-xs">Total Cash In</p>
                      <p className="mt-1 text-lg font-semibold text-green-600">{formatCurrency(monthSummary.cashIn)}</p>
                    </div>
                  )}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                    <p className="app-muted text-xs">Total Cash Out</p>
                    <p className="mt-1 text-lg font-semibold text-red-600">{formatCurrency(monthSummary.cashOut)}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                    <p className="app-muted text-xs">Balance Remaining</p>
                    <p className="mt-1 text-lg font-semibold text-[var(--primary)]">{formatCurrency(monthSummary.closingBalance)}</p>
                  </div>
                </div>
              )}
              {compact ? (
                <div className="space-y-3">
                  {monthExpenses.map((exp) => (
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
                </div>
              ) : (
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
                      {monthExpenses.map((exp) => (
                        <tr key={exp.id} className="border-b border-[var(--border)] last:border-0 transition-all duration-200 ease-out">
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
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  const renderExpenseCards = () => (
    <div className="space-y-3 md:hidden">
      {groupedExpenses.map((group) => renderMonthSection(group.monthKey, group.items, true))}
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
        <div className="fixed inset-0 z-50">
          <div
            ref={exportPanelRef}
            className="app-panel fixed flex max-h-[min(32rem,calc(100vh-2rem))] flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] shadow-2xl"
            style={{
              top: exportPanelPosition.top,
              left: exportPanelPosition.left,
              width: exportPanelPosition.width || undefined,
              maxWidth: 'calc(100vw - 1.5rem)',
            }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="px-6 pt-6">
                <h3 className="text-xl font-semibold">Export Cash Flow</h3>
                <p className="app-muted mt-1 text-sm">Choose the date range and format, then export in one step.</p>
              </div>
              <button onClick={() => setIsExportOpen(false)} className="mr-6 mt-6 text-[var(--text-soft)] hover:text-[var(--text)]" aria-label="Close export dialog">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 pb-4">
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
            </div>
            <div className="mt-auto flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4">
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
                  ref={exportButtonRef}
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
        <div id="cash-flow-table" className="hidden space-y-4 md:block">
          {groupedExpenses.map((group) => renderMonthSection(group.monthKey, group.items))}
          {visibleExpenses.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm app-muted">
              No cash flow entries found for this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
