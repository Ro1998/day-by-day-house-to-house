import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { verifyPassword } from '@/lib/password'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user || user.isArchived || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    if (!user.approved) {
      return NextResponse.json({ error: 'Your account is waiting for admin approval.' }, { status: 403 })
    }

    return NextResponse.json(user)
  } catch (error) {
    return apiError('auth.login.POST', error, 'Failed to sign in')
  }
}
