import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { verifyPassword, verifyValue } from '@/lib/password'
import { sendAdminRegistrationRequestEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const otp = String(body.otp ?? '').trim()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 })
    }

    const verification = await prisma.registrationVerification.findUnique({
      where: { email },
    })

    if (!verification) {
      return NextResponse.json({ error: 'No pending verification was found for this email.' }, { status: 404 })
    }

    if (verification.otpExpiresAt.getTime() < Date.now()) {
      await prisma.registrationVerification.delete({ where: { email } })
      return NextResponse.json({ error: 'This verification code has expired. Please request a new one.' }, { status: 400 })
    }

    if (!verifyValue(otp, verification.otpHash) && !verifyPassword(otp, verification.otpHash)) {
      return NextResponse.json({ error: 'The verification code is incorrect.' }, { status: 400 })
    }

    const conflictingUsername = await prisma.user.findFirst({
      where: { username: verification.username, isArchived: false },
      select: { id: true },
    })
    if (conflictingUsername) {
      await prisma.registrationVerification.delete({ where: { email } })
      return NextResponse.json({ error: 'This username is already taken. Please choose a different username.' }, { status: 400 })
    }

    const conflictingEmail = await prisma.user.findFirst({
      where: { email: verification.email, isArchived: false },
      select: { id: true },
    })
    if (conflictingEmail) {
      await prisma.registrationVerification.delete({ where: { email } })
      return NextResponse.json({ error: 'This email is already in use. Please sign in instead.' }, { status: 400 })
    }

    if (verification.phone) {
      const conflictingPhone = await prisma.user.findFirst({
        where: { phone: verification.phone, isArchived: false },
        select: { id: true },
      })
      if (conflictingPhone) {
        await prisma.registrationVerification.delete({ where: { email } })
        return NextResponse.json({ error: 'This phone number is already in use. Please use a different phone number.' }, { status: 400 })
      }
    }

    const approvedUserCount = await prisma.user.count({ where: { approved: true } })
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: verification.name,
          username: verification.username,
          email: verification.email,
          phone: verification.phone,
          passwordHash: verification.passwordHash,
          securityAnswers: verification.securityAnswers,
          role: approvedUserCount === 0 ? 'admin' : 'user',
          approved: approvedUserCount === 0,
        },
      })

      await tx.registrationVerification.delete({
        where: { email },
      })

      return createdUser
    })

    if (!user.approved && user.email) {
      sendAdminRegistrationRequestEmail({
        name: user.name,
        username: user.username ?? '',
        email: user.email,
      }).catch(console.error)
    }

    return NextResponse.json(user)
  } catch (error) {
    return apiError('auth.register.verify-otp.POST', error, 'Failed to verify registration code')
  }
}
