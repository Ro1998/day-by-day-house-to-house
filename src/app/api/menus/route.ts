import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const menus = await prisma.menu.findMany({ include: { items: true, user: true } })
    return NextResponse.json(menus.map(serializeMenu))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, ...menuData } = body
    const menu = await prisma.menu.create({
      data: {
        ...menuData,
        items: {
          create: items
        }
      },
      include: { items: true, user: true }
    })
    return NextResponse.json(serializeMenu(menu))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, items, ...menuData } = body
    await prisma.menuItem.deleteMany({ where: { menuId: id } })
    const menu = await prisma.menu.update({
      where: { id },
      data: {
        ...menuData,
        items: {
          create: items
        }
      },
      include: { items: true, user: true }
    })
    return NextResponse.json(serializeMenu(menu))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 })
  }
}
