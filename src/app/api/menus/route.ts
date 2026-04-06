import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const serializeMenu = (menu: Awaited<ReturnType<typeof prisma.menu.findFirstOrThrow>> & {
  items: Awaited<ReturnType<typeof prisma.menuItem.findMany>>
  user: { name: string }
}) => ({
  id: menu.id,
  week: menu.week,
  items: menu.items,
  purchasers: menu.purchasers,
  userId: menu.userId,
  user: menu.user.name,
  createdAt: menu.createdAt,
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const menus = await prisma.menu.findMany({ include: { items: true, user: true } })
    return NextResponse.json(menus.map(serializeMenu))
  } catch (error) {
    return apiError('menus.GET', error, 'Failed to fetch menus')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const body = await request.json()
    const { items, user, id: _ignoreId, createdAt: _ignoreCreatedAt, ...menuData } = body
    const menu = await prisma.menu.create({
      data: {
        week: menuData.week,
        purchasers: menuData.purchasers,
        userId: menuData.userId,
        items: {
          create: items
        }
      },
      include: { items: true, user: true }
    })
    return NextResponse.json(serializeMenu(menu))
  } catch (error) {
    return apiError('menus.POST', error, 'Failed to create menu')
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const body = await request.json()
    const { id, items, user, createdAt: _ignoreCreatedAt, ...menuData } = body
    await prisma.menuItem.deleteMany({ where: { menuId: id } })
    const menu = await prisma.menu.update({
      where: { id },
      data: {
        week: menuData.week,
        purchasers: menuData.purchasers,
        userId: menuData.userId,
        items: {
          create: items
        }
      },
      include: { items: true, user: true }
    })
    return NextResponse.json(serializeMenu(menu))
  } catch (error) {
    return apiError('menus.PUT', error, 'Failed to update menu')
  }
}
