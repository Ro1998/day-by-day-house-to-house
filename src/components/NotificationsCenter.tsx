'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'

export function NotificationsCenter() {
  const { notifications, unreadNotifications, markNotificationAsRead, addNotification, updateNotification, deleteNotification, currentUser } = useData()
  const [form, setForm] = useState({ title: '', message: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const canSend = currentUser?.role === 'admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      await updateNotification(editingId, { title: form.title, message: form.message })
      setEditingId(null)
    } else {
      await addNotification({ title: form.title, message: form.message, category: 'general' })
    }
    setForm({ title: '', message: '' })
  }

  return (
    <div className="space-y-6">
      {canSend && (
        <div className="app-panel rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-semibold">{editingId ? 'Edit Notification' : 'Send Notification'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="app-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" required />
            <textarea className="app-input min-h-[140px]" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Message for everyone" required />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
              Notifications will be sent via email to all approved users with email addresses.
            </div>
            <div className="flex gap-3">
              <button type="submit" className="app-button app-button-primary">
                {editingId ? 'Update Notification' : 'Send To Everyone'}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', message: '' }) }} className="app-button app-button-ghost">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">All Notifications</h2>
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = unreadNotifications.some(n => n.id === notification.id)
            return (
            <div 
              key={notification.id} 
              className={`rounded-2xl border ${isUnread ? 'border-[var(--primary)] bg-[var(--primary)]/5 cursor-pointer' : 'border-[var(--border)] bg-[var(--surface-soft)]'} p-4`}
              onClick={() => isUnread && markNotificationAsRead(notification.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">
                  {notification.title}
                  {isUnread && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-[var(--primary-strong)]"></span>}
                </h3>
                <span className="app-muted text-xs">{new Date(notification.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm">{notification.message}</p>
              <p className="app-muted mt-2 text-xs">From {notification.createdBy}</p>
              {canSend && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingId(notification.id)
                      setForm({ title: notification.title, message: notification.message })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                    className="app-button app-button-ghost px-3 py-1.5 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if(confirm('Are you sure you want to delete this notification?')) {
                        deleteNotification(notification.id)
                      }
                    }}
                    className="app-button border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 text-xs"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )})}
          {notifications.length === 0 && <p className="app-muted text-sm">No notifications sent yet.</p>}
        </div>
      </div>
    </div>
  )
}
