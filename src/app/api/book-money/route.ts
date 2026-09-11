import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const serializeRecord = (record: any) => ({
  id: record.id,
  month: record.month,
  year: record.year,
  bookType: record.bookType,
  bookName: record.bookName,
  priceLabel: record.priceLabel,
  unitPrice: record.unitPrice,
  mk1English: record.mk1English,
  mk1Hindi: record.mk1Hindi,
  mk2English: record.mk2English,
  mk2Hindi: record.mk2Hindi,
  knEnglish: record.knEnglish,
  knHindi: record.knHindi,
  note: record.note,
  createdById: record.createdById,
  createdBy: record.createdBy.name,
  createdAt: record.createdAt,
})

const normalizeCount = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? Math.floor(next) : 0
}

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const records = await prisma.bookMoneyRecord.findMany({
      include: { createdBy: true },
      orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(records.map(serializeRecord))
  } catch (error) {
    return apiError('book-money.GET', error, 'Failed to fetch book money records')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    const month = String(body?.month ?? '').trim()
    const unitPrice = Number(body?.unitPrice)

    if (!month || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: 'Month and price are required.' }, { status: 400 })
    }

    const record = await prisma.bookMoneyRecord.create({
      data: {
        month,
        year: month.slice(0, 4),
        bookType: String(body?.bookType ?? 'HWMR'),
        bookName: String(body?.bookName ?? '').trim() || 'Untitled book',
        priceLabel: String(body?.priceLabel ?? '').trim() || 'per book',
        unitPrice,
        mk1English: normalizeCount(body?.mk1English),
        mk1Hindi: normalizeCount(body?.mk1Hindi),
        mk2English: normalizeCount(body?.mk2English),
        mk2Hindi: normalizeCount(body?.mk2Hindi),
        knEnglish: normalizeCount(body?.knEnglish),
        knHindi: normalizeCount(body?.knHindi),
        note: String(body?.note ?? '').trim() || null,
        createdById: auth.user.id,
      },
      include: { createdBy: true },
    })

    return NextResponse.json(serializeRecord(record))
  } catch (error) {
    return apiError('book-money.POST', error, 'Failed to create book money record')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    await prisma.bookMoneyRecord.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('book-money.DELETE', error, 'Failed to delete book money record')
  }
}
