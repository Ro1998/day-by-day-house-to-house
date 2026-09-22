'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from './ThemeProvider'
import { useData } from './DataProvider'
import { BadgeCheck, Bell, Boxes, Home, MenuSquare, Moon, PiggyBank, Receipt, Settings2, Sun, Wallet, Menu as MenuIcon, X, Wrench, RefreshCw, LogOut } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const { currentUser, logout, loading, error, notice, users, unreadNotifications, isSyncing, lastSyncTime } = useData()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editProfileForm, setEditProfileForm] = useState({ name: '', phone: '' })
  const canManageOperations = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'
  const canViewMonthly = currentUser?.role === 'admin' || currentUser?.role === 'overseer'
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const pendingAccessCount = users.filter((user) => !user.approved).length

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (currentUser) {
      setEditProfileForm({ name: currentUser.name, phone: (currentUser as any).phone || '' })
    }
  }, [currentUser])

  useEffect(() => {
    if (!isProfileMenuOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!profileMenuRef.current) return
      const target = event.target
      if (target instanceof Node && !profileMenuRef.current.contains(target)) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isProfileMenuOpen])

  useEffect(() => {
    const handleOnlineStatus = () => {
      const isOnline = navigator.onLine

      // Show offline indicator if needed
      if (!isOnline) {
        document.body.classList.add('offline-mode')
      } else {
        document.body.classList.remove('offline-mode')
      }
    }

    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)

    // Initial online status check
    handleOnlineStatus()
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
        body: JSON.stringify({ 
          id: currentUser.id, 
          name: editProfileForm.name, 
          phone: editProfileForm.phone,
          role: currentUser.role,
          approved: (currentUser as any).approved
        })
      })
      if (res.ok) window.location.reload()
      else alert('Failed to update profile. Your role may not permit this action.')
    } catch (err) {
      console.error(err)
    }
  }

  const syncLabel = loading || isSyncing ? 'Syncing' : 'Synced'
  const syncTitle = loading || isSyncing
    ? 'Syncing data...'
    : lastSyncTime
      ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
      : 'Synced and ready'

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'expenses', label: 'Cash Flow', icon: Receipt },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    ...(canManageOperations ? [{ id: 'inventory', label: 'Supplies', icon: Boxes }] : []),
    ...(canViewMonthly ? [{ id: 'monthly', label: 'Monthly Food Money', icon: Wallet }] : []),
    ...(currentUser?.role === 'admin' || currentUser?.role === 'coordinator' ? [{ id: 'menu', label: 'Menu Planner', icon: MenuSquare }] : []),
    ...(currentUser?.role === 'admin' ? [{ id: 'admin-records', label: 'Admin Records', icon: PiggyBank }] : []),
    ...(currentUser?.role === 'admin' ? [{ id: 'users', label: 'User Access', icon: Settings2 }] : []),
  ]

  const mountainScene = (
    <div className="mountain-scene" aria-hidden="true">
      <svg viewBox="0 0 1200 220" preserveAspectRatio="xMidYMid slice">
        <g className="mountain-stars">
          <circle cx="156" cy="38" r="1.6" />
          <circle cx="242" cy="74" r="1.2" />
          <circle cx="377" cy="42" r="1.4" />
          <circle cx="538" cy="64" r="1.1" />
          <circle cx="692" cy="34" r="1.5" />
          <circle cx="802" cy="78" r="1.1" />
          <circle cx="1034" cy="50" r="1.3" />
          <circle cx="1112" cy="88" r="1.1" />
        </g>
        <circle className="mountain-sun" cx="1030" cy="58" r="24" />
        <path className="mountain-moon" d="M1048 38a25 25 0 1 0 19 41 21 21 0 1 1-19-41Z" />
        <g className="mountain-cloud">
          <path d="M112 76c11-18 37-17 47 1 13-7 31 1 33 17H78c3-17 20-26 34-18Z" />
          <path d="M836 96c8-13 27-13 35 0 9-5 23 1 25 13h-84c2-12 13-19 24-13Z" />
        </g>
        <path className="mountain-haze" d="M0 116c160-22 250 8 390-8 176-20 304-48 506-20 126 17 200 8 304-10v142H0Z" />
        <path className="mountain-far" d="M0 141 126 78l72 47 106-64 134 79 88-53 118 62 120-86 142 84 87-45 207 74v44H0Z" />
        <path className="mountain-mid" d="M0 164 106 106l80 34 108-74 112 91 96-65 127 84 111-101 156 108 88-52 216 70v19H0Z" />
        <path className="mountain-near" d="M0 190 112 134l84 26 116-72 106 86 85-54 124 78 118-92 144 91 89-40 222 58v5H0Z" />
      </svg>
    </div>
  )

  return (
    <div className="app-shell">
      <header className="theme-header sticky top-0 z-50 border-b border-[var(--border)]">
        {mountainScene}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-50 py-3 md:py-6">
            <div className="flex items-start justify-between md:items-center">
              <div className={`min-w-0 flex-1 pr-4 ${isMobileMenuOpen ? 'hidden md:block' : 'block'}`}>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <BrandLogo />
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                      loading || isSyncing
                        ? 'border-[var(--primary)]/30 bg-[var(--surface-soft)] text-[var(--primary-strong)]'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    }`}
                    title={syncTitle}
                  >
                    {loading || isSyncing ? (
                      <RefreshCw size={12} className="animate-spin sm:h-[14px] sm:w-[14px]" />
                    ) : (
                      <BadgeCheck size={12} className="sm:h-[14px] sm:w-[14px]" />
                    )}
                    <span>{syncLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  onClick={toggleTheme}
                  className="app-button app-button-ghost inline-flex items-center justify-center p-2 sm:p-3"
                  title="Toggle Theme"
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden app-button app-button-ghost inline-flex items-center justify-center p-2 sm:p-3"
                >
                  {isMobileMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
                </button>

                {currentUser && (
                  <div className="relative z-[60] hidden md:block" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[var(--primary)]/20 font-bold text-[var(--primary-strong)] transition-transform hover:scale-105"
                      title="Profile Options"
                    >
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </button>

                    {isProfileMenuOpen && (
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl z-[60]">
                        <div className="px-3 py-2 border-b border-[var(--border)] mb-2">
                          <div className="text-sm font-semibold truncate">{currentUser.name}</div>
                          <div className="text-xs capitalize text-[var(--text-soft)]">{currentUser.role}</div>
                        </div>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false)
                            setIsEditProfileOpen(true)
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--surface-soft)]"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false)
                            logout()
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`${isMobileMenuOpen ? 'hidden md:block' : 'block'} mt-2 md:mt-0`}>
              <p className="app-muted max-w-none text-[11px] leading-relaxed sm:text-sm">
                And <span className="font-bold text-[var(--primary-strong)]">day by day</span>, continuing steadfastly with one accord in the temple and breaking bread <span className="font-bold text-[var(--primary-strong)]">from house to house, they partook of their food with exultation and simplicity of heart</span>
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] sm:text-xs sm:tracking-[0.2em]">
                - Acts 2:46
              </p>
            </div>
          </div>
          <nav 
            className={`${
              isMobileMenuOpen 
                ? 'fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[var(--surface-strong)] px-5 pb-8 pt-24 shadow-2xl' 
                : 'hidden'
            } gap-1.5 md:static md:z-auto md:flex md:flex-row md:flex-wrap md:overflow-visible md:bg-transparent md:p-0 md:pb-4`}
          >
            {isMobileMenuOpen && currentUser && (
              <div className="mb-6 flex items-center gap-4 rounded-2xl bg-[var(--surface-soft)] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/20 text-xl font-bold text-[var(--primary-strong)]">
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{currentUser.name}</div>
                  <div className="text-xs capitalize text-[var(--text-soft)]">{currentUser.role}</div>
                </div>
              </div>
            )}

            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                className={`app-button relative inline-flex w-full items-center justify-start gap-2 md:w-auto md:justify-center px-3 py-2 text-sm md:px-3 md:py-1.5 ${
                  activeTab === tab.id ? 'app-button-primary' : 'app-button-ghost'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.id === 'notifications' && unreadNotifications.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                    {unreadNotifications.length}
                  </span>
                )}
                {tab.id === 'users' && pendingAccessCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-sm">
                    {pendingAccessCount}
                  </span>
                )}
              </button>
            ))}

            {isMobileMenuOpen && (
              <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-6">
                <button
                  onClick={() => {
                    setIsEditProfileOpen(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className="app-button app-button-ghost flex items-center justify-start gap-2 py-3"
                >
                  <Settings2 size={18} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="app-button flex items-center justify-start gap-2 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
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
          <div className="mb-6 rounded-2xl border border-[color-mix(in_srgb,var(--destructive)_34%,var(--border))] bg-[color-mix(in_srgb,var(--destructive)_12%,var(--surface))] px-4 py-3 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-6 rounded-2xl border border-[color-mix(in_srgb,var(--success)_34%,var(--border))] bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] px-4 py-3 text-sm text-[var(--success)]">
            {notice}
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="mb-6 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_44%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_16%,var(--surface))] px-4 py-3 text-sm text-[color-mix(in_srgb,var(--warning)_72%,var(--text))]">
            No users were found yet. Create the first user to start using the app.
          </div>
        )}
        {children}
      </main>

      {isEditProfileOpen && currentUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay)] px-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-semibold">Edit Profile</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input 
                  type="text" 
                  value={editProfileForm.name} 
                  onChange={e => setEditProfileForm(p => ({ ...p, name: e.target.value }))}
                  className="app-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={editProfileForm.phone} 
                  onChange={e => setEditProfileForm(p => ({ ...p, phone: e.target.value }))}
                  className="app-input w-full"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsEditProfileOpen(false)}
                  className="app-button app-button-ghost"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="app-button app-button-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
