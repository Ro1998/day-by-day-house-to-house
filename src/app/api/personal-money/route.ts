import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const serializeEntry = (entry: any) => ({
  id: entry.id,
  date: entry.date,
  month: entry.month,
  year: entry.year,
  kind: entry.kind,
  category: entry.category,
  amount: entry.amount,
  counterparty: entry.counterparty,
  description: entry.description,
  createdById: entry.createdById,
  createdBy: entry.createdBy.name,
  createdAt: entry.createdAt,
})

const monthFromDate = (date: string) => date.slice(0, 7)
const yearFromDate = (date: string) => date.slice(0, 4)

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const entries = await prisma.personalMoneyEntry.findMany({
      include: { createdBy: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(entries.map(serializeEntry))
  } catch (error) {
    return apiError('personal-money.GET', error, 'Failed to fetch personal money records')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    const date = String(body?.date ?? '').trim()
    const amount = Number(body?.amount)

    if (!date || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Date and a positive amount are required.' }, { status: 400 })
    }

    const entry = await prisma.personalMoneyEntry.create({
      data: {
        date,
        month: monthFromDate(date),
        year: yearFromDate(date),
        kind: String(body?.kind ?? 'expense'),
        category: String(body?.category ?? '').trim() || 'General',
        amount,
        counterparty: String(body?.counterparty ?? '').trim() || null,
        description: String(body?.description ?? '').trim() || 'No description',
        createdById: auth.user.id,
      },
      include: { createdBy: true },
    })

    return NextResponse.json(serializeEntry(entry))
  } catch (error) {
    return apiError('personal-money.POST', error, 'Failed to create personal money record')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await prisma.personalMoneyEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('personal-money.DELETE', error, 'Failed to delete personal money record')
  }
}
