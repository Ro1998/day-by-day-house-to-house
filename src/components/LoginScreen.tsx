'use client'

import { useState } from 'react'
import { LogIn, Moon, Sparkles, Sun, UserPlus } from 'lucide-react'
import { useData } from '@/components/DataProvider'
import { useTheme } from '@/components/ThemeProvider'

interface LoginScreenProps {
  onContinue: () => void
}

export function LoginScreen({ onContinue }: LoginScreenProps) {
  const { users, login, createUser, loading, error, notice } = useData()
  const { theme, toggleTheme } = useTheme()
  const [selectedUser, setSelectedUser] = useState('')
  const [newUserName, setNewUserName] = useState('')

  const handleLogin = () => {
    const user = users.find((item) => item.id === selectedUser)
    if (!user) return
    login(user)
    onContinue()
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = await createUser(newUserName)
    if (!user) return
    setNewUserName('')
    onContinue()
  }

  return (
    <div className="app-shell relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-10 h-40 w-40 rounded-full bg-[rgba(160,214,131,0.32)] blur-3xl" />
        <div className="absolute bottom-0 right-[-6%] h-56 w-56 rounded-full bg-[rgba(105,132,169,0.26)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="app-card rounded-[2rem] p-8 sm:p-10">
            <div className="mb-10 flex items-start justify-between gap-4">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary-strong)]">
                  <Sparkles size={14} />
                  Shared House Hub
                </p>
                <h1 className="max-w-xl text-4xl font-black tracking-tight sm:text-5xl">
                  Day by Day, House to House
                </h1>
                <p className="app-muted mt-4 max-w-xl text-base sm:text-lg">
                  Track food money, expenses, and weekly kitchen planning from one calm, shared workspace.
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="app-button app-button-ghost inline-flex h-12 w-12 items-center justify-center p-0"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="app-panel rounded-3xl p-5">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  Household
                </div>
                <p className="app-muted text-sm">
                  One place for shared costs, meal planning, and monthly food contributions.
                </p>
              </div>
              <div className="app-panel rounded-3xl p-5">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  Clarity
                </div>
                <p className="app-muted text-sm">
                  See current cash flow, menu assignments, and recent activity without digging.
                </p>
              </div>
              <div className="app-panel rounded-3xl p-5">
                <div className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  Daily Use
                </div>
                <p className="app-muted text-sm">
                  Designed for quick check-ins, easy edits, and shared responsibility across the home.
                </p>
              </div>
            </div>
          </section>

          <section className="app-card rounded-[2rem] p-8 sm:p-10">
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                Welcome Back
              </p>
              <h2 className="text-3xl font-black tracking-tight">
                {users.length > 0 ? 'Choose your account' : 'Create the first account'}
              </h2>
              <p className="app-muted mt-3 text-sm">
                {users.length > 0
                  ? 'Start from the login page every time, then continue into the shared dashboard.'
                  : 'No users found yet. Create one account to unlock the workspace.'}
              </p>
            </div>

            {loading && (
              <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
                Connecting to your workspace data...
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {notice && (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {notice}
              </div>
            )}

            {users.length > 0 ? (
              <div className="space-y-4">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="app-input"
                >
                  <option value="">Select your name</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLogin}
                  disabled={!selectedUser}
                  className="app-button app-button-primary inline-flex w-full items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  Continue to Dashboard
                </button>

                <div className="pt-4">
                  <p className="mb-3 text-sm font-semibold text-[var(--primary-strong)]">
                    Need another account?
                  </p>
                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="app-input"
                      placeholder="Enter a new user name"
                    />
                    <button
                      type="submit"
                      disabled={!newUserName.trim()}
                      className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-2"
                    >
                      <UserPlus size={18} />
                      Create Another User
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="app-input"
                  placeholder="Enter your name"
                  required
                />
                <button
                  type="submit"
                  disabled={!newUserName.trim()}
                  className="app-button app-button-primary inline-flex w-full items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  Create First User
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
