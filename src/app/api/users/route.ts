import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
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

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const users = await prisma.user.findMany({
      where: undefined,
      orderBy: [{ approved: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(users)
  } catch (error) {
    return apiError('users.GET', error, 'Failed to fetch users')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const approvedUserCount = await prisma.user.count({ where: { approved: true } })
    const name = String(body.name ?? '').trim()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const securityAnswers = (body.securityAnswers ?? {}) as Partial<Record<SecurityQuestionId, string>>
    const answeredCount = SECURITY_QUESTIONS.filter(({ id }) => normalizeAnswer(securityAnswers[id] ?? '').length > 0).length

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Name, username, and password are required.' }, { status: 400 })
    }

    if (answeredCount < 3) {
      return NextResponse.json({ error: 'Please answer at least 3 security questions.' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash: hashPassword(password),
        securityAnswers: serializeSecurityAnswers(securityAnswers),
        role: approvedUserCount === 0 ? 'admin' : 'user',
        approved: approvedUserCount === 0,
      },
    })
    return NextResponse.json(user)
  } catch (error) {
    return apiError('users.POST', error, 'Failed to create user')
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    const user = await prisma.user.update({
      where: { id: body.id },
      data: {
        role: body.role,
        approved: body.approved,
      },
    })
    return NextResponse.json(user)
  } catch (error) {
    return apiError('users.PATCH', error, 'Failed to update user')
  }
}
