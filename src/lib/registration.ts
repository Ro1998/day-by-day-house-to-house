import { prisma } from '@/lib/prisma'

export const getRegistrationConflictMessage = async (input: {
  username?: string
  email?: string
  phone?: string
  includePending?: boolean
}) => {
  const username = input.username?.trim().toLowerCase()
  const email = input.email?.trim().toLowerCase()
  const phone = input.phone?.trim()
  const includePending = input.includePending ?? true

  if (username) {
    const existingUsername = await prisma.user.findFirst({
      where: { username },
      select: { id: true },
    })
    if (existingUsername) {
      return 'This username is already taken. Please choose a different username.'
    }

    if (includePending) {
      const pendingUsername = await prisma.registrationVerification.findFirst({
        where: { username },
        select: { id: true },
      })
      if (pendingUsername) {
        return 'This username is already taken. Please choose a different username.'
      }
    }
  }

  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    })
    if (existingEmail) {
      return 'This email is already in use. Please sign in instead.'
    }

    if (includePending) {
      const pendingEmail = await prisma.registrationVerification.findFirst({
        where: { email },
        select: { id: true },
      })
      if (pendingEmail) {
        return 'This email is already in use. Please sign in instead.'
      }
    }
  }

  if (phone) {
    const existingPhone = await prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    })
    if (existingPhone) {
      return 'This phone number is already in use. Please use a different phone number.'
    }

    if (includePending) {
      const pendingPhone = await prisma.registrationVerification.findFirst({
        where: { phone },
        select: { id: true },
      })
      if (pendingPhone) {
        return 'This phone number is already in use. Please use a different phone number.'
      }
    }
  }

  return null
}
