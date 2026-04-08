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

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const payments = await prisma.monthlyPayment.findMany({ include: { user: true } })
    const serialized = payments.map(serializePayment)

    if (auth.user.role !== 'admin' && auth.user.role !== 'overseer') {
      return NextResponse.json(serialized.map(p => ({
        ...p,
        memberName: 'Hidden',
        user: 'Hidden',
        note: null
      })))
    }
    return NextResponse.json(serialized)
  } catch (error) {
    return apiError('monthly-payments.GET', error, 'Failed to fetch payments')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    const month = String(body.month)
    const amount = Number(body.amount)
    const memberName = String(body.memberName ?? '').trim()
    const paymentType = String(body.paymentType ?? 'custom')
    const note = body.note ? String(body.note).trim() : null

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
          if (existingPayment.expenseId) {
            await tx.expense.update({
              where: { id: existingPayment.expenseId },
              data: {
                amount,
                description: `Monthly food money paid by ${memberName} for ${month}${note ? ` (${note})` : ''}`,
              },
            })
          }

          return tx.monthlyPayment.update({
            where: { id: existingPayment.id },
            data: {
              amount,
              paymentType,
              note,
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
            description: `Monthly food money paid by ${memberName} for ${month}${note ? ` (${note})` : ''}`,
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
            paymentType,
            note,
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
            description: `Monthly food money paid by ${memberName} for ${month}${note ? ` (${note})` : ''}`,
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
          paymentType,
          note,
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

export async function PATCH(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    const payment = await prisma.monthlyPayment.update({
      where: { id: String(body.id) },
      data: {
        month: body.month,
        memberName: body.memberName,
        paymentType: body.paymentType,
        amount: Number(body.amount),
        note: body.note,
        paid: body.paid,
      },
      include: { user: true }
    })

    return NextResponse.json(serializePayment(payment))
  } catch (error) {
    return apiError('monthly-payments.PATCH', error, 'Failed to update payment')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    await prisma.monthlyPayment.delete({
      where: { id: String(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('monthly-payments.DELETE', error, 'Failed to delete payment')
  }
}
