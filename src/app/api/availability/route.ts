import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'

const serializeAvailability = (entry: Awaited<ReturnType<typeof prisma.availability.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: entry.id,
  week: entry.week,
  day: entry.day,
  meal: entry.meal,
  available: entry.available,
  note: entry.note,
  user: entry.user.name,
  userId: entry.userId,
  createdAt: entry.createdAt.toISOString(),
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const availabilities = await prisma.availability.findMany({
      where: auth.user.role === 'user' ? { userId: auth.user.id } : undefined,
      include: { user: true },
      orderBy: [{ week: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(availabilities.map(serializeAvailability), {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    return apiError('availability.GET', error, 'Failed to fetch availability')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const body = await request.json()
    const week = String(body.week)
    const userId = String(body.userId)
    const entries: Array<{ day: string; meal: string; available: boolean; note?: string }> = Array.isArray(body.entries) ? body.entries : []

    if (entries.length === 0) {
      return NextResponse.json({ error: 'At least one availability selection is required.' }, { status: 400 })
    }

    const availabilities = await prisma.$transaction(
      entries.map((entry) => prisma.availability.create({
        data: {
          week,
          day: String(entry.day),
          meal: String(entry.meal),
          available: Boolean(entry.available),
          note: entry.note ? String(entry.note).trim() : null,
          userId,
        },
        include: { user: true },
      })),
    )

    return NextResponse.json(availabilities.map(serializeAvailability))
  } catch (error) {
    return apiError('availability.POST', error, 'Failed to create availability')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error
    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map((id: unknown) => String(id)) : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Availability ids are required.' }, { status: 400 })
    }

    await prisma.availability.deleteMany({
      where: {
        id: { in: ids },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('availability.DELETE', error, 'Failed to review availability')
  }
}
