import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { hashPassword } from '@/lib/password'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = String(body.name ?? '').trim()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Name, username, and password are required.' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        name,
        username: null,
        passwordHash: null,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'No existing account without credentials was found for that name.' },
        { status: 404 },
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        username,
        passwordHash: hashPassword(password),
      },
    })

    if (!updatedUser.approved) {
      return NextResponse.json(
        { error: 'Credentials saved. Wait for admin approval before signing in.' },
        { status: 403 },
      )
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    return apiError('auth.claim.POST', error, 'Failed to claim existing account')
  }
}
