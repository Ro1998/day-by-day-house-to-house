import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const serializeActivity = (activity: Awaited<ReturnType<typeof prisma.activity.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: activity.id,
  user: activity.user.name,
  userId: activity.userId,
  action: activity.action,
  timestamp: activity.timestamp,
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const activities = await prisma.activity.findMany({ include: { user: true }, orderBy: { timestamp: 'desc' } })
    return NextResponse.json(activities.map(serializeActivity))
  } catch (error) {
    return apiError('activities.GET', error, 'Failed to fetch activities')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const body = await request.json()
    const activity = await prisma.activity.create({
      data: {
        userId: body.userId,
        action: body.action,
      },
      include: { user: true },
    })
    return NextResponse.json(serializeActivity(activity))
  } catch (error) {
    return apiError('activities.POST', error, 'Failed to create activity')
  }
}
