import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'

const serializeItem = (item: Awaited<ReturnType<typeof prisma.inventoryItem.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  quantity: item.quantity,
  unit: item.unit,
  lowStockThreshold: item.lowStockThreshold,
  lastPurchasedAt: item.lastPurchasedAt,
  lastPrice: item.lastPrice,
  note: item.note,
  user: item.user.name,
  userId: item.userId,
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const items = await prisma.inventoryItem.findMany({
      include: { user: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(items.map(serializeItem))
  } catch (error) {
    return apiError('inventory.GET', error, 'Failed to fetch inventory')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const body = await request.json()
    const item = await prisma.inventoryItem.create({
      data: {
        name: String(body.name).trim(),
        category: String(body.category),
        quantity: Number(body.quantity),
        unit: String(body.unit).trim(),
        lowStockThreshold: Number(body.lowStockThreshold ?? 0),
        lastPurchasedAt: body.lastPurchasedAt ? String(body.lastPurchasedAt) : null,
        lastPrice: body.lastPrice === '' || body.lastPrice == null ? null : Number(body.lastPrice),
        note: body.note ? String(body.note).trim() : null,
        userId: body.userId,
      },
      include: { user: true },
    })
    return NextResponse.json(serializeItem(item))
  } catch (error) {
    return apiError('inventory.POST', error, 'Failed to create inventory item')
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const body = await request.json()
    const item = await prisma.inventoryItem.update({
      where: { id: String(body.id) },
      data: {
        name: String(body.name).trim(),
        category: String(body.category),
        quantity: Number(body.quantity),
        unit: String(body.unit).trim(),
        lowStockThreshold: Number(body.lowStockThreshold ?? 0),
        lastPurchasedAt: body.lastPurchasedAt ? String(body.lastPurchasedAt) : null,
        lastPrice: body.lastPrice === '' || body.lastPrice == null ? null : Number(body.lastPrice),
        note: body.note ? String(body.note).trim() : null,
      },
      include: { user: true },
    })
    return NextResponse.json(serializeItem(item))
  } catch (error) {
    return apiError('inventory.PUT', error, 'Failed to update inventory item')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await prisma.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('inventory.DELETE', error, 'Failed to delete inventory item')
  }
}
