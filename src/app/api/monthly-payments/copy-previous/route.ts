import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const serializePayment = (payment: Awaited<ReturnType<typeof prisma.monthlyPayment.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: payment.id,
  month: payment.month,
  paid: payment.paid,
  amount: payment.amount,
  memberName: payment.memberName ?? payment.user.name,
  paymentType: payment.paymentType ?? 'custom',
  note: payment.note,
  reminderSent: payment.reminderSent,
  expenseId: payment.expenseId,
  user: payment.user.name,
  userId: payment.userId,
  createdAt: payment.createdAt,
})

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    const targetMonth = String(body.month)

    if (!targetMonth) {
      return NextResponse.json({ error: 'Target month is required' }, { status: 400 })
    }

    // Get previous month
    const [year, month] = targetMonth.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    date.setMonth(date.getMonth() - 1)
    const previousMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    // Get all unique members from previous month
    const previousMonthPayments = await prisma.monthlyPayment.findMany({
      where: { month: previousMonth },
      include: { user: true },
    })

    if (previousMonthPayments.length === 0) {
      return NextResponse.json({ message: 'No entries in previous month to copy' }, { status: 200 })
    }

    // Check if target month already has entries
    const existingTargetEntries = await prisma.monthlyPayment.findMany({
      where: { month: targetMonth },
    })

    if (existingTargetEntries.length > 0) {
      return NextResponse.json({ error: 'Target month already has entries' }, { status: 400 })
    }

    // Copy entries from previous month to target month, resetting paid status and expenseId
    const createdPayments = await Promise.all(
      previousMonthPayments.map((payment) =>
        prisma.monthlyPayment.create({
          data: {
            month: targetMonth,
            memberName: payment.memberName,
            paymentType: payment.paymentType,
            amount: payment.amount,
            note: payment.note,
            paid: false,
            reminderSent: false,
            expenseId: null,
            userId: payment.userId,
          },
          include: { user: true },
        })
      )
    )

    const serialized = createdPayments.map(serializePayment)
    return NextResponse.json({
      message: `Copied ${serialized.length} entries from ${previousMonth} to ${targetMonth}`,
      entries: serialized,
    })
  } catch (error) {
    return apiError('monthly-payments.copy-previous.POST', error, 'Failed to copy entries from previous month')
  }
}
