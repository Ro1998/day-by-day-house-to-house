'use client'

import { useTheme } from './ThemeProvider'
import { useData } from './DataProvider'
import { Bell, Boxes, Home, LogOut, MenuSquare, Moon, Receipt, Settings2, Sun, Wallet } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const { currentUser, logout, loading, error, notice, users } = useData()
  const canManageOperations = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'expenses', label: 'Cash Flow', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(canManageOperations ? [{ id: 'inventory', label: 'Supplies', icon: Boxes }] : []),
    ...(canManageOperations ? [{ id: 'monthly', label: 'Monthly Food Money', icon: Wallet }] : []),
    ...(canManageOperations ? [{ id: 'menu', label: 'Menu Planner', icon: MenuSquare }] : []),
    ...(currentUser?.role === 'admin' ? [{ id: 'users', label: 'User Access', icon: Settings2 }] : []),
  ]

  return (
    <div className="app-shell">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 py-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <BrandLogo />
                <p className="app-muted text-sm">
                  And <span className="font-bold text-[var(--primary-strong)]">day by day</span>, continuing steadfastly with one accord in the temple and breaking bread <span className="font-bold text-[var(--primary-strong)]">from house to house, they partook of their food with exultation and simplicity of heart</span>
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  - Acts 2:46
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={toggleTheme}
                className="app-button app-button-ghost inline-flex items-center justify-center p-3"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              {currentUser && (
                <div className="app-panel flex items-center gap-3 rounded-full px-4 py-2">
                  <div className="h-10 w-10 rounded-full bg-[var(--primary)]/20 text-[var(--primary-strong)] flex items-center justify-center font-bold">
                    {currentUser.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{currentUser.name}</div>
                    <div className="app-muted text-xs capitalize">{currentUser.role}</div>
                  </div>
                </div>
              )}
              {currentUser && (
                <button
                  onClick={logout}
                  className="app-button app-button-ghost inline-flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              )}
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 pb-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`app-button inline-flex items-center gap-2 ${
                  activeTab === tab.id ? 'app-button-primary' : 'app-button-ghost'
                }`}
              >
                <tab.icon size={17} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {loading && (
          <div className="app-panel mb-6 rounded-2xl px-4 py-3 text-sm">
            Connecting to your workspace data...
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No users were found yet. Create the first user to start using the app.
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
