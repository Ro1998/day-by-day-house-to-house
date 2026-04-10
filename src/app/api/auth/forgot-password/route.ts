import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { hashPassword, verifyPassword } from '@/lib/password'
import { isPasswordStrongEnough, PASSWORD_RULE_HINT } from '@/lib/password-policy'
import { SECURITY_QUESTIONS, type SecurityQuestionId } from '@/lib/security-questions'

const normalizeAnswer = (value: string) => value.trim().toLowerCase()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const newPassword = String(body.newPassword ?? '')
    const securityAnswers = (body.securityAnswers ?? {}) as Partial<Record<SecurityQuestionId, string>>

    if (!username || !newPassword) {
      return NextResponse.json({ error: 'Username and new password are required.' }, { status: 400 })
    }

    if (!isPasswordStrongEnough(newPassword)) {
      return NextResponse.json({ error: PASSWORD_RULE_HINT }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || !user.securityAnswers) {
      return NextResponse.json({ error: 'No account was found for that username.' }, { status: 404 })
    }

    const storedAnswers = JSON.parse(user.securityAnswers) as Partial<Record<SecurityQuestionId, string>>
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('auth.forgot-password.POST', error, 'Failed to reset password')
  }
}
