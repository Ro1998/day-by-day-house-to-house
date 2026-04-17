import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { createResetToken, hashValue, verifyPassword } from '@/lib/password'
import { isEmailConfigured, sendPasswordResetEmail } from '@/lib/email'
import { SECURITY_QUESTIONS, type SecurityQuestionId } from '@/lib/security-questions'

const normalizeAnswer = (value: string) => value.trim().toLowerCase()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const identifier = String(body.username ?? body.identifier ?? '').trim().toLowerCase()
    const securityAnswers = (body.securityAnswers ?? {}) as Partial<Record<SecurityQuestionId, string>>
    const answeredCount = SECURITY_QUESTIONS.filter(({ id }) => normalizeAnswer(securityAnswers[id] ?? '').length > 0).length

    if (!identifier) {
      return NextResponse.json({ error: 'Username or email is required.' }, { status: 400 })
    }

    if (answeredCount < SECURITY_QUESTIONS.length) {
      return NextResponse.json({ error: `Please answer all ${SECURITY_QUESTIONS.length} security questions.` }, { status: 400 })
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'Password reset email is not configured yet. Please ask an admin for help.' }, { status: 500 })
    }

    const user = await prisma.user.findFirst({
      where: {
        isArchived: false,
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    })

    if (!user || !user.securityAnswers) {
      return NextResponse.json({ error: 'No account was found for that username or email.' }, { status: 404 })
    }

    if (!user.email) {
      return NextResponse.json({ error: 'This account does not have an email address for password reset.' }, { status: 400 })
    }

    let storedAnswers: Partial<Record<SecurityQuestionId, string>>
    try {
      storedAnswers = JSON.parse(user.securityAnswers) as Partial<Record<SecurityQuestionId, string>>
    } catch {
      return NextResponse.json({ error: 'This account does not have valid security answers. Please ask an admin for help.' }, { status: 400 })
    }

    const correctCount = SECURITY_QUESTIONS.reduce((count, { id }) => {
      const submitted = normalizeAnswer(securityAnswers[id] ?? '')
      const stored = storedAnswers[id]
      if (!submitted || !stored) return count
      return verifyPassword(submitted, stored) ? count + 1 : count
    }, 0)

    if (correctCount < SECURITY_QUESTIONS.length) {
      return NextResponse.json(
        { error: `Please answer all ${SECURITY_QUESTIONS.length} security questions correctly to reset your password.` },
        { status: 403 },
      )
    }

    const token = createResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hashValue(token),
        passwordResetTokenExpiresAt: expiresAt,
      },
    })

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      new URL(request.url).origin
    ).replace(/\/$/, '')
    const resetLink = `${appUrl}/?resetToken=${token}`
    const sent = await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetLink,
      expiresAt,
    })

    if (!sent) {
      return NextResponse.json({ error: 'We could not send the password reset email. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('auth.forgot-password.POST', error, 'Failed to send password reset link')
  }
}
