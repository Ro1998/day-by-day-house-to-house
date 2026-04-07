import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'

const serializeNotification = (notification: Awaited<ReturnType<typeof prisma.notification.findFirstOrThrow>> & { createdBy: { name: string } }) => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  category: notification.category,
  createdBy: notification.createdBy.name,
  createdById: notification.createdById,
  createdAt: notification.createdAt.toISOString(),
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const notifications = await prisma.notification.findMany({
      include: { createdBy: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(notifications.map(serializeNotification))
  } catch (error) {
    return apiError('notifications.GET', error, 'Failed to fetch notifications')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error
    const body = await request.json()
    const notification = await prisma.notification.create({
      data: {
        title: String(body.title).trim(),
        message: String(body.message).trim(),
        category: String(body.category ?? 'general'),
        createdById: body.userId,
      },
      include: { createdBy: true },
    })
    return NextResponse.json(serializeNotification(notification))
  } catch (error) {
    return apiError('notifications.POST', error, 'Failed to create notification')
  }
}
