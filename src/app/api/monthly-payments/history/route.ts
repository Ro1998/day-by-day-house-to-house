import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface PaymentHistoryItem {
  memberName: string
  userId?: string
  months: Array<{
    month: string
    paid: boolean
    amount: number
    paymentType: string | null
    note: string | null
    id: string
  }>
}

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    // Get all monthly payments
    const payments = await prisma.monthlyPayment.findMany({
      include: { user: true },
      orderBy: [{ memberName: 'asc' }, { month: 'desc' }],
    })

    // Organize by memberName
    const historyMap = new Map<string, PaymentHistoryItem>()

    payments.forEach((payment) => {
      const memberName = payment.memberName || 'Unknown'
      if (!historyMap.has(memberName)) {
        historyMap.set(memberName, {
          memberName,
          userId: payment.userId,
          months: [],
        })
      }

      const entry = historyMap.get(memberName)!
      entry.months.push({
        month: payment.month,
        paid: payment.paid,
        amount: payment.amount,
        paymentType: payment.paymentType,
        note: payment.note,
        id: payment.id,
      })
    })

    const history = Array.from(historyMap.values())

    // Get summary of unpaid months
    const unpaidByPerson = new Map<string, string[]>()
    history.forEach((person) => {
      const unpaidMonths = person.months
        .filter((m) => !m.paid)
        .map((m) => m.month)
        .sort()
        .reverse()

      if (unpaidMonths.length > 0) {
        unpaidByPerson.set(person.memberName, unpaidMonths)
      }
    })

    return NextResponse.json({
      history,
      unpaidSummary: Object.fromEntries(unpaidByPerson),
      totalPeople: history.length,
      totalUnpaidEntries: payments.filter((p) => !p.paid).length,
    })
  } catch (error) {
    return apiError('monthly-payments/history.GET', error, 'Failed to fetch payment history')
  }
}
