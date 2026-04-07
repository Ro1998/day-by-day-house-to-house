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
    return NextResponse.json(availabilities.map(serializeAvailability))
  } catch (error) {
    return apiError('availability.GET', error, 'Failed to fetch availability')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const body = await request.json()
    const availability = await prisma.availability.create({
      data: {
        week: String(body.week),
        day: String(body.day),
        meal: String(body.meal),
        available: Boolean(body.available),
        note: body.note ? String(body.note).trim() : null,
        userId: body.userId,
      },
      include: { user: true },
    })
    return NextResponse.json(serializeAvailability(availability))
  } catch (error) {
    return apiError('availability.POST', error, 'Failed to create availability')
  }
}
