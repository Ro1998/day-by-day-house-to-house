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
  reminderSent: payment.reminderSent,
  expenseId: payment.expenseId,
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
    const month = String(body.month)
    const amount = Number(body.amount)
    const memberName = String(body.memberName ?? '').trim()

    if (!memberName) {
      return NextResponse.json({ error: 'Member name is required.' }, { status: 400 })
    }

    const existingPayment = await prisma.monthlyPayment.findFirst({
      where: {
        month,
        memberName,
      },
    })

    const payment = await prisma.$transaction(async (tx) => {
      if (existingPayment) {
        let expenseId = existingPayment.expenseId

        if (existingPayment.paid && body.paid) {
          return tx.monthlyPayment.update({
            where: { id: existingPayment.id },
            data: {
              amount,
              reminderSent: false,
            },
            include: { user: true },
          })
        }

        if (!existingPayment.paid && body.paid) {
          const expense = await tx.expense.create({
            data: {
              date: `${month}-01`,
              type: 'in',
              category: 'food money',
              amount,
              description: `Monthly food money paid by ${memberName} for ${month}`,
              userId: body.userId,
            },
          })
          expenseId = expense.id
        }

        return tx.monthlyPayment.update({
          where: { id: existingPayment.id },
          data: {
            paid: Boolean(body.paid),
            amount,
            reminderSent: !body.paid,
            expenseId,
            userId: body.userId,
          },
          include: { user: true },
        })
      }

      let expenseId: string | null = null

      if (body.paid) {
        const expense = await tx.expense.create({
          data: {
            date: `${month}-01`,
            type: 'in',
            category: 'food money',
            amount,
            description: `Monthly food money paid by ${memberName} for ${month}`,
            userId: body.userId,
          },
        })
        expenseId = expense.id
      }

      return tx.monthlyPayment.create({
        data: {
          month,
          paid: Boolean(body.paid),
          amount,
          memberName,
          reminderSent: !body.paid,
          expenseId,
          userId: body.userId,
        },
        include: { user: true },
      })
    })

    return NextResponse.json(serializePayment(payment))
  } catch (error) {
    return apiError('monthly-payments.POST', error, 'Failed to create payment')
  }
}
