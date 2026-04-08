'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from './ThemeProvider'
import { useData } from './DataProvider'
import { BadgeCheck, Bell, Boxes, Download, Home, MenuSquare, Moon, Receipt, Settings2, Share, Smartphone, Sun, Wallet, Menu as MenuIcon, X, Wrench, RefreshCw } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (tab: string) => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const { currentUser, logout, loading, error, notice, users, unreadNotifications, isSyncing, lastSyncTime } = useData()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editProfileForm, setEditProfileForm] = useState({ name: '', phone: '' })
  const canManageOperations = currentUser?.role === 'admin' || currentUser?.role === 'coordinator'
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [installPromptMode, setInstallPromptMode] = useState<'native' | 'ios' | 'manual' | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    const isIOS = /iPhone|iPad|iPod/i.test(window.navigator.userAgent)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
    const installDismissed = window.sessionStorage.getItem('install_prompt_seen_v2') === 'true'

    if (!isStandalone && !installDismissed && isMobile) {
      window.setTimeout(() => {
        setInstallPromptMode(isIOS ? 'ios' : 'manual')
        setShowInstallPrompt(true)
      }, 1200)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      if (installDismissed || !isMobile || isStandalone) return
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setInstallPromptMode('native')
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallPrompt(false)
        window.sessionStorage.setItem('install_prompt_seen_v2', 'true')
      }
      setDeferredPrompt(null)
    }
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    window.sessionStorage.setItem('install_prompt_seen_v2', 'true')
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
    ...(currentUser?.role === 'admin' ? [{ id: 'monthly', label: 'Monthly Food Money', icon: Wallet }] : []),
    ...(currentUser?.role === 'admin' ? [{ id: 'menu', label: 'Menu Planner', icon: MenuSquare }] : []),
    ...(currentUser?.role === 'admin' ? [{ id: 'users', label: 'User Access', icon: Settings2 }] : []),
  ]

  return (
    <div className="app-shell">
      {showInstallPrompt && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(18,24,18,0.48)] px-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-md rounded-[2rem] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {installPromptMode === 'ios' ? (
                  <Smartphone size={22} className="mt-1 shrink-0 text-[var(--primary-strong)]" />
                ) : (
                  <Download size={22} className="mt-1 shrink-0 text-[var(--primary-strong)]" />
                )}
                <div>
                  <h3 className="text-xl font-semibold">Install on your phone</h3>
                  <p className="app-muted mt-2 text-sm">
                    Open Family from your home screen and use it like an app.
                  </p>
                </div>
              </div>
              <button onClick={dismissInstallPrompt} className="text-[var(--text-soft)] transition hover:text-[var(--text)]" aria-label="Dismiss install prompt">
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[var(--surface-soft)] p-4 text-sm">
              {installPromptMode === 'ios' ? (
                <div className="space-y-3">
                  <p>1. Tap the <span className="font-semibold">Share</span> button in Safari.</p>
                  <p>2. Choose <span className="font-semibold">Add to Home Screen</span>.</p>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--primary-strong)]">
                    <Share size={14} />
                    Add to Home Screen
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>
                    {installPromptMode === 'native'
                      ? 'Tap install below to add it to the home screen.'
                      : 'Use your browser menu and choose Install app or Add to Home Screen.'}
                  </p>
                  {installPromptMode === 'manual' && (
                    <p className="app-muted text-xs">
                      If your browser does not show the install choice yet, open the site again after a little use and it should become available.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={dismissInstallPrompt} className="app-button app-button-ghost">
                Later
              </button>
              {installPromptMode === 'native' && (
                <button onClick={() => void handleInstallClick()} className="app-button app-button-primary inline-flex items-center gap-2">
                  <Download size={16} />
                  Install
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <header className={`sticky top-0 z-50 border-b border-[var(--border)] ${isMobileMenuOpen ? 'bg-white dark:bg-[#121812]' : 'bg-[var(--surface-strong)]/98 backdrop-blur-md shadow-[0_10px_30px_rgba(18,24,18,0.08)]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-50 flex items-start justify-between py-3 md:items-center md:py-6">
            <div className="flex-1 pr-4 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <BrandLogo />
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                    loading || isSyncing
                      ? 'border-[var(--primary)]/30 bg-[var(--surface-soft)] text-[var(--primary-strong)]'
                      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  } ${isMobileMenuOpen ? 'opacity-0 pointer-events-none sm:opacity-100 sm:pointer-events-auto' : ''}`}
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
              <p className="app-muted mt-2 max-w-2xl text-[11px] leading-relaxed sm:mt-3 sm:text-sm">
                And <span className="font-bold text-[var(--primary-strong)]">day by day</span>, continuing steadfastly with one accord in the temple and breaking bread <span className="font-bold text-[var(--primary-strong)]">from house to house, they partook of their food with exultation and simplicity of heart</span>
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)] sm:text-xs sm:tracking-[0.2em]">
                - Acts 2:46
              </p>
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
                <div className="relative z-[60]" ref={profileMenuRef}>
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
          <nav 
            className={`${
              isMobileMenuOpen 
                ? 'fixed inset-x-0 bottom-0 top-[104px] z-40 flex flex-col overflow-y-auto bg-white dark:bg-[#121812] px-6 pb-6 pt-6 shadow-2xl' 
                : 'hidden'
            } gap-1.5 md:static md:z-auto md:flex md:flex-row md:flex-wrap md:overflow-visible md:bg-transparent md:p-0 md:pb-4`}
          >
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

      {isEditProfileOpen && currentUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4 backdrop-blur-sm">
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
