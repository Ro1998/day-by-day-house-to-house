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
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const users = await prisma.user.findMany({
      where: auth.user.role === 'admin' ? undefined : { approved: true },
      select: {
        id: true,
        name: true,
        username: true,
        email: auth.user.role === 'admin',
        phone: true,
        passwordResetTokenExpiresAt: auth.user.role === 'admin',
        role: true,
        approved: true,
      },
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

    const user = await prisma.user.create({
      data: {
        name,
        username,
        email,
        phone: phone || null,
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
        phone: body.phone !== undefined ? String(body.phone).trim() || null : undefined,
      },
    })
    return NextResponse.json(user)
  } catch (error) {
    return apiError('users.PATCH', error, 'Failed to update user')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 })
    }

    if (auth.user.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      const menus = await tx.menu.findMany({
        where: { userId: id },
        select: { id: true },
      })

      if (menus.length > 0) {
        await tx.menuItem.deleteMany({
          where: { menuId: { in: menus.map((menu) => menu.id) } },
        })
      }

      await tx.menu.deleteMany({ where: { userId: id } })
      await tx.notification.deleteMany({ where: { createdById: id } })
      await tx.menuSuggestion.deleteMany({ where: { userId: id } })
      await tx.availability.deleteMany({ where: { userId: id } })
      await tx.inventoryItem.deleteMany({ where: { userId: id } })
      await tx.supplyReport.deleteMany({ where: { createdById: id } })
      await tx.activity.deleteMany({ where: { userId: id } })
      await tx.monthlyPayment.deleteMany({ where: { userId: id } })
      await tx.expense.deleteMany({ where: { userId: id } })
      await tx.user.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('users.DELETE', error, 'Failed to delete user')
  }
}
