'use client'

import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import type { UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  coordinator: 'Coordinator',
  overseer: 'Overseer',
  user: 'General User',
}

export function UserManagement() {
  const { users, updateUserAccess, createAdminResetLink, deleteUser, addNotification, currentUser } = useData()
  const [drafts, setDrafts] = useState<Record<string, { role: UserRole; approved: boolean; phone?: string }>>({})
  const [resetLinks, setResetLinks] = useState<Record<string, { resetLink: string; expiresAt: string }>>({})
  const [pendingDeleteUser, setPendingDeleteUser] = useState<{ id: string; name: string } | null>(null)
  const [pendingAccessChange, setPendingAccessChange] = useState<{
    id: string
    name: string
    currentRole: UserRole
    nextRole: UserRole
    currentApproved: boolean
    nextApproved: boolean
    phone?: string
  } | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const getDraft = (id: string, role: UserRole, approved: boolean, phone?: string | null) =>
    drafts[id] ?? { role, approved, phone: phone ?? '' }

  const pendingUsers = users.filter((user) => !user.approved)
  const approvedUsers = users.filter((user) => user.approved)

  const applyUserAccessChange = async (change: NonNullable<typeof pendingAccessChange>) => {
    try {
      setBusyUserId(change.id)
      await updateUserAccess({
        id: change.id,
        role: change.nextRole,
        approved: change.nextApproved,
        phone: change.phone,
      })

      setDrafts((prev) => {
        const next = { ...prev }
        delete next[change.id]
        return next
      })

      if (change.currentRole !== change.nextRole) {
        await addNotification({
          title: 'Role Updated',
          message: `Your role changed from ${ROLE_LABELS[change.currentRole]} to ${ROLE_LABELS[change.nextRole]}.`,
          category: 'general',
          recipientUserIds: [change.id],
          skipEmail: true,
        })
      } else if (!change.currentApproved && change.nextApproved) {
        await addNotification({
          title: 'Account Approved',
          message: `Your account has been approved with the role ${ROLE_LABELS[change.nextRole]}.`,
          category: 'general',
          recipientUserIds: [change.id],
          skipEmail: true,
        })
      }
    } finally {
      setBusyUserId(null)
      setPendingAccessChange(null)
    }
  }

  return (
    <div className="space-y-6">
      {pendingDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4">
          <div className="app-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="mb-2 text-xl font-semibold text-red-700">Delete User?</h3>
            <p className="app-muted mb-6 text-sm">
              This will archive <span className="font-semibold text-[var(--text)]">{pendingDeleteUser.name}</span>. Their sign-in details will be removed, but their expenses, menus, activity, suggestions, and other history will stay in the system.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteUser(null)}
                disabled={busyUserId === pendingDeleteUser.id}
                className="app-button app-button-ghost disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setBusyUserId(pendingDeleteUser.id)
                    await deleteUser(pendingDeleteUser.id)
                    setPendingDeleteUser(null)
                  } finally {
                    setBusyUserId(null)
                  }
                }}
                disabled={busyUserId === pendingDeleteUser.id}
                className="app-button bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busyUserId === pendingDeleteUser.id ? 'Archiving...' : 'Yes, Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAccessChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4">
          <div className="app-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-semibold">Confirm Access Change</h3>
            <p className="app-muted mb-6 text-sm">
              {pendingAccessChange.nextApproved
                ? `Are you sure you want to ${pendingAccessChange.currentApproved ? 'update' : 'approve'} ${pendingAccessChange.name}${pendingAccessChange.currentRole !== pendingAccessChange.nextRole ? ` and change the role from ${ROLE_LABELS[pendingAccessChange.currentRole]} to ${ROLE_LABELS[pendingAccessChange.nextRole]}` : ` as ${ROLE_LABELS[pendingAccessChange.nextRole]}`}?`
                : `Are you sure you want to disapprove ${pendingAccessChange.name}?`}
            </p>
            {pendingAccessChange.currentRole !== pendingAccessChange.nextRole && (
              <div className="mb-5 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm">
                <span className="font-semibold">Role change: </span>
                {ROLE_LABELS[pendingAccessChange.currentRole]} to {ROLE_LABELS[pendingAccessChange.nextRole]}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAccessChange(null)}
                disabled={busyUserId === pendingAccessChange.id}
                className="app-button app-button-ghost disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void applyUserAccessChange(pendingAccessChange)}
                disabled={busyUserId === pendingAccessChange.id}
                className="app-button app-button-primary disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busyUserId === pendingAccessChange.id ? 'Saving...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-panel rounded-3xl p-6">
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-xl font-semibold">Pending Access Requests</h2>
          {pendingUsers.length > 0 && (
            <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white">
              {pendingUsers.length}
            </span>
          )}
        </div>
        <p className="app-muted mb-6 text-sm">
          Only admins can approve accounts and assign each person&apos;s function.
        </p>

        {pendingUsers.length === 0 ? (
          <p className="app-muted text-sm">No pending requests right now.</p>
        ) : (
          <div className="space-y-4">
            {pendingUsers.map((user) => {
              const draft = getDraft(user.id, user.role, user.approved, user.phone)

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
                        <option value="overseer">Overseer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={async () => {
                          setPendingAccessChange({
                            id: user.id,
                            name: user.name,
                            currentRole: user.role,
                            nextRole: draft.role,
                            currentApproved: user.approved,
                            nextApproved: true,
                            phone: draft.phone,
                          })
                        }}
                        disabled={busyUserId === user.id}
                    className="app-button app-button-primary flex-1 justify-center px-4 py-1.5 text-sm shadow-sm sm:flex-none"
                      >
                        {busyUserId === user.id ? 'Saving...' : 'Approve User'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteUser({ id: user.id, name: user.name })}
                        disabled={busyUserId === user.id}
                    className="app-button flex-1 justify-center border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 hover:text-red-800 sm:flex-none"
                      >
                        Delete User
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
                <th className="p-2 text-left">Username</th>
                <th className="p-2 text-left">Phone</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Password Reset</th>
                <th className="p-2 text-left">Access</th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.map((user) => (
                <tr key={user.id} className="border-b border-[var(--border)]">
                  {(() => {
                    const draft = getDraft(user.id, user.role, user.approved, user.phone)
                    return (
                      <>
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">{user.username || 'Not set yet'}</td>
                  <td className="p-2">
                    <input
                      value={draft.phone ?? ''}
                      onChange={(e) => setDrafts((prev) => ({
                        ...prev,
                        [user.id]: { ...draft, phone: e.target.value },
                      }))}
                      className="app-input min-w-36"
                      placeholder="Phone number"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={draft.role}
                      onChange={(e) => {
                        const role = e.target.value as UserRole
                        setDrafts((prev) => ({
                          ...prev,
                          [user.id]: { ...draft, role },
                        }))
                      }}
                      className="app-input min-w-32"
                    >
                      <option value="user">General User</option>
                      <option value="coordinator">Coordinator (CO)</option>
                      <option value="overseer">Overseer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-2">Approved</td>
                  <td className="p-2">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await createAdminResetLink(user.id)
                          if (!result) return
                          setResetLinks((prev) => ({
                            ...prev,
                            [user.id]: result,
                          }))
                        }}
                        className="app-button app-button-ghost px-3 py-2"
                        disabled={!user.username}
                      >
                        Create Reset Link
                      </button>
                      {resetLinks[user.id] && (
                        <div className="rounded-2xl bg-[var(--surface-soft)] p-3 text-xs">
                          <div className="mb-2 break-all font-medium text-[var(--primary-strong)]">
                            {resetLinks[user.id].resetLink}
                          </div>
                          <div className="app-muted">
                            Expires: {new Date(resetLinks[user.id].expiresAt).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={async () => {
                          setPendingAccessChange({
                            id: user.id,
                            name: user.name,
                            currentRole: user.role,
                            nextRole: draft.role,
                            currentApproved: user.approved,
                            nextApproved: true,
                            phone: draft.phone,
                          })
                        }}
                        disabled={busyUserId === user.id}
                    className="app-button app-button-ghost flex-1 justify-center px-3 py-1.5 text-sm sm:flex-none"
                      >
                    {busyUserId === user.id ? 'Saving...' : 'Save'}
                      </button>
                      {currentUser?.id !== user.id && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              setPendingAccessChange({
                                id: user.id,
                                name: user.name,
                                currentRole: user.role,
                                nextRole: user.role,
                                currentApproved: user.approved,
                                nextApproved: false,
                                phone: draft.phone,
                              })
                            }}
                            disabled={busyUserId === user.id}
                        className="app-button flex-1 justify-center border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 sm:flex-none"
                          >
                            Disapprove
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteUser({ id: user.id, name: user.name })}
                            disabled={busyUserId === user.id}
                        className="app-button flex-1 justify-center border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 hover:text-red-800 sm:flex-none"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {currentUser?.id === user.id && (
                        <span className="app-muted self-center text-sm">Current admin</span>
                      )}
                    </div>
                  </td>
                      </>
                    )
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
