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
  englishPrice: record.englishPrice || record.unitPrice || 0,
  hindiPrice: record.hindiPrice || record.unitPrice || 0,
  englishVolumes: record.englishVolumes || 1,
  hindiVolumes: record.hindiVolumes || 1,
  mk1English: record.mk1English,
  mk1Hindi: record.mk1Hindi,
  mk2English: record.mk2English,
  mk2Hindi: record.mk2Hindi,
  knEnglish: record.knEnglish,
  knHindi: record.knHindi,
  mk1PaidAmount: record.mk1PaidAmount || 0,
  mk1PaidMethod: record.mk1PaidMethod,
  mk1PaidBy: record.mk1PaidBy,
  mk1PaidAt: record.mk1PaidAt,
  mk2PaidAmount: record.mk2PaidAmount || 0,
  mk2PaidMethod: record.mk2PaidMethod,
  mk2PaidBy: record.mk2PaidBy,
  mk2PaidAt: record.mk2PaidAt,
  knPaidAmount: record.knPaidAmount || 0,
  knPaidMethod: record.knPaidMethod,
  knPaidBy: record.knPaidBy,
  knPaidAt: record.knPaidAt,
  deadline: record.deadline,
  note: record.note,
  createdById: record.createdById,
  createdBy: record.createdBy.name,
  createdAt: record.createdAt,
})

const normalizeCount = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? Math.floor(next) : 0
}

const normalizeMoney = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? next : 0
}

const normalizeVolume = (value: unknown) => {
  const next = Number(value)
  return Number.isFinite(next) && next > 0 ? Math.floor(next) : 1
}

const normalizeNullableText = (value: unknown) => String(value ?? '').trim() || null

const normalizeRecordPayload = (body: any, userId: string) => {
  const month = String(body?.month ?? '').trim()
  const fallbackUnitPrice = normalizeMoney(body?.unitPrice)
  const englishPrice = normalizeMoney(body?.englishPrice ?? fallbackUnitPrice)
  const hindiPrice = normalizeMoney(body?.hindiPrice ?? fallbackUnitPrice)

  return {
    month,
    year: month.slice(0, 4),
    bookType: String(body?.bookType ?? 'HWMR'),
    bookName: String(body?.bookName ?? '').trim() || 'Untitled book',
    priceLabel: String(body?.priceLabel ?? '').trim() || 'per volume/book',
    unitPrice: englishPrice || hindiPrice || fallbackUnitPrice,
    englishPrice,
    hindiPrice,
    englishVolumes: normalizeVolume(body?.englishVolumes),
    hindiVolumes: normalizeVolume(body?.hindiVolumes),
    mk1English: normalizeCount(body?.mk1English),
    mk1Hindi: normalizeCount(body?.mk1Hindi),
    mk2English: normalizeCount(body?.mk2English),
    mk2Hindi: normalizeCount(body?.mk2Hindi),
    knEnglish: normalizeCount(body?.knEnglish),
    knHindi: normalizeCount(body?.knHindi),
    mk1PaidAmount: normalizeMoney(body?.mk1PaidAmount),
    mk1PaidMethod: normalizeNullableText(body?.mk1PaidMethod),
    mk1PaidBy: normalizeNullableText(body?.mk1PaidBy),
    mk1PaidAt: normalizeNullableText(body?.mk1PaidAt),
    mk2PaidAmount: normalizeMoney(body?.mk2PaidAmount),
    mk2PaidMethod: normalizeNullableText(body?.mk2PaidMethod),
    mk2PaidBy: normalizeNullableText(body?.mk2PaidBy),
    mk2PaidAt: normalizeNullableText(body?.mk2PaidAt),
    knPaidAmount: normalizeMoney(body?.knPaidAmount),
    knPaidMethod: normalizeNullableText(body?.knPaidMethod),
    knPaidBy: normalizeNullableText(body?.knPaidBy),
    knPaidAt: normalizeNullableText(body?.knPaidAt),
    deadline: normalizeNullableText(body?.deadline),
    note: normalizeNullableText(body?.note),
    createdById: userId,
  }
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
    const payload = normalizeRecordPayload(body, auth.user.id)

    if (!payload.month) {
      return NextResponse.json({ error: 'Month and price are required.' }, { status: 400 })
    }

    const record = await prisma.bookMoneyRecord.create({
      data: payload,
      include: { createdBy: true },
    })

    return NextResponse.json(serializeRecord(record))
  } catch (error) {
    return apiError('book-money.POST', error, 'Failed to create book money record')
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    const id = String(body?.id ?? '').trim()
    const payload = normalizeRecordPayload(body, auth.user.id)

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    if (!payload.month) {
      return NextResponse.json({ error: 'Month and price are required.' }, { status: 400 })
    }

    const { createdById, ...updateData } = payload
    const record = await prisma.bookMoneyRecord.update({
      where: { id },
      data: updateData,
      include: { createdBy: true },
    })

    return NextResponse.json(serializeRecord(record))
  } catch (error) {
    return apiError('book-money.PUT', error, 'Failed to update book money record')
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
