'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'

export function NotificationsCenter() {
  const { notifications, addNotification, currentUser } = useData()
  const [form, setForm] = useState({ title: '', message: '' })
  const canSend = currentUser?.role === 'admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addNotification({ title: form.title, message: form.message, category: 'general' })
    setForm({ title: '', message: '' })
  }

  return (
    <div className="space-y-6">
      {canSend && (
        <div className="app-panel rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-semibold">Send Notification</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="app-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" required />
            <textarea className="app-input min-h-[140px]" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Message for everyone" required />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
              Notifications will be sent via email to all approved users with email addresses.
            </div>
            <button type="submit" className="app-button app-button-primary">Send To Everyone</button>
          </form>
        </div>
      )}

      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">All Notifications</h2>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{notification.title}</h3>
                <span className="app-muted text-xs">{new Date(notification.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm">{notification.message}</p>
              <p className="app-muted mt-2 text-xs">From {notification.createdBy}</p>
            </div>
          ))}
          {notifications.length === 0 && <p className="app-muted text-sm">No notifications sent yet.</p>}
        </div>
      </div>
    </div>
  )
}
