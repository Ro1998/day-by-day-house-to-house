import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'
import { buildGoogleCalendarUrl } from '@/lib/calendar'
import { sendEventEmails } from '@/lib/email'

const isMissingCommunityEventTable = (error: unknown) => {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('communityevent') &&
    (message.includes('does not exist') ||
      message.includes('relation') ||
      message.includes('table') ||
      message.includes('invalid `prisma.communityevent'))
  )
}

const serializeEvent = (
  event: Awaited<ReturnType<typeof prisma.communityEvent.findFirstOrThrow>> & {
    createdBy: { name: string }
  },
) => ({
  id: event.id,
  title: event.title,
  date: event.date,
  time: event.time,
  type: event.type as 'online' | 'offline',
  location: event.location,
  venue: event.venue,
  description: event.description,
  createdBy: event.createdBy.name,
  createdById: event.createdById,
  createdAt: event.createdAt.toISOString(),
  googleCalendarUrl: buildGoogleCalendarUrl({
    title: event.title,
    date: event.date,
    time: event.time,
    description: event.description,
    location: event.location || event.venue,
  }),
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const events = await prisma.communityEvent.findMany({
      include: { createdBy: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(events.map(serializeEvent))
  } catch (error) {
    if (isMissingCommunityEventTable(error)) {
      return NextResponse.json([])
    }

    return apiError('events.GET', error, 'Failed to fetch events')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator', 'overseer'])
    if (auth.error) return auth.error

    const body = await request.json()
    const type = body.type === 'online' ? 'online' : 'offline'
    const title = String(body.title ?? '').trim()
    const date = String(body.date ?? '').trim()
    const time = String(body.time ?? '').trim()
    const location = typeof body.location === 'string' ? body.location.trim() : ''
    const venue = typeof body.venue === 'string' ? body.venue.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''

    if (!title || !date || !time) {
      return NextResponse.json({ error: 'Title, date, and time are required.' }, { status: 400 })
    }

    const event = await prisma.communityEvent.create({
      data: {
        title,
        date,
        time,
        type,
        location: location || null,
        venue: venue || null,
        description: description || null,
        createdById: auth.user.id,
      },
      include: { createdBy: true },
    })

    const recipients = await prisma.user.findMany({
      where: {
        approved: true,
        isArchived: false,
        email: { not: null },
      },
      select: {
        email: true,
        name: true,
      },
    })

    const usersWithEmail = recipients.filter((user) => user.email) as Array<{ email: string; name: string }>
    if (usersWithEmail.length > 0) {
      sendEventEmails(usersWithEmail, {
        id: event.id,
        title,
        date,
        time,
        type,
        location: location || null,
        venue: venue || null,
        description: description || null,
        createdBy: event.createdBy.name,
      }).catch(console.error)
    }

    return NextResponse.json(serializeEvent(event))
  } catch (error) {
    if (isMissingCommunityEventTable(error)) {
      return NextResponse.json(
        { error: 'The community events table has not been created in Supabase yet.' },
        { status: 503 },
      )
    }

    return apiError('events.POST', error, 'Failed to create event')
  }
}
