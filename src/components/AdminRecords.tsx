'use client'

import { useEffect, useMemo, useState } from 'react'
import { useData } from '@/components/DataProvider'
import { BookMoneyRecord, PersonalMoneyEntry, PersonalMoneyKind } from '@/types'
import { Clipboard, FileImage, Pencil, Trash2, X } from 'lucide-react'
import html2canvas from 'html2canvas'

type MoneyForm = {
  date: string
  kind: PersonalMoneyKind
  category: string
  amount: string
  counterparty: string
  description: string
}

type BookForm = {
  month: string
  bookType: 'HWMR' | 'LS'
  bookName: string
  priceLabel: string
  unitPrice: string
  englishPrice: string
  hindiPrice: string
  englishVolumes: string
  hindiVolumes: string
  mk1English: string
  mk1Hindi: string
  mk2English: string
  mk2Hindi: string
  knEnglish: string
  knHindi: string
  mk1PaidAmount: string
  mk1PaidMethod: string
  mk1PaidBy: string
  mk1PaidAt: string
  mk2PaidAmount: string
  mk2PaidMethod: string
  mk2PaidBy: string
  mk2PaidAt: string
  knPaidAmount: string
  knPaidMethod: string
  knPaidBy: string
  knPaidAt: string
  deadline: string
  note: string
}

const today = () => new Date().toISOString().slice(0, 10)
const currentMonth = () => today().slice(0, 7)
const currentYear = () => today().slice(0, 4)

const moneyKinds: Array<{ id: PersonalMoneyKind; label: string }> = [
  { id: 'income', label: 'Money Got' },
  { id: 'expense', label: 'Spent' },
  { id: 'received', label: 'Received From Someone' },
  { id: 'given', label: 'Gave Someone' },
  { id: 'receivable', label: 'Paid For Someone' },
  { id: 'settled', label: 'Received Back' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)

const monthLabel = (month: string) => {
  if (!month) return ''
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(year, monthIndex - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

const recordDistricts = [
  { id: 'mk1', label: 'MK1', english: 'mk1English', hindi: 'mk1Hindi', paidAmount: 'mk1PaidAmount', paidMethod: 'mk1PaidMethod', paidBy: 'mk1PaidBy', paidAt: 'mk1PaidAt' },
  { id: 'mk2', label: 'MK2', english: 'mk2English', hindi: 'mk2Hindi', paidAmount: 'mk2PaidAmount', paidMethod: 'mk2PaidMethod', paidBy: 'mk2PaidBy', paidAt: 'mk2PaidAt' },
  { id: 'kn', label: 'KN', english: 'knEnglish', hindi: 'knHindi', paidAmount: 'knPaidAmount', paidMethod: 'knPaidMethod', paidBy: 'knPaidBy', paidAt: 'knPaidAt' },
] as const

const districtTotal = (record: BookMoneyRecord, district: (typeof recordDistricts)[number]) => {
  const english = Number(record[district.english])
  const hindi = Number(record[district.hindi])
  const englishAmount = english * (record.englishVolumes || 1) * (record.englishPrice || record.unitPrice || 0)
  const hindiAmount = hindi * (record.hindiVolumes || 1) * (record.hindiPrice || record.unitPrice || 0)
  const amount = englishAmount + hindiAmount
  const paid = Number(record[district.paidAmount]) || 0
  return {
    english,
    hindi,
    quantity: english + hindi,
    englishAmount,
    hindiAmount,
    amount,
    paid,
    remaining: Math.max(amount - paid, 0),
    paidStatus: paid >= amount && amount > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid',
  }
}

const bookGrandTotal = (record: BookMoneyRecord) =>
  recordDistricts.reduce((total, district) => total + districtTotal(record, district).amount, 0)

const bookCollectedTotal = (record: BookMoneyRecord) =>
  recordDistricts.reduce((total, district) => total + districtTotal(record, district).paid, 0)

const bookRemainingTotal = (record: BookMoneyRecord) =>
  Math.max(bookGrandTotal(record) - bookCollectedTotal(record), 0)

const defaultBookForm = (): BookForm => ({
  month: currentMonth(),
  bookType: 'HWMR',
  bookName: '',
  priceLabel: 'per volume/book',
  unitPrice: '',
  englishPrice: '',
  hindiPrice: '',
  englishVolumes: '2',
  hindiVolumes: '1',
  mk1English: '0',
  mk1Hindi: '0',
  mk2English: '0',
  mk2Hindi: '0',
  knEnglish: '0',
  knHindi: '0',
  mk1PaidAmount: '0',
  mk1PaidMethod: '',
  mk1PaidBy: '',
  mk1PaidAt: '',
  mk2PaidAmount: '0',
  mk2PaidMethod: '',
  mk2PaidBy: '',
  mk2PaidAt: '',
  knPaidAmount: '0',
  knPaidMethod: '',
  knPaidBy: '',
  knPaidAt: '',
  deadline: '',
  note: '',
})

const recordToBookForm = (record: BookMoneyRecord): BookForm => ({
  month: record.month,
  bookType: record.bookType,
  bookName: record.bookName,
  priceLabel: record.priceLabel || 'per volume/book',
  unitPrice: String(record.unitPrice || ''),
  englishPrice: String(record.englishPrice || record.unitPrice || ''),
  hindiPrice: String(record.hindiPrice || record.unitPrice || ''),
  englishVolumes: String(record.englishVolumes || 1),
  hindiVolumes: String(record.hindiVolumes || 1),
  mk1English: String(record.mk1English || 0),
  mk1Hindi: String(record.mk1Hindi || 0),
  mk2English: String(record.mk2English || 0),
  mk2Hindi: String(record.mk2Hindi || 0),
  knEnglish: String(record.knEnglish || 0),
  knHindi: String(record.knHindi || 0),
  mk1PaidAmount: String(record.mk1PaidAmount || 0),
  mk1PaidMethod: record.mk1PaidMethod || '',
  mk1PaidBy: record.mk1PaidBy || '',
  mk1PaidAt: record.mk1PaidAt || '',
  mk2PaidAmount: String(record.mk2PaidAmount || 0),
  mk2PaidMethod: record.mk2PaidMethod || '',
  mk2PaidBy: record.mk2PaidBy || '',
  mk2PaidAt: record.mk2PaidAt || '',
  knPaidAmount: String(record.knPaidAmount || 0),
  knPaidMethod: record.knPaidMethod || '',
  knPaidBy: record.knPaidBy || '',
  knPaidAt: record.knPaidAt || '',
  deadline: record.deadline || '',
  note: record.note || '',
})

const normalizeMessage = async <T,>(res: Response, fallback: string): Promise<T> => {
  const payload = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(payload?.error || fallback)
  }
  return payload as T
}

export function AdminRecords() {
  const { currentUser } = useData()
  const [activeSection, setActiveSection] = useState<'money' | 'books'>('money')
  const [moneyEntries, setMoneyEntries] = useState<PersonalMoneyEntry[]>([])
  const [bookRecords, setBookRecords] = useState<BookMoneyRecord[]>([])
  const [moneyMonth, setMoneyMonth] = useState(currentMonth())
  const [moneyYear, setMoneyYear] = useState(currentYear())
  const [bookMonth, setBookMonth] = useState(currentMonth())
  const [bookYear, setBookYear] = useState(currentYear())
  const [selectedBillId, setSelectedBillId] = useState('')
  const [editingBookId, setEditingBookId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [moneyForm, setMoneyForm] = useState<MoneyForm>({
    date: today(),
    kind: 'expense',
    category: '',
    amount: '',
    counterparty: '',
    description: '',
  })
  const [bookForm, setBookForm] = useState<BookForm>(() => defaultBookForm())

  const authHeaders = (): Record<string, string> => currentUser ? { 'x-user-id': currentUser.id } : {}

  const loadRecords = async () => {
    if (currentUser?.role !== 'admin') return

    try {
      setIsLoading(true)
      setError('')
      const [moneyRes, booksRes] = await Promise.all([
        fetch('/api/personal-money', { headers: authHeaders(), cache: 'no-store' }),
        fetch('/api/book-money', { headers: authHeaders(), cache: 'no-store' }),
      ])
      const [moneyData, booksData] = await Promise.all([
        normalizeMessage<PersonalMoneyEntry[]>(moneyRes, 'Failed to load personal money'),
        normalizeMessage<BookMoneyRecord[]>(booksRes, 'Failed to load book money'),
      ])
      setMoneyEntries(moneyData)
      setBookRecords(booksData)
      if (!selectedBillId && booksData[0]) {
        setSelectedBillId(booksData[0].id)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load admin records')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRecords()
  }, [currentUser?.id])

  useEffect(() => {
    if (editingBookId) return
    setBookForm((prev) => ({
      ...prev,
      englishVolumes: prev.bookType === 'HWMR' ? '2' : '1',
      hindiVolumes: '1',
    }))
  }, [bookForm.bookType, editingBookId])

  const monthlyMoney = useMemo(
    () => moneyEntries.filter((entry) => entry.month === moneyMonth),
    [moneyEntries, moneyMonth],
  )

  const yearlyMoney = useMemo(
    () => moneyEntries.filter((entry) => entry.year === moneyYear),
    [moneyEntries, moneyYear],
  )

  const moneyStats = useMemo(() => {
    const totalFor = (kind: PersonalMoneyKind) =>
      monthlyMoney.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.amount, 0)
    const spentByCategory = monthlyMoney
      .filter((entry) => entry.kind === 'expense' || entry.kind === 'given' || entry.kind === 'receivable')
      .reduce<Record<string, number>>((acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + entry.amount
        return acc
      }, {})

    return {
      income: totalFor('income') + totalFor('received') + totalFor('settled'),
      spending: totalFor('expense') + totalFor('given') + totalFor('receivable'),
      receivable: totalFor('receivable'),
      categoryRows: Object.entries(spentByCategory).sort((a, b) => b[1] - a[1]),
    }
  }, [monthlyMoney])

  const yearlyMoneyStats = useMemo(() => ({
    income: yearlyMoney
      .filter((entry) => entry.kind === 'income' || entry.kind === 'received' || entry.kind === 'settled')
      .reduce((sum, entry) => sum + entry.amount, 0),
    spending: yearlyMoney
      .filter((entry) => entry.kind === 'expense' || entry.kind === 'given' || entry.kind === 'receivable')
      .reduce((sum, entry) => sum + entry.amount, 0),
  }), [yearlyMoney])

  const monthlyBooks = useMemo(
    () => bookRecords.filter((record) => record.month === bookMonth),
    [bookRecords, bookMonth],
  )

  const yearlyBooks = useMemo(
    () => bookRecords.filter((record) => record.year === bookYear),
    [bookRecords, bookYear],
  )

  const selectedBill = useMemo(
    () => bookRecords.find((record) => record.id === selectedBillId) || monthlyBooks[0] || bookRecords[0] || null,
    [bookRecords, monthlyBooks, selectedBillId],
  )

  const yearlyBookTotal = yearlyBooks.reduce((sum, record) => sum + bookGrandTotal(record), 0)

  const addMoney = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!currentUser) return

    try {
      setError('')
      setNotice('')
      const res = await fetch('/api/personal-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(moneyForm),
      })
      const entry = await normalizeMessage<PersonalMoneyEntry>(res, 'Failed to save personal money')
      setMoneyEntries((prev) => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
      setMoneyMonth(entry.month)
      setMoneyYear(entry.year)
      setMoneyForm({ date: today(), kind: 'expense', category: '', amount: '', counterparty: '', description: '' })
      setNotice('Personal money record saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save personal money')
    }
  }

  const saveBookRecord = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!currentUser) return

    try {
      setError('')
      setNotice('')
      const res = await fetch('/api/book-money', {
        method: editingBookId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...bookForm, id: editingBookId || undefined }),
      })
      const record = await normalizeMessage<BookMoneyRecord>(res, 'Failed to save book money')
      setBookRecords((prev) => {
        const next = editingBookId
          ? prev.map((entry) => entry.id === record.id ? record : entry)
          : [record, ...prev]

        return next.sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt))
      })
      setBookMonth(record.month)
      setBookYear(record.year)
      setSelectedBillId(record.id)
      setEditingBookId('')
      setBookForm(defaultBookForm())
      setNotice(editingBookId ? 'Book money record updated.' : 'Book money record saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save book money')
    }
  }

  const startEditingBook = (record: BookMoneyRecord) => {
    setEditingBookId(record.id)
    setSelectedBillId(record.id)
    setBookForm(recordToBookForm(record))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditingBook = () => {
    setEditingBookId('')
    setBookForm(defaultBookForm())
  }

  const deleteRecord = async (type: 'money' | 'book', id: string) => {
    try {
      setError('')
      const endpoint = type === 'money' ? 'personal-money' : 'book-money'
      const res = await fetch(`/api/${endpoint}?id=${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      await normalizeMessage<{ success: boolean }>(res, 'Failed to delete record')
      if (type === 'money') {
        setMoneyEntries((prev) => prev.filter((entry) => entry.id !== id))
      } else {
        setBookRecords((prev) => prev.filter((record) => record.id !== id))
        if (selectedBillId === id) setSelectedBillId('')
      }
      setNotice('Record deleted.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete record')
    }
  }

  const copyBill = async () => {
    const bill = document.getElementById('book-bill-copy')
    if (!bill || !selectedBill) return

    const plainText = recordDistricts.map((district) => {
      const total = districtTotal(selectedBill, district)
      return `${district.label}: English ${total.english}, Hindi ${total.hindi}, Total ${total.quantity}, Amount ${formatCurrency(total.amount)}, Paid ${formatCurrency(total.paid)}, Remaining ${formatCurrency(total.remaining)}`
    }).join('\n')

    const deadlineText = selectedBill.deadline ? `\nDeadline: ${selectedBill.deadline}` : ''
    const fullText = `${selectedBill.bookType} Bill - ${selectedBill.bookName}\n${monthLabel(selectedBill.month)}\nEnglish: ${selectedBill.englishVolumes || 1} volume(s) x ${formatCurrency(selectedBill.englishPrice || selectedBill.unitPrice)}\nHindi: ${selectedBill.hindiVolumes || 1} volume(s) x ${formatCurrency(selectedBill.hindiPrice || selectedBill.unitPrice)}${deadlineText}\n\n${plainText}\n\nSouth Delhi Total: ${formatCurrency(bookGrandTotal(selectedBill))}\nCollected: ${formatCurrency(bookCollectedTotal(selectedBill))}\nRemaining: ${formatCurrency(bookRemainingTotal(selectedBill))}`

    try {
      if (navigator.clipboard && 'ClipboardItem' in window) {
        const item = new ClipboardItem({
          'text/html': new Blob([bill.innerHTML], { type: 'text/html' }),
          'text/plain': new Blob([fullText], { type: 'text/plain' }),
        })
        await navigator.clipboard.write([item])
      } else {
        await navigator.clipboard.writeText(fullText)
      }
      setNotice('Bill copied.')
    } catch {
      await navigator.clipboard.writeText(fullText)
      setNotice('Bill copied as plain text.')
    }
  }

  const exportBillPNG = async () => {
    const bill = document.getElementById('book-bill-copy')
    if (!bill || !selectedBill) return

    const canvas = await html2canvas(bill, {
      backgroundColor: '#ffffff',
      scale: 3,
      useCORS: true,
      logging: false,
      width: bill.scrollWidth,
      height: bill.scrollHeight,
      windowWidth: bill.scrollWidth,
      windowHeight: bill.scrollHeight,
    })
    const link = document.createElement('a')
    link.download = `book-bill-${selectedBill.month}-${selectedBill.bookType}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="app-panel rounded-3xl p-6 text-sm">
        This area is only available for admins.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Admin Records</h2>
            <p className="app-muted mt-1 text-sm">Private money management and South Delhi book money records.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('money')}
              className={`app-button ${activeSection === 'money' ? 'app-button-primary' : 'app-button-ghost'}`}
            >
              Personal Money
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('books')}
              className={`app-button ${activeSection === 'books' ? 'app-button-primary' : 'app-button-ghost'}`}
            >
              Books Money
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {isLoading && <div className="app-panel rounded-2xl px-4 py-3 text-sm">Loading admin records...</div>}

      {activeSection === 'money' ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="app-panel rounded-3xl p-6">
              <h3 className="mb-4 text-lg font-semibold">Add Money Record</h3>
              <form onSubmit={addMoney} className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  Date
                  <input type="date" value={moneyForm.date} onChange={(e) => setMoneyForm((prev) => ({ ...prev, date: e.target.value }))} className="app-input mt-1 w-full" required />
                </label>
                <label className="block text-sm font-medium">
                  Type
                  <select value={moneyForm.kind} onChange={(e) => setMoneyForm((prev) => ({ ...prev, kind: e.target.value as PersonalMoneyKind }))} className="app-input mt-1 w-full">
                    {moneyKinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Category
                  <input value={moneyForm.category} onChange={(e) => setMoneyForm((prev) => ({ ...prev, category: e.target.value }))} className="app-input mt-1 w-full" placeholder="Food, travel, offering, books..." />
                </label>
                <label className="block text-sm font-medium">
                  Amount
                  <input type="number" min="0" step="0.01" value={moneyForm.amount} onChange={(e) => setMoneyForm((prev) => ({ ...prev, amount: e.target.value }))} className="app-input mt-1 w-full" required />
                </label>
                <label className="block text-sm font-medium">
                  Person
                  <input value={moneyForm.counterparty} onChange={(e) => setMoneyForm((prev) => ({ ...prev, counterparty: e.target.value }))} className="app-input mt-1 w-full" placeholder="Who gave / received / owes" />
                </label>
                <label className="block text-sm font-medium md:col-span-2">
                  Description
                  <textarea value={moneyForm.description} onChange={(e) => setMoneyForm((prev) => ({ ...prev, description: e.target.value }))} className="app-input mt-1 min-h-[90px] w-full resize-y" placeholder="What happened?" />
                </label>
                <div className="md:col-span-2">
                  <button type="submit" className="app-button app-button-primary">Save Money Record</button>
                </div>
              </form>
            </div>

            <div className="app-panel rounded-3xl p-6">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Month
                  <input type="month" value={moneyMonth} onChange={(e) => setMoneyMonth(e.target.value)} className="app-input mt-1 w-full" />
                </label>
                <label className="block text-sm font-medium">
                  Year
                  <input value={moneyYear} onChange={(e) => setMoneyYear(e.target.value.slice(0, 4))} className="app-input mt-1 w-full" placeholder="2026" />
                </label>
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="app-muted text-xs font-semibold uppercase">Monthly In</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(moneyStats.income)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="app-muted text-xs font-semibold uppercase">Monthly Out</div>
                  <div className="mt-1 text-2xl font-bold text-red-700">{formatCurrency(moneyStats.spending)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="app-muted text-xs font-semibold uppercase">Need To Receive</div>
                  <div className="mt-1 text-2xl font-bold text-[var(--primary-strong)]">{formatCurrency(moneyStats.receivable)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="app-muted text-xs font-semibold uppercase">Year Net</div>
                  <div className="mt-1 text-2xl font-bold">{formatCurrency(yearlyMoneyStats.income - yearlyMoneyStats.spending)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Spending By Category - {monthLabel(moneyMonth)}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {moneyStats.categoryRows.map(([category, total]) => (
                <div key={category} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="font-semibold">{category}</div>
                  <div className="mt-1 text-xl font-bold text-red-700">{formatCurrency(total)}</div>
                </div>
              ))}
              {moneyStats.categoryRows.length === 0 && <p className="app-muted text-sm">No spending recorded for this month.</p>}
            </div>
          </div>

          <div className="app-panel rounded-3xl p-6">
            <h3 className="mb-4 text-lg font-semibold">Recent Personal Money Records</h3>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[var(--surface-soft)]">
                  <tr>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Person</th>
                    <th className="p-3 text-right font-semibold">Amount</th>
                    <th className="p-3 font-semibold">Description</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {moneyEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-[var(--border)]">
                      <td className="p-3">{entry.date}</td>
                      <td className="p-3">{moneyKinds.find((kind) => kind.id === entry.kind)?.label || entry.kind}</td>
                      <td className="p-3">{entry.category}</td>
                      <td className="p-3">{entry.counterparty || '-'}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(entry.amount)}</td>
                      <td className="p-3">{entry.description}</td>
                      <td className="p-3 text-right">
                        <button type="button" onClick={() => void deleteRecord('money', entry.id)} className="app-button app-button-ghost p-2" title="Delete record">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {moneyEntries.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-sm app-muted">No personal money records yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="app-panel rounded-3xl p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-lg font-semibold">{editingBookId ? 'Edit Books Money Record' : 'Add Books Money Record'}</h3>
              {editingBookId && (
                <button type="button" onClick={cancelEditingBook} className="app-button app-button-ghost">
                  <X size={16} />
                  <span>Cancel Edit</span>
                </button>
              )}
            </div>
            <form onSubmit={saveBookRecord} className="grid gap-4 md:grid-cols-4">
              <label className="block text-sm font-medium">
                Month
                <input type="month" value={bookForm.month} onChange={(e) => setBookForm((prev) => ({ ...prev, month: e.target.value }))} className="app-input mt-1 w-full" required />
              </label>
              <label className="block text-sm font-medium">
                Book Type
                <select value={bookForm.bookType} onChange={(e) => setBookForm((prev) => ({ ...prev, bookType: e.target.value as 'HWMR' | 'LS' }))} className="app-input mt-1 w-full">
                  <option value="HWMR">HWMR</option>
                  <option value="LS">Life Study</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                English Price
                <input type="number" min="0" step="0.01" value={bookForm.englishPrice || bookForm.unitPrice} onChange={(e) => setBookForm((prev) => ({ ...prev, englishPrice: e.target.value, unitPrice: e.target.value }))} className="app-input mt-1 w-full" required />
              </label>
              <label className="block text-sm font-medium">
                Hindi Price
                <input type="number" min="0" step="0.01" value={bookForm.hindiPrice} onChange={(e) => setBookForm((prev) => ({ ...prev, hindiPrice: e.target.value }))} className="app-input mt-1 w-full" required />
              </label>
              <label className="block text-sm font-medium md:col-span-2">
                Book Name
                <input value={bookForm.bookName} onChange={(e) => setBookForm((prev) => ({ ...prev, bookName: e.target.value }))} className="app-input mt-1 w-full" placeholder="Book / volume / set name" required />
              </label>
              <label className="block text-sm font-medium">
                Price Label
                <input value={bookForm.priceLabel} onChange={(e) => setBookForm((prev) => ({ ...prev, priceLabel: e.target.value }))} className="app-input mt-1 w-full" placeholder="per book / per set" />
              </label>
              <label className="block text-sm font-medium">
                English Volumes
                <input type="number" min="1" value={bookForm.englishVolumes} onChange={(e) => setBookForm((prev) => ({ ...prev, englishVolumes: e.target.value }))} className="app-input mt-1 w-full" />
              </label>
              <label className="block text-sm font-medium">
                Hindi Volumes
                <input type="number" min="1" value={bookForm.hindiVolumes} onChange={(e) => setBookForm((prev) => ({ ...prev, hindiVolumes: e.target.value }))} className="app-input mt-1 w-full" />
              </label>
              <label className="block text-sm font-medium">
                Payment Deadline
                <input type="date" value={bookForm.deadline} onChange={(e) => setBookForm((prev) => ({ ...prev, deadline: e.target.value }))} className="app-input mt-1 w-full" />
              </label>

              {recordDistricts.map((district) => (
                <div key={district.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 md:col-span-4">
                  <div className="mb-3 font-semibold">{district.label}</div>
                  <div className="grid gap-3 md:grid-cols-6">
                    <label className="block text-sm font-medium">
                      English
                      <input type="number" min="0" value={bookForm[district.english]} onChange={(e) => setBookForm((prev) => ({ ...prev, [district.english]: e.target.value }))} className="app-input mt-1 w-full" />
                    </label>
                    <label className="block text-sm font-medium">
                      Hindi
                      <input type="number" min="0" value={bookForm[district.hindi]} onChange={(e) => setBookForm((prev) => ({ ...prev, [district.hindi]: e.target.value }))} className="app-input mt-1 w-full" />
                    </label>
                    <label className="block text-sm font-medium">
                      Paid Amount
                      <input type="number" min="0" step="0.01" value={bookForm[district.paidAmount]} onChange={(e) => setBookForm((prev) => ({ ...prev, [district.paidAmount]: e.target.value }))} className="app-input mt-1 w-full" />
                    </label>
                    <label className="block text-sm font-medium">
                      Method
                      <select value={bookForm[district.paidMethod]} onChange={(e) => setBookForm((prev) => ({ ...prev, [district.paidMethod]: e.target.value }))} className="app-input mt-1 w-full">
                        <option value="">Not paid</option>
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                      </select>
                    </label>
                    <label className="block text-sm font-medium">
                      Paid By
                      <input value={bookForm[district.paidBy]} onChange={(e) => setBookForm((prev) => ({ ...prev, [district.paidBy]: e.target.value }))} className="app-input mt-1 w-full" />
                    </label>
                    <label className="block text-sm font-medium">
                      Paid On
                      <input type="date" value={bookForm[district.paidAt]} onChange={(e) => setBookForm((prev) => ({ ...prev, [district.paidAt]: e.target.value }))} className="app-input mt-1 w-full" />
                    </label>
                  </div>
                </div>
              ))}

              <label className="block text-sm font-medium md:col-span-4">
                Note
                <textarea value={bookForm.note} onChange={(e) => setBookForm((prev) => ({ ...prev, note: e.target.value }))} className="app-input mt-1 min-h-[80px] w-full resize-y" />
              </label>
              <div className="md:col-span-4">
                <button type="submit" className="app-button app-button-primary">{editingBookId ? 'Update Books Record' : 'Save Books Record'}</button>
              </div>
            </form>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="app-panel rounded-3xl p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <h3 className="text-lg font-semibold">Books Records</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium">
                    Month
                    <input type="month" value={bookMonth} onChange={(e) => setBookMonth(e.target.value)} className="app-input mt-1 w-full" />
                  </label>
                  <label className="block text-sm font-medium">
                    Year
                    <input value={bookYear} onChange={(e) => setBookYear(e.target.value.slice(0, 4))} className="app-input mt-1 w-full" />
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="bg-[var(--surface-soft)]">
                    <tr>
                      <th className="p-3 font-semibold">Month</th>
                      <th className="p-3 font-semibold">Book</th>
                      <th className="p-3 font-semibold">Price</th>
                      <th className="p-3 text-right font-semibold">MK1</th>
                      <th className="p-3 text-right font-semibold">MK2</th>
                      <th className="p-3 text-right font-semibold">KN</th>
                      <th className="p-3 text-right font-semibold">South Delhi</th>
                      <th className="p-3 text-right font-semibold">Collected</th>
                      <th className="p-3 text-right font-semibold">Remaining</th>
                      <th className="p-3 font-semibold">Deadline</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookRecords.map((record) => (
                      <tr key={record.id} className="border-t border-[var(--border)]">
                        <td className="p-3">{monthLabel(record.month)}</td>
                        <td className="p-3">
                          <button type="button" onClick={() => setSelectedBillId(record.id)} className="text-left font-semibold text-[var(--primary-strong)]">
                            {record.bookType} - {record.bookName}
                          </button>
                        </td>
                        <td className="p-3">
                          <div>English: {record.englishVolumes || 1} x {formatCurrency(record.englishPrice || record.unitPrice)}</div>
                          <div>Hindi: {record.hindiVolumes || 1} x {formatCurrency(record.hindiPrice || record.unitPrice)}</div>
                        </td>
                        {recordDistricts.map((district) => (
                          <td key={district.id} className="p-3 text-right">
                            <div className="font-semibold">{formatCurrency(districtTotal(record, district).amount)}</div>
                            <div className="app-muted text-xs">{districtTotal(record, district).paidStatus}</div>
                          </td>
                        ))}
                        <td className="p-3 text-right font-bold">{formatCurrency(bookGrandTotal(record))}</td>
                        <td className="p-3 text-right font-semibold text-emerald-700">{formatCurrency(bookCollectedTotal(record))}</td>
                        <td className="p-3 text-right font-semibold text-red-700">{formatCurrency(bookRemainingTotal(record))}</td>
                        <td className="p-3">{record.deadline || '-'}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => startEditingBook(record)} className="app-button app-button-ghost p-2" title="Edit record">
                              <Pencil size={16} />
                            </button>
                            <button type="button" onClick={() => void deleteRecord('book', record.id)} className="app-button app-button-ghost p-2" title="Delete record">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bookRecords.length === 0 && (
                      <tr><td colSpan={11} className="p-4 text-sm app-muted">No book records yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="app-panel rounded-3xl p-6">
              <h3 className="mb-4 text-lg font-semibold">Books Summary</h3>
              <div className="space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="app-muted text-xs font-semibold uppercase">{monthLabel(bookMonth)}</div>
                  <div className="mt-1 text-2xl font-bold">{formatCurrency(monthlyBooks.reduce((sum, record) => sum + bookGrandTotal(record), 0))}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="app-muted text-xs font-semibold uppercase">{bookYear} Total</div>
                  <div className="mt-1 text-2xl font-bold">{formatCurrency(yearlyBookTotal)}</div>
                </div>
                {selectedBill && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="app-muted text-xs font-semibold uppercase">Selected Bill Balance</div>
                    <div className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(bookCollectedTotal(selectedBill))} collected</div>
                    <div className="mt-1 text-xl font-bold text-red-700">{formatCurrency(bookRemainingTotal(selectedBill))} remaining</div>
                  </div>
                )}
                {selectedBill && (
                  <>
                    <label className="block text-sm font-medium">
                      Bill
                      <select value={selectedBill.id} onChange={(e) => setSelectedBillId(e.target.value)} className="app-input mt-1 w-full">
                        {bookRecords.map((record) => (
                          <option key={record.id} value={record.id}>{record.month} - {record.bookType} - {record.bookName}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void copyBill()} className="app-button app-button-secondary flex flex-1 items-center justify-center gap-2">
                        <Clipboard size={16} />
                        <span>Copy</span>
                      </button>
                      <button type="button" onClick={() => void exportBillPNG()} className="app-button app-button-primary flex flex-1 items-center justify-center gap-2">
                        <FileImage size={16} />
                        <span>PNG</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {selectedBill && (
            <div className="app-panel rounded-3xl p-6">
              <h3 className="mb-4 text-lg font-semibold">Final Bill Preview</h3>
              <div className="overflow-x-auto">
                <div id="book-bill-copy" className="w-[900px] bg-white p-8 text-black">
                  <div style={{ border: '1px solid #d7dde5', padding: 24, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, borderBottom: '1px solid #d7dde5', paddingBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#64748b' }}>SOUTH DELHI BOOK MONEY</div>
                        <h2 style={{ margin: '8px 0 4px', fontSize: 30, color: '#0f172a' }}>{selectedBill.bookType} Bill</h2>
                        <div style={{ fontSize: 18, color: '#334155' }}>{selectedBill.bookName}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 16 }}>
                        <div><strong>Month:</strong> {monthLabel(selectedBill.month)}</div>
                        <div><strong>Price:</strong> {formatCurrency(selectedBill.unitPrice)} {selectedBill.priceLabel}</div>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20, fontSize: 16 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'left' }}>District</th>
                          <th style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right' }}>English</th>
                          <th style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right' }}>Hindi</th>
                          <th style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right' }}>Total Copies</th>
                          <th style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recordDistricts.map((district) => {
                          const total = districtTotal(selectedBill, district)
                          return (
                            <tr key={`bill-${district.id}`}>
                              <td style={{ border: '1px solid #d7dde5', padding: 12, fontWeight: 700 }}>{district.label}</td>
                              <td style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right' }}>{total.english}</td>
                              <td style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right' }}>{total.hindi}</td>
                              <td style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right' }}>{total.quantity}</td>
                              <td style={{ border: '1px solid #d7dde5', padding: 12, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(total.amount)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} style={{ border: '1px solid #d7dde5', padding: 14, textAlign: 'right', fontWeight: 800 }}>South Delhi Total</td>
                          <td style={{ border: '1px solid #d7dde5', padding: 14, textAlign: 'right', fontSize: 20, fontWeight: 800 }}>{formatCurrency(bookGrandTotal(selectedBill))}</td>
                        </tr>
                      </tfoot>
                    </table>
                    {selectedBill.note && <div style={{ marginTop: 16, color: '#475569' }}><strong>Note:</strong> {selectedBill.note}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
