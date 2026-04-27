import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DAY_ORDER = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', "Lord's Day", 'Sunday', 'Monday']

const serializeMenu = (menu: Awaited<ReturnType<typeof prisma.menu.findFirstOrThrow>> & {
  items: Awaited<ReturnType<typeof prisma.menuItem.findMany>>
  user: { name: string }
}) => ({
  id: menu.id,
  week: menu.week,
  items: [...menu.items].sort((left, right) => {
    const leftIndex = DAY_ORDER.indexOf(left.day)
    const rightIndex = DAY_ORDER.indexOf(right.day)
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
  }),
  purchasers: menu.purchasers,
  userId: menu.userId,
  user: menu.user.name,
  createdAt: menu.createdAt,
})

const normalizeStringArray = (input: unknown) => (
  Array.isArray(input)
    ? input
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
    : []
)

const normalizeMenuPayload = (body: any) => ({
  week: String(body?.week ?? '').trim(),
  purchasers: normalizeStringArray(body?.purchasers),
  items: Array.isArray(body?.items)
    ? body.items.map((item: any) => ({
        day: String(item?.day ?? '').trim(),
        lunch: String(item?.lunch ?? '').trim(),
        dinner: String(item?.dinner ?? '').trim(),
        lunchCooks: normalizeStringArray(item?.lunchCooks),
        dinnerCooks: normalizeStringArray(item?.dinnerCooks),
      }))
    : [],
})

const saveMenuForWeek = async (body: any, actingUserId: string) => {
  const menuData = normalizeMenuPayload(body)

  if (!menuData.week) {
    throw new Error('Week is required.')
  }

  if (menuData.items.length === 0) {
    throw new Error('At least one menu item is required.')
  }

  return prisma.$transaction(async (tx) => {
    const existingMenu = await tx.menu.findUnique({
      where: { week: menuData.week },
      select: { id: true },
    })

    if (!existingMenu) {
      return tx.menu.create({
        data: {
          week: menuData.week,
          purchasers: menuData.purchasers,
          userId: actingUserId,
          items: {
            create: menuData.items,
          },
        },
        include: { items: true, user: true },
      })
    }

    return tx.menu.update({
      where: { id: existingMenu.id },
      data: {
        purchasers: menuData.purchasers,
        userId: actingUserId,
        items: {
          deleteMany: {},
          create: menuData.items,
        },
      },
      include: { items: true, user: true },
    })
  })
}

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const menus = await prisma.menu.findMany({
      include: { items: true, user: true },
      orderBy: [{ week: 'desc' }, { createdAt: 'desc' }],
    })
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
    const menu = await saveMenuForWeek(body, auth.user.id)
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
    const menu = await saveMenuForWeek(body, auth.user.id)
    return NextResponse.json(serializeMenu(menu))
  } catch (error) {
    return apiError('menus.PUT', error, 'Failed to update menu')
  }
}
