import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { hashPassword, hashValue } from '@/lib/password'
import { SECURITY_QUESTIONS, type SecurityQuestionId } from '@/lib/security-questions'
import { isEmailConfigured, sendRegistrationOtpEmail } from '@/lib/email'

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

const getRegistrationConflictMessage = async (input: {
  username: string
  email: string
  phone?: string
}) => {
  const { username, email, phone } = input

  const existingUsername = await prisma.user.findFirst({
    where: { username },
    select: { id: true },
  })
  if (existingUsername) {
    return 'This username is already taken. Please choose a different username.'
  }

  const pendingUsername = await prisma.registrationVerification.findFirst({
    where: { username },
    select: { id: true },
  })
  if (pendingUsername) {
    return 'This username is already taken. Please choose a different username.'
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  })
  if (existingEmail) {
    return 'This email is already in use. Please sign in instead.'
  }

  const pendingEmail = await prisma.registrationVerification.findFirst({
    where: { email },
    select: { id: true },
  })
  if (pendingEmail) {
    return 'This email is already in use. Please sign in instead.'
  }

  if (phone) {
    const existingPhone = await prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    })
    if (existingPhone) {
      return 'This phone number is already in use. Please use a different phone number.'
    }

    const pendingPhone = await prisma.registrationVerification.findFirst({
      where: { phone },
      select: { id: true },
    })
    if (pendingPhone) {
      return 'This phone number is already in use. Please use a different phone number.'
    }
  }

  return null
}

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
      return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('auth.register.request-otp.POST', error, 'Failed to send verification code')
  }
}
