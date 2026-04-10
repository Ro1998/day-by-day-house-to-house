'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, LogIn, Moon, RotateCcw, ShieldCheck, Sparkles, Sun, UserPlus } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useData } from '@/components/DataProvider'
import { useTheme } from '@/components/ThemeProvider'
import { getPasswordRuleState, PASSWORD_RULE_HINT } from '@/lib/password-policy'
import { SECURITY_QUESTIONS } from '@/lib/security-questions'

interface LoginScreenProps {
  onContinue: () => void
}

type RegistrationAvailability = {
  usernameMessage: string | null
  emailMessage: string | null
}

export function LoginScreen({ onContinue }: LoginScreenProps) {
  const {
    login,
    requestRegistrationOtp,
    verifyRegistrationOtp,
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
    phone: '',
    password: '',
    securityAnswers: {} as Record<string, string>,
  })
  const [registrationOtp, setRegistrationOtp] = useState('')
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form')
  const [showApprovalPopup, setShowApprovalPopup] = useState(false)
  const [approvalPopupMessage, setApprovalPopupMessage] = useState(
    'Your email was verified successfully. Please wait for the admin to approve your request.',
  )
  const [authAction, setAuthAction] = useState<'idle' | 'login' | 'request-otp' | 'verify-otp' | 'forgot' | 'reset-link'>('idle')
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
  const [registrationAvailability, setRegistrationAvailability] = useState<RegistrationAvailability>({
    usernameMessage: null,
    emailMessage: null,
  })
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const availabilityRequestId = useRef(0)
  const showForgotPassword = authMode === 'forgot'
  const switchMode = showForgotPassword ? 'login' : authMode

  const registerAnsweredCount = SECURITY_QUESTIONS.filter(
    ({ id }) => registerForm.securityAnswers[id]?.trim(),
  ).length
  const forgotAnsweredCount = SECURITY_QUESTIONS.filter(
    ({ id }) => forgotForm.securityAnswers[id]?.trim(),
  ).length
  const registerPasswordRules = getPasswordRuleState(registerForm.password)
  const isRegisterPasswordStrong = Object.values(registerPasswordRules).every(Boolean)
  const hasRegistrationConflict = Boolean(
    registrationAvailability.usernameMessage || registrationAvailability.emailMessage,
  )
  const canSubmitRegistration =
    authAction === 'idle' &&
    Boolean(registerForm.name.trim()) &&
    Boolean(registerForm.username.trim()) &&
    Boolean(registerForm.email.trim()) &&
    Boolean(registerForm.password.trim()) &&
    registerAnsweredCount >= SECURITY_QUESTIONS.length &&
    isRegisterPasswordStrong &&
    !hasRegistrationConflict &&
    !isCheckingAvailability
  const canVerifyRegistration =
    authAction === 'idle' &&
    registrationOtp.trim().length === 6 &&
    isRegisterPasswordStrong &&
    !hasRegistrationConflict

  const resetRegisterFlow = () => {
    setRegisterForm({ name: '', username: '', email: '', phone: '', password: '', securityAnswers: {} })
    setRegistrationOtp('')
    setRegisterStep('form')
    setRegistrationAvailability({ usernameMessage: null, emailMessage: null })
    availabilityRequestId.current += 1
  }

  const checkRegistrationAvailability = async (input: { username?: string; email?: string }) => {
    const username = input.username?.trim().toLowerCase() ?? ''
    const email = input.email?.trim().toLowerCase() ?? ''

    if (!username && !email) {
      setRegistrationAvailability({ usernameMessage: null, emailMessage: null })
      return
    }

    const requestId = availabilityRequestId.current + 1
    availabilityRequestId.current = requestId
    setIsCheckingAvailability(true)

    try {
      const response = await fetch('/api/auth/register/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      })

      let payload: RegistrationAvailability | { error?: string } | null = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (availabilityRequestId.current !== requestId) return

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === 'object' && 'error' in payload && payload.error
            ? payload.error
            : 'Failed to check whether that username or email is available.',
        )
      }

      setRegistrationAvailability({
        usernameMessage: payload && 'usernameMessage' in payload ? payload.usernameMessage : null,
        emailMessage: payload && 'emailMessage' in payload ? payload.emailMessage : null,
      })
    } catch {
      if (availabilityRequestId.current !== requestId) return
      setRegistrationAvailability((prev) => prev)
    } finally {
      if (availabilityRequestId.current === requestId) {
        setIsCheckingAvailability(false)
      }
    }
  }

  const showPendingApprovalPopup = (message: string) => {
    resetRegisterFlow()
    setAuthMode('login')
    setApprovalPopupMessage(message)
    setShowApprovalPopup(true)
  }

  useEffect(() => {
    if (notice !== 'Email verified. Your account request was sent to the admin for approval.') return

    showPendingApprovalPopup('Your email was verified successfully. Please wait for the admin to approve your request.')
  }, [notice])

  useEffect(() => {
    if (authMode !== 'register') return
    if (
      error !== 'This email is already in use. Please sign in instead.' &&
      error !== 'This username is already taken. Please choose a different username.'
    ) {
      return
    }

    setRegisterStep('form')
    setRegistrationOtp('')
    setRegistrationAvailability((prev) => ({
      usernameMessage: error.includes('username') ? error : prev.usernameMessage,
      emailMessage: error.includes('email') ? error : prev.emailMessage,
    }))
  }, [authMode, error])

  useEffect(() => {
    if (authMode !== 'register' || registerStep !== 'form') return

    const username = registerForm.username.trim()
    const email = registerForm.email.trim()

    if (!username && !email) {
      setRegistrationAvailability({ usernameMessage: null, emailMessage: null })
      setIsCheckingAvailability(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      void checkRegistrationAvailability({ username, email })
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [authMode, registerStep, registerForm.username, registerForm.email])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthAction('login')
    try {
      const result = await login(loginForm)
      if (!result.success) {
        if (result.pendingApproval) {
          showPendingApprovalPopup('Your account is waiting for admin approval. Please try again after an admin approves your request.')
        }
        return
      }
      setLoginForm({ username: '', password: '' })
      onContinue()
    } finally {
      setAuthAction('idle')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthAction('request-otp')
    try {
      setShowApprovalPopup(false)
      const sent = await requestRegistrationOtp(registerForm)
      if (!sent) return
      setRegistrationOtp('')
      setRegisterStep('otp')
    } finally {
      setAuthAction('idle')
    }
  }

  const handleVerifyRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthAction('verify-otp')
    try {
      const result = await verifyRegistrationOtp({ email: registerForm.email, otp: registrationOtp })
      if (!result.submitted) return
      if (result.user) {
        resetRegisterFlow()
        onContinue()
        return
      }
      showPendingApprovalPopup('Your email was verified successfully. Please wait for the admin to approve your request.')
    } finally {
      setAuthAction('idle')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthAction('forgot')
    try {
      const success = await resetPasswordWithSecurityAnswers(forgotForm)
      if (!success) return
      setForgotForm({ username: '', newPassword: '', securityAnswers: {} })
      setAuthMode('login')
    } finally {
      setAuthAction('idle')
    }
  }

  const handleLinkReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthAction('reset-link')
    try {
      const success = await resetPasswordWithToken({ token: resetToken, newPassword: linkResetPassword })
      if (!success) return
      setLinkResetPassword('')
    } finally {
      setAuthAction('idle')
    }
  }

  return (
    <div className="app-shell relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      {showApprovalPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,24,18,0.42)] px-4">
          <div className="app-panel w-full max-w-md rounded-3xl p-6">
            <h3 className="mb-2 text-xl font-semibold">Request Submitted</h3>
            <p className="app-muted mb-6 text-sm">
              {approvalPopupMessage}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowApprovalPopup(false)}
                className="app-button app-button-primary"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
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
                        switchMode === 'login' ? 'text-white dark:text-[#121812]' : 'text-[var(--text)]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`relative z-10 rounded-full px-4 py-3 text-sm font-semibold transition-colors duration-300 ${
                        switchMode === 'register' ? 'text-white dark:text-[#121812]' : 'text-[var(--text)]'
                      }`}
                    >
                        Register
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`transition-all duration-300 ease-out ${
                        switchMode !== 'register'
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
                          disabled={!loginForm.username.trim() || !loginForm.password.trim() || authAction !== 'idle'}
                          className="app-button app-button-primary inline-flex w-full items-center justify-center gap-2"
                        >
                          <LogIn size={18} />
                          {authAction === 'login' ? 'Signing In...' : 'Continue to Dashboard'}
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
                            Answered: {forgotAnsweredCount} of {SECURITY_QUESTIONS.length}
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={!forgotForm.username.trim() || !forgotForm.newPassword.trim() || forgotAnsweredCount < SECURITY_QUESTIONS.length || authAction !== 'idle'}
                          className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-2"
                        >
                          <RotateCcw size={18} />
                          {authAction === 'forgot' ? 'Resetting Password...' : 'Reset Password'}
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
                    {registerStep === 'form' ? (
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
                          onBlur={() => void checkRegistrationAvailability({ username: registerForm.username, email: registerForm.email })}
                          className="app-input"
                          placeholder="Username"
                          autoComplete="username"
                          required
                        />
                        {registrationAvailability.usernameMessage && (
                          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {registrationAvailability.usernameMessage}
                          </p>
                        )}
                        <input
                          type="email"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                          onBlur={() => void checkRegistrationAvailability({ username: registerForm.username, email: registerForm.email })}
                          className="app-input"
                          placeholder="Email address"
                          autoComplete="email"
                          required
                        />
                        {registrationAvailability.emailMessage && (
                          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {registrationAvailability.emailMessage}
                          </p>
                        )}
                        <input
                          type="tel"
                          value={registerForm.phone}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="app-input"
                          placeholder="Phone number (optional)"
                          autoComplete="tel"
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
                          <div className="mb-2 text-sm font-semibold text-[var(--primary-strong)]">Password Requirements</div>
                          <p className="app-muted mb-3 text-sm">{PASSWORD_RULE_HINT}</p>
                          <div className="grid gap-2 text-sm">
                            <div className={registerPasswordRules.hasUppercase ? 'text-emerald-700' : 'text-[var(--text-soft)]'}>
                              {registerPasswordRules.hasUppercase ? '✓' : '•'} 1 uppercase letter
                            </div>
                            <div className={registerPasswordRules.hasLowercase ? 'text-emerald-700' : 'text-[var(--text-soft)]'}>
                              {registerPasswordRules.hasLowercase ? '✓' : '•'} 1 lowercase letter
                            </div>
                            <div className={registerPasswordRules.hasNumber ? 'text-emerald-700' : 'text-[var(--text-soft)]'}>
                              {registerPasswordRules.hasNumber ? '✓' : '•'} 1 number
                            </div>
                            <div className={registerPasswordRules.hasSymbol ? 'text-emerald-700' : 'text-[var(--text-soft)]'}>
                              {registerPasswordRules.hasSymbol ? '✓' : '•'} 1 symbol
                            </div>
                          </div>
                        </div>
                        {isCheckingAvailability && (
                          <p className="app-muted text-sm">
                            Checking username and email availability...
                          </p>
                        )}
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--primary-strong)]">
                            <ShieldCheck size={16} />
                            Security Questions
                          </div>
                          <p className="app-muted mb-4 text-sm">
                            Answer all 3 questions. You will use them to reset your password if needed.
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
                            Answered: {registerAnsweredCount} of {SECURITY_QUESTIONS.length}
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={!canSubmitRegistration}
                          className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-2"
                        >
                          <UserPlus size={18} />
                          {authAction === 'request-otp' ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyRegistration} className="space-y-4">
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                          <div className="mb-2 text-sm font-semibold text-[var(--primary-strong)]">Email Verification</div>
                          <p className="app-muted mb-3 text-sm">
                            Enter the 6-digit code we sent to {registerForm.email}.
                          </p>
                          <input
                            type="text"
                            value={registrationOtp}
                            onChange={(e) => setRegistrationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="app-input"
                            placeholder="6-digit code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            required
                          />
                          {authAction === 'verify-otp' && (
                            <p className="app-muted mt-3 text-sm">
                              Verifying your code and creating your account...
                            </p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm">
                          <div className="font-semibold text-[var(--text)]">{registerForm.name}</div>
                          <div className="app-muted mt-1">{registerForm.email}</div>
                          <div className="app-muted mt-2">Your details are ready. Enter the code to finish registration.</div>
                          {!isRegisterPasswordStrong && (
                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                              {PASSWORD_RULE_HINT}
                            </div>
                          )}
                          {hasRegistrationConflict && (
                            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                              {registrationAvailability.emailMessage || registrationAvailability.usernameMessage}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="submit"
                            disabled={!canVerifyRegistration}
                            className="app-button app-button-secondary inline-flex w-full items-center justify-center gap-2"
                          >
                            <UserPlus size={18} />
                            {authAction === 'verify-otp' ? 'Verifying...' : 'Verify and Register'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRegisterStep('form')
                              setRegistrationOtp('')
                            }}
                            disabled={authAction !== 'idle'}
                            className="app-button app-button-ghost inline-flex w-full items-center justify-center"
                          >
                            Edit Details
                          </button>
                        </div>
                      </form>
                    )}
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
                  disabled={!linkResetPassword.trim() || authAction !== 'idle'}
                  className="app-button app-button-primary inline-flex w-full items-center justify-center gap-2"
                >
                  <RotateCcw size={18} />
                  {authAction === 'reset-link' ? 'Setting Password...' : 'Set New Password'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
