import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'
import { sendMenuEmails, sendNotificationEmails } from '@/lib/email'
import type { Menu } from '@/types'

const serializeNotification = (notification: Awaited<ReturnType<typeof prisma.notification.findFirstOrThrow>> & { createdBy: { name: string } }) => ({
  id: notification.id,
  title: notification.title,
  message: notification.message,
  category: notification.category,
  createdBy: notification.createdBy.name,
  createdById: notification.createdById,
  recipientUserIds: notification.recipientUserIds,
  readByUserIds: notification.readByUserIds,
  createdAt: notification.createdAt.toISOString(),
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { recipientUserIds: { isEmpty: true } },
          { recipientUserIds: { has: auth.user.id } },
        ],
      },
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
    const recipientUserIds = Array.isArray(body.recipientUserIds)
      ? body.recipientUserIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      : []
    const notification = await prisma.notification.create({
      data: {
        title: String(body.title).trim(),
        message: String(body.message).trim(),
        category: String(body.category ?? 'general'),
        createdById: auth.user.id,
        recipientUserIds,
      },
      include: { createdBy: true },
    })

    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
        approved: true,
        ...(recipientUserIds.length > 0 ? { id: { in: recipientUserIds } } : {}),
      },
      select: { id: true, email: true, name: true },
    })
    const usersWithEmail = users.filter(u => u.email) as Array<{ id: string; email: string; name: string }>
    if (usersWithEmail.length > 0) {
      const menuData = body.menuData as Menu | undefined
      const imageDataUrl = typeof body.emailImageDataUrl === 'string' ? body.emailImageDataUrl : undefined

      if (notification.category === 'menu' && menuData?.week && Array.isArray(menuData.items)) {
        sendMenuEmails(usersWithEmail, menuData, {
          title: notification.title,
          imageDataUrl,
        }).catch(console.error)
      } else {
        const emailMessage = notification.message.startsWith('[MENU_IMAGE]')
          ? `A new menu has been published. Please open the dashboard to view the image version.`
          : notification.message

        sendNotificationEmails(usersWithEmail, notification.title, emailMessage).catch(console.error)
      }
    }

    return NextResponse.json(serializeNotification(notification))
  } catch (error) {
    return apiError('notifications.POST', error, 'Failed to create notification')
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const auth = body.markRead === true
      ? await requireApprovedUser(request)
      : await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    if (!body.id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 })
    }

    if (body.markRead === true) {
      const notification = await prisma.notification.update({
        where: { id: String(body.id) },
        data: {
          readByUserIds: {
            push: auth.user.id,
          },
        },
        include: { createdBy: true },
      })

      const uniqueReadByUserIds = Array.from(new Set(notification.readByUserIds))
      if (uniqueReadByUserIds.length !== notification.readByUserIds.length) {
        const deduped = await prisma.notification.update({
          where: { id: notification.id },
          data: { readByUserIds: uniqueReadByUserIds },
          include: { createdBy: true },
        })
        return NextResponse.json(serializeNotification(deduped))
      }

      return NextResponse.json(serializeNotification(notification))
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
