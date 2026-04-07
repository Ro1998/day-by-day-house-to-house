'use client'

import { useState } from 'react'
import { Eye, EyeOff, LogIn, Moon, RotateCcw, ShieldCheck, Sparkles, Sun, UserPlus } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useData } from '@/components/DataProvider'
import { useTheme } from '@/components/ThemeProvider'
import { SECURITY_QUESTIONS } from '@/lib/security-questions'

interface LoginScreenProps {
  onContinue: () => void
}

export function LoginScreen({ onContinue }: LoginScreenProps) {
  const {
    login,
    createUser,
    resetPasswordWithSecurityAnswers,
    resetPasswordWithToken,
    loading,
    error,
    notice,
  } = useData()
  const { theme, toggleTheme } = useTheme()
  const searchParams = useSearchParams()
  const resetToken = searchParams.get('resetToken') ?? ''
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    securityAnswers: {} as Record<string, string>,
  })
  const [forgotForm, setForgotForm] = useState({
    username: '',
    newPassword: '',
    securityAnswers: {} as Record<string, string>,
  })
  const [linkResetPassword, setLinkResetPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState({
    login: false,
    register: false,
    forgot: false,
    linkReset: false,
  })
  const showForgotPassword = authMode === 'forgot'
  const switchMode = showForgotPassword ? 'login' : authMode

  const registerAnsweredCount = SECURITY_QUESTIONS.filter(
    ({ id }) => registerForm.securityAnswers[id]?.trim(),
  ).length
  const forgotAnsweredCount = SECURITY_QUESTIONS.filter(
    ({ id }) => forgotForm.securityAnswers[id]?.trim(),
  ).length

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await login(loginForm)
    if (!success) return
    setLoginForm({ username: '', password: '' })
    onContinue()
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = await createUser(registerForm)
    if (!user) return
    setRegisterForm({ name: '', username: '', email: '', password: '', securityAnswers: {} })
    onContinue()
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await resetPasswordWithSecurityAnswers(forgotForm)
    if (!success) return
    setForgotForm({ username: '', newPassword: '', securityAnswers: {} })
    setAuthMode('login')
  }

  const handleLinkReset = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await resetPasswordWithToken({ token: resetToken, newPassword: linkResetPassword })
    if (!success) return
    setLinkResetPassword('')
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
                className="app-button app-button-ghost inline-flex h-14 w-14 items-center justify-center p-0"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon size={28} /> : <Sun size={28} />}
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
                Sign in to your account
              </h2>
              <p className="app-muted mt-3 text-sm">
                Use your username and password each time you enter the workspace.
              </p>
            </div>

            {loading && (
              <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
                Preparing your workspace...
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

            {!resetToken && (
              <>
                <div className="mb-6 rounded-full bg-[var(--surface-soft)] p-1">
                  <div className="relative grid grid-cols-2">
                    <div
                      className={`absolute inset-y-0 w-1/2 rounded-full bg-[var(--primary-strong)] shadow-md transition-transform duration-300 ease-out ${
                        switchMode === 'register' ? 'translate-x-full' : 'translate-x-0'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`relative z-10 rounded-full px-4 py-3 text-sm font-semibold transition-colors duration-300 ${
                        switchMode === 'login' ? 'text-[#1f3a22]' : 'text-[var(--text)]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`relative z-10 rounded-full px-4 py-3 text-sm font-semibold transition-colors duration-300 ${
                        switchMode === 'register' ? 'text-[#1f3a22]' : 'text-[var(--text)]'
                      }`}
                    >
                      Register
                    </button>
                  </div>
                </div>

                <div className="relative overflow-hidden">
                  <div
                    className={`transition-all duration-300 ease-out ${
                      switchMode === 'login'
                        ? 'translate-x-0 opacity-100'
                        : 'pointer-events-none absolute inset-0 -translate-x-8 opacity-0'
                    }`}
                  >
                    {!showForgotPassword ? (
                      <form onSubmit={handleLogin} className="space-y-4">
                        <input
                          type="text"
                          value={loginForm.username}
                          onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
                          className="app-input"
                          placeholder="Username"
                          autoComplete="username"
                          required
                        />
                        <div className="relative">
                          <input
                            type={showPasswords.login ? 'text' : 'password'}
                            value={loginForm.password}
                            onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                            className="app-input pr-12"
                            placeholder="Password"
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords((prev) => ({ ...prev, login: !prev.login }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                          >
                            {showPasswords.login ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={!loginForm.username.trim() || !loginForm.password.trim()}
                          className="app-button app-button-primary inline-flex w-full items-center justify-center gap-2"
                        >
                          <LogIn size={18} />
                          Continue to Dashboard
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-sm font-semibold text-[var(--accent-strong)] underline underline-offset-4"
                        >
                          Forgot password?
                        </button>
                      </form>
                    ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">Forgot Password</h3>
                            <p className="app-muted text-sm">
                              Answer 3 security questions correctly to set a new password.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="text-sm font-semibold text-[var(--accent-strong)] underline underline-offset-4"
                          >
                            Back to sign in
                          </button>
                        </div>
                        <input
                          type="text"
                          value={forgotForm.username}
                          onChange={(e) => setForgotForm((prev) => ({ ...prev, username: e.target.value }))}
                          className="app-input"
                          placeholder="Username"
                          autoComplete="username"
                          required
                        />
                        <div className="relative">
                          <input
                            type={showPasswords.forgot ? 'text' : 'password'}
                            value={forgotForm.newPassword}
                            onChange={(e) => setForgotForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                            className="app-input pr-12"
                            placeholder="New password"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords((prev) => ({ ...prev, forgot: !prev.forgot }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                          >
                            {showPasswords.forgot ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]">
                            <RotateCcw size={16} />
                            Security Question Check
                          </div>
                          <p className="app-muted mb-4 text-sm">
                            If you cannot answer these, ask an admin for a reset link.
                          </p>
                          <div className="space-y-3">
                            {SECURITY_QUESTIONS.map(({ id, question }) => (
                              <div key={id}>
                                <label className="mb-1 block text-sm font-medium">{question}</label>
                                <input
                                  type="text"
                                  value={forgotForm.securityAnswers[id] ?? ''}
                                  onChange={(e) => setForgotForm((prev) => ({
                                    ...prev,
                                    securityAnswers: {
                                      ...prev.securityAnswers,
                                      [id]: e.target.value,
                                    },
                                  }))}
                                  className="app-input"
                                  placeholder="Your answer"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="app-muted mt-3 text-xs">
                            Answered: {forgotAnsweredCount} of 5
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={!forgotForm.username.trim() || !forgotForm.newPassword.trim() || forgotAnsweredCount < 3}
                          className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-2"
                        >
                          <RotateCcw size={18} />
                          Reset Password
                        </button>
                      </form>
                    )}
                  </div>

                  <div
                    className={`transition-all duration-300 ease-out ${
                      switchMode === 'register'
                        ? 'translate-x-0 opacity-100'
                        : 'pointer-events-none absolute inset-0 translate-x-8 opacity-0'
                    }`}
                  >
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <input
                        type="text"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="app-input"
                        placeholder="Full name"
                        required
                      />
                      <input
                        type="text"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="app-input"
                        placeholder="Username"
                        autoComplete="username"
                        required
                      />
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="app-input"
                        placeholder="Email address"
                        autoComplete="email"
                        required
                      />
                      <div className="relative">
                        <input
                          type={showPasswords.register ? 'text' : 'password'}
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                          className="app-input pr-12"
                          placeholder="Password"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((prev) => ({ ...prev, register: !prev.register }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                        >
                          {showPasswords.register ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]">
                          <ShieldCheck size={16} />
                          Security Questions
                        </div>
                        <p className="app-muted mb-4 text-sm">
                          Answer any 3 or more. You will use these to reset your password if needed.
                        </p>
                        <div className="space-y-3">
                          {SECURITY_QUESTIONS.map(({ id, question }) => (
                            <div key={id}>
                              <label className="mb-1 block text-sm font-medium">{question}</label>
                              <input
                                type="text"
                                value={registerForm.securityAnswers[id] ?? ''}
                                onChange={(e) => setRegisterForm((prev) => ({
                                  ...prev,
                                  securityAnswers: {
                                    ...prev.securityAnswers,
                                    [id]: e.target.value,
                                  },
                                }))}
                                className="app-input"
                                placeholder="Your answer"
                              />
                            </div>
                          ))}
                        </div>
                        <p className="app-muted mt-3 text-xs">
                          Answered: {registerAnsweredCount} of 5
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={
                          !registerForm.name.trim() ||
                          !registerForm.username.trim() ||
                          !registerForm.email.trim() ||
                          !registerForm.password.trim() ||
                          registerAnsweredCount < 3
                        }
                        className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-2"
                      >
                        <UserPlus size={18} />
                        Register Account
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}

            {resetToken && (
              <form onSubmit={handleLinkReset} className="space-y-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
                  This password reset link was created by an admin. Enter your new password to finish resetting your account.
                </div>
                <div className="relative">
                  <input
                    type={showPasswords.linkReset ? 'text' : 'password'}
                    value={linkResetPassword}
                    onChange={(e) => setLinkResetPassword(e.target.value)}
                    className="app-input pr-12"
                    placeholder="New password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((prev) => ({ ...prev, linkReset: !prev.linkReset }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]"
                  >
                    {showPasswords.linkReset ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!linkResetPassword.trim()}
                  className="app-button app-button-primary inline-flex w-full items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  Set New Password
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
