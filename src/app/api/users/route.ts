import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    const users = await prisma.user.findMany({
      where: auth.user ? undefined : { approved: true },
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
    const user = await prisma.user.create({
      data: {
        name: String(body.name).trim(),
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
