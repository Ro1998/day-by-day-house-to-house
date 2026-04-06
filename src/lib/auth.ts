import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/types'

export const getActingUser = async (request: Request) => {
  const userId = request.headers.get('x-user-id')
  if (!userId) return null

  return prisma.user.findUnique({
    where: { id: userId },
  })
}

export const requireApprovedUser = async (request: Request, roles?: UserRole[]) => {
  const user = await getActingUser(request)

  if (!user || !user.approved) {
    return {
      error: NextResponse.json({ error: 'You must be logged in with an approved account.' }, { status: 401 }),
      user: null,
    }
  }

  if (roles && !roles.includes(user.role as UserRole)) {
    return {
      error: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }),
      user: null,
    }
  }

  return { error: null, user }
}
