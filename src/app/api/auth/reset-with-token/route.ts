import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'
import { hashPassword, hashValue } from '@/lib/password'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = String(body.token ?? '')
    const newPassword = String(body.newPassword ?? '')

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Reset token and new password are required.' }, { status: 400 })
    }

    const tokenHash = hashValue(token)
    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
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
    return apiError('auth.reset-with-token.POST', error, 'Failed to reset password with link')
  }
}
