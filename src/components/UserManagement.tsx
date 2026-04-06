'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import type { UserRole } from '@/types'

export function UserManagement() {
  const { users, updateUserAccess } = useData()
  const [drafts, setDrafts] = useState<Record<string, { role: UserRole; approved: boolean }>>({})

  const getDraft = (id: string, role: UserRole, approved: boolean) =>
    drafts[id] ?? { role, approved }

  const pendingUsers = users.filter((user) => !user.approved)
  const approvedUsers = users.filter((user) => user.approved)

  return (
    <div className="space-y-6">
      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-2 text-xl font-semibold">Pending Access Requests</h2>
        <p className="app-muted mb-6 text-sm">
          Only admins can approve accounts and assign each person&apos;s function.
        </p>

        {pendingUsers.length === 0 ? (
          <p className="app-muted text-sm">No pending requests right now.</p>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => {
              const draft = getDraft(user.id, user.role, user.approved)

              return (
                <div key={user.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold">{user.name}</div>
                      <div className="app-muted text-sm">Requested access</div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <select
                        value={draft.role}
                        onChange={(e) => {
                          const role = e.target.value as UserRole
                          setDrafts((prev) => ({
                            ...prev,
                            [user.id]: { ...draft, role },
                          }))
                        }}
                        className="app-input min-w-44"
                      >
                        <option value="user">General User</option>
                        <option value="coordinator">Coordinator (CO)</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => updateUserAccess({ id: user.id, role: draft.role, approved: true })}
                        className="app-button app-button-primary"
                      >
                        Approve User
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="app-panel rounded-3xl p-6">
        <h2 className="mb-4 text-xl font-semibold">Approved Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.map((user) => (
                <tr key={user.id} className="border-b border-[var(--border)]">
                  <td className="p-2">{user.name}</td>
                  <td className="p-2 capitalize">{user.role}</td>
                  <td className="p-2">Approved</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
