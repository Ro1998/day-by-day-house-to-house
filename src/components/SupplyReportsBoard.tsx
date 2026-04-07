'use client'

import { useMemo, useState } from 'react'
import { useData } from '@/components/DataProvider'

const STATUS_STYLES = {
  missing: 'bg-sky-100 text-sky-800 border-sky-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
} as const

export function SupplyReportsBoard() {
  const { supplyReports, addSupplyReport, updateSupplyReport, users, currentUser } = useData()
  const [form, setForm] = useState({
    title: '',
    category: 'grocery' as 'grocery' | 'vegetable',
    itemName: '',
    message: '',
    status: 'missing' as 'missing' | 'urgent' | 'resolved',
  })
  const [responses, setResponses] = useState<Record<string, { status: 'missing' | 'urgent' | 'resolved'; response: string }>>({})

  const coordinatorContacts = useMemo(() => {
    const coordinators = users
      .filter((user) => user.approved && user.role === 'coordinator' && user.phone)
      .map((user) => ({ name: user.name, phone: user.phone as string, role: 'Coordinator' }))

    if (coordinators.length > 0) {
      return coordinators
    }

    return users
      .filter((user) => user.approved && user.role === 'admin' && user.phone)
      .map((user) => ({ name: user.name, phone: user.phone as string, role: 'Admin' }))
  }, [users])
  const canRespond = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addSupplyReport(form)
    setForm({ title: '', category: 'grocery', itemName: '', message: '', status: 'missing' })
  }

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-2 text-xl font-semibold">Missing or Going To Finish</h2>
        <p className="app-muted text-sm">
          Everyone can report what is missing or finishing. Coordinators and admins can reply and mark it resolved.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-sky-800">Blue: Missing</span>
          <span className="rounded-full border border-red-200 bg-red-100 px-3 py-1 text-red-800">Red: Urgent</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-emerald-800">Green: Resolved</span>
        </div>
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <div className="text-sm font-semibold text-[var(--primary-strong)]">Coordinator Contact</div>
          {coordinatorContacts.length > 0 ? (
            <div className="mt-2 space-y-1 text-sm">
              {coordinatorContacts.map((entry) => (
                <div key={entry.phone}>
                  <span className="font-medium">{entry.role} {entry.name}</span>: {entry.phone}
                </div>
              ))}
            </div>
          ) : (
            <div className="app-muted mt-2 text-sm">No coordinator phone number has been added yet.</div>
          )}
        </div>
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h3 className="mb-4 text-lg font-semibold">Report Something Missing</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input className="app-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Short title" required />
            <select className="app-input" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as 'grocery' | 'vegetable' }))}>
              <option value="grocery">Grocery</option>
              <option value="vegetable">Vegetable</option>
            </select>
            <input className="app-input" value={form.itemName} onChange={(e) => setForm((prev) => ({ ...prev, itemName: e.target.value }))} placeholder="Item name, optional" />
            <select className="app-input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'missing' | 'urgent' | 'resolved' }))}>
              <option value="missing">Missing</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <textarea className="app-input min-h-[120px]" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="What is missing or going to finish?" required />
          <button type="submit" className="app-button app-button-primary">Post Report</button>
        </form>
      </div>

      <div className="space-y-4">
        {supplyReports.map((report) => {
          const draft = responses[report.id] ?? { status: report.status, response: report.response ?? '' }
          return (
            <div key={report.id} className="app-panel rounded-3xl p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{report.title}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[report.status]}`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="app-muted mt-1 text-sm">
                    {report.category} {report.itemName ? `| ${report.itemName}` : ''} | Reported by {report.createdBy}
                  </p>
                  <p className="mt-3 text-sm">{report.message}</p>
                  {report.response && (
                    <div className="mt-4 rounded-2xl bg-[var(--surface-soft)] p-4">
                      <div className="text-sm font-semibold text-[var(--primary-strong)]">CO/Admin Reply</div>
                      <div className="app-muted mt-1 text-sm">{report.response}</div>
                    </div>
                  )}
                </div>

                {canRespond && (
                  <div className="w-full max-w-sm space-y-3">
                    <select
                      className="app-input"
                      value={draft.status}
                      onChange={(e) => setResponses((prev) => ({
                        ...prev,
                        [report.id]: { ...draft, status: e.target.value as 'missing' | 'urgent' | 'resolved' },
                      }))}
                    >
                      <option value="missing">Missing</option>
                      <option value="urgent">Urgent</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <textarea
                      className="app-input min-h-[100px]"
                      value={draft.response}
                      onChange={(e) => setResponses((prev) => ({
                        ...prev,
                        [report.id]: { ...draft, response: e.target.value },
                      }))}
                      placeholder="Reply to this report"
                    />
                    <button
                      type="button"
                      onClick={() => void updateSupplyReport({ id: report.id, status: draft.status, response: draft.response })}
                      className="app-button app-button-secondary"
                    >
                      Save Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {supplyReports.length === 0 && (
          <div className="app-panel rounded-3xl p-6">
            <p className="app-muted text-sm">No supply reports have been posted yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
