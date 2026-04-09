'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Trash2 } from 'lucide-react'

export function NotificationsCenter() {
  const { notifications, unreadNotifications, markNotificationAsRead, addNotification, updateNotification, deleteNotification, currentUser, users } = useData()
  const [form, setForm] = useState({ title: '', message: '', recipientMode: 'everyone' as 'everyone' | 'specific', recipientUserIds: [] as string[] })
  const [editingNotification, setEditingNotification] = useState<{ id: string; title: string; message: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)
  const canSend = currentUser?.role === 'admin' || currentUser?.role === 'overseer'
  const canManageNotifications = currentUser?.role === 'admin'
  const approvedRecipients = users.filter((user) => user.approved)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await addNotification({
      title: form.title,
      message: form.message,
      category: 'general',
      recipientUserIds: form.recipientMode === 'specific' ? form.recipientUserIds : undefined,
    })
    setForm({ title: '', message: '', recipientMode: 'everyone', recipientUserIds: [] })
  }

  return (
    <div className="space-y-6">
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4">
          <div className="app-panel w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-semibold text-red-700">Delete Notification?</h3>
            <p className="app-muted mb-6 text-sm">
              This will remove <span className="font-semibold text-[var(--text)]">"{pendingDelete.title}"</span> for everyone.
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
                onClick={async () => {
                  await deleteNotification(pendingDelete.id)
                  setPendingDelete(null)
                }}
                className="app-button inline-flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 size={16} />
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editingNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4">
          <div className="app-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-semibold">Edit Notification</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                await updateNotification(editingNotification.id, {
                  title: editingNotification.title,
                  message: editingNotification.message,
                })
                setEditingNotification(null)
              }}
              className="space-y-4"
            >
              <input
                className="app-input"
                value={editingNotification.title}
                onChange={(e) => setEditingNotification({ ...editingNotification, title: e.target.value })}
                placeholder="Title"
                required
              />
                {editingNotification.message.startsWith('[MENU_IMAGE]') ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    This is an image notification. Editing the text will break the image unless you know what you are doing.
                  </div>
                ) : null}
              <textarea
                className="app-input min-h-[140px]"
                value={editingNotification.message}
                onChange={(e) => setEditingNotification({ ...editingNotification, message: e.target.value })}
                placeholder="Message for everyone"
                required
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingNotification(null)}
                  className="app-button app-button-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="app-button app-button-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {canSend && (
        <div className="app-panel rounded-3xl p-6">
          <h2 className="mb-4 text-xl font-semibold">Send Notification</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="app-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" required />
            <textarea className="app-input min-h-[140px]" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder={form.recipientMode === 'everyone' ? 'Message for everyone' : 'Message for selected people'} required />
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <div className="mb-3 text-sm font-semibold text-[var(--primary-strong)]">Recipients</div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.recipientMode === 'everyone'}
                    onChange={() => setForm((prev) => ({ ...prev, recipientMode: 'everyone', recipientUserIds: [] }))}
                  />
                  Everyone
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.recipientMode === 'specific'}
                    onChange={() => setForm((prev) => ({ ...prev, recipientMode: 'specific' }))}
                  />
                  Specific people
                </label>
              </div>
              {form.recipientMode === 'specific' && (
                <div className="mt-4 space-y-2">
                  {approvedRecipients.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.recipientUserIds.includes(user.id)}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          recipientUserIds: e.target.checked
                            ? [...prev.recipientUserIds, user.id]
                            : prev.recipientUserIds.filter((id) => id !== user.id),
                        }))}
                      />
                      <span>{user.name}</span>
                      {user.email && <span className="app-muted text-xs">({user.email})</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
              {form.recipientMode === 'everyone'
                ? 'Notifications will be shown in-app and sent by email to all approved users with email addresses.'
                : 'Notifications will be shown in-app and sent by email only to the selected approved users.'}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={form.recipientMode === 'specific' && form.recipientUserIds.length === 0}
                className="app-button app-button-primary"
              >
                {form.recipientMode === 'everyone' ? 'Send To Everyone' : 'Send To Selected People'}
              </button>
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
              {notification.message.startsWith('[MENU_IMAGE]') ? (
                <img src={notification.message.replace('[MENU_IMAGE]', '')} alt="Weekly Menu" className="mt-3 w-full rounded-xl border border-[var(--border)] object-contain max-h-96" />
              ) : (
                <p className="mt-2 text-sm">{notification.message}</p>
              )}
              <p className="app-muted mt-2 text-xs">From {notification.createdBy}</p>
              {canManageNotifications && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingNotification({ id: notification.id, title: notification.title, message: notification.message })
                    }}
                    className="app-button app-button-ghost px-3 py-1.5 text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDelete({ id: notification.id, title: notification.title })
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
