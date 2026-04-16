import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { isEmailConfigured, sendRegistrationOtpEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { hashPassword, hashValue } from '@/lib/password'
import { isPasswordStrongEnough, PASSWORD_RULE_HINT } from '@/lib/password-policy'
import { getRegistrationConflictMessage } from '@/lib/registration'
import { SECURITY_QUESTIONS, type SecurityQuestionId } from '@/lib/security-questions'

const normalizeAnswer = (value: string) => value.trim().toLowerCase()

const serializeSecurityAnswers = (answers: Partial<Record<SecurityQuestionId, string>>) => (
  JSON.stringify(
    Object.fromEntries(
      Object.entries(answers)
        .filter(([, answer]) => answer && normalizeAnswer(answer).length > 0)
        .map(([questionId, answer]) => [questionId, hashPassword(normalizeAnswer(answer as string))]),
    ),
  )
)

export async function POST(request: Request) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json({ error: 'Email verification is not configured yet.' }, { status: 500 })
    }

    const body = await request.json()
    const name = String(body.name ?? '').trim()
    const username = String(body.username ?? '').trim().toLowerCase()
    const email = String(body.email ?? '').trim().toLowerCase()
    const phone = String(body.phone ?? '').trim()
    const password = String(body.password ?? '')
    const securityAnswers = (body.securityAnswers ?? {}) as Partial<Record<SecurityQuestionId, string>>
    const answeredCount = SECURITY_QUESTIONS.filter(({ id }) => normalizeAnswer(securityAnswers[id] ?? '').length > 0).length

    if (!name || !username || !email || !password) {
      return NextResponse.json({ error: 'Name, username, email, and password are required.' }, { status: 400 })
    }

    if (answeredCount < SECURITY_QUESTIONS.length) {
      return NextResponse.json({ error: `Please answer all ${SECURITY_QUESTIONS.length} security questions.` }, { status: 400 })
    }

    if (!isPasswordStrongEnough(password)) {
      return NextResponse.json({ error: PASSWORD_RULE_HINT }, { status: 400 })
    }

    const conflictMessage = await getRegistrationConflictMessage({
      username,
      email,
      phone: phone || undefined,
    })
    if (conflictMessage) {
      return NextResponse.json({ error: conflictMessage }, { status: 400 })
    }

    const otp = randomInt(100000, 1000000).toString()
    const otpHash = hashValue(otp)
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await prisma.registrationVerification.deleteMany({
      where: {
        OR: [{ email }, { username }, ...(phone ? [{ phone }] : [])],
      },
    })

    await prisma.registrationVerification.create({
      data: {
        name,
        username,
        email,
        phone: phone || null,
        passwordHash: hashPassword(password),
        securityAnswers: serializeSecurityAnswers(securityAnswers),
        otpHash,
        otpExpiresAt,
      },
    })

    const sent = await sendRegistrationOtpEmail({ email, name, otp })
    if (!sent) {
      await prisma.registrationVerification.deleteMany({ where: { email } })
      const smtpHost = process.env.SMTP_HOST?.trim().toLowerCase() || ''
      const likelyGmail = smtpHost.includes('gmail')
      return NextResponse.json(
        {
          error: likelyGmail
            ? 'Failed to send verification email. Gmail SMTP rejected the configured login. Update SMTP_USER and SMTP_PASS with a valid Gmail App Password.'
            : 'Failed to send verification email. Check the SMTP configuration and try again.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('auth.register.request-otp.POST', error, 'Failed to send verification code')
  }
}
