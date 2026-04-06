import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const serializePayment = (payment: Awaited<ReturnType<typeof prisma.monthlyPayment.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: payment.id,
  month: payment.month,
  paid: payment.paid,
  amount: payment.amount,
  user: payment.user.name,
  userId: payment.userId,
  createdAt: payment.createdAt,
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const payments = await prisma.monthlyPayment.findMany({ include: { user: true } })
    return NextResponse.json(payments.map(serializePayment))
  } catch (error) {
    return apiError('monthly-payments.GET', error, 'Failed to fetch payments')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const body = await request.json()
    const payment = await prisma.monthlyPayment.create({
      data: {
        month: body.month,
        paid: Boolean(body.paid),
        amount: Number(body.amount),
        userId: body.userId,
      },
      include: { user: true },
    })
    return NextResponse.json(serializePayment(payment))
  } catch (error) {
    return apiError('monthly-payments.POST', error, 'Failed to create payment')
  }
}
