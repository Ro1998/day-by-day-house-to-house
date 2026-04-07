import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { createResetToken, hashValue } from '@/lib/password'

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    const userId = String(body.userId ?? '')
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 })
    }

    const token = createResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: hashValue(token),
        passwordResetTokenExpiresAt: expiresAt,
      },
    })

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      resetToken: token,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    return apiError('auth.admin-reset-link.POST', error, 'Failed to create reset link')
  }
}
