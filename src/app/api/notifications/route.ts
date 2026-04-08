import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'
import { sendNotificationEmails } from '@/lib/email'

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
    const auth = await requireApprovedUser(request, ['admin', 'coordinator', 'overseer'])
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

    // Send emails to all users with email addresses
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
        approved: true,
      },
      select: { email: true, name: true },
    })
    const usersWithEmail = users.filter(u => u.email) as Array<{ email: string; name: string }>
    if (usersWithEmail.length > 0) {
      // Send emails asynchronously, don't wait
      sendNotificationEmails(usersWithEmail, notification.title, notification.message).catch(console.error)
    }

    return NextResponse.json(serializeNotification(notification))
  } catch (error) {
    return apiError('notifications.POST', error, 'Failed to create notification')
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 })
    }

    const notification = await prisma.notification.update({
      where: { id: String(body.id) },
      data: {
        title: String(body.title).trim(),
        message: String(body.message).trim(),
      },
      include: { createdBy: true },
    })

    return NextResponse.json(serializeNotification(notification))
  } catch (error) {
    return apiError('notifications.PATCH', error, 'Failed to update notification')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 })
    }

    await prisma.notification.delete({
      where: { id: String(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('notifications.DELETE', error, 'Failed to delete notification')
  }
}
