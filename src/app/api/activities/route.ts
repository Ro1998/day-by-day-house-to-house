import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'

const serializeActivity = (activity: Awaited<ReturnType<typeof prisma.activity.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: activity.id,
  user: activity.user.name,
  userId: activity.userId,
  action: activity.action,
  timestamp: activity.timestamp,
})

export async function GET() {
  try {
    const activities = await prisma.activity.findMany({ include: { user: true }, orderBy: { timestamp: 'desc' } })
    return NextResponse.json(activities.map(serializeActivity))
  } catch (error) {
    return apiError('activities.GET', error, 'Failed to fetch activities')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const activity = await prisma.activity.create({ data: body, include: { user: true } })
    return NextResponse.json(serializeActivity(activity))
  } catch (error) {
    return apiError('activities.POST', error, 'Failed to create activity')
  }
}
