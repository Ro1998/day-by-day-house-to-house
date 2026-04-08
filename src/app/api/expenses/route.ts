import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { requireApprovedUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const serializeExpense = (expense: Awaited<ReturnType<typeof prisma.expense.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: expense.id,
  date: expense.date,
  type: expense.type,
  category: expense.category,
  amount: expense.amount,
  description: expense.description,
  user: expense.user.name,
  userId: expense.userId,
  createdAt: expense.createdAt,
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error

    const expenses = await prisma.expense.findMany({ include: { user: true } })
    const serializedExpenses = expenses.map(serializeExpense)

    if (auth.user.role === 'admin' || auth.user.role === 'overseer') {
      return NextResponse.json(serializedExpenses)
    }

    const restrictedExpenses = serializedExpenses
      .map((expense) => (
        expense.type === 'in'
          ? {
              ...expense,
              category: 'Income',
              description: 'Hidden for general users',
              user: 'Restricted',
            }
          : expense
      ))

    return NextResponse.json(restrictedExpenses)
  } catch (error) {
    return apiError('expenses.GET', error, 'Failed to fetch expenses')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const body = await request.json()
    const expense = await prisma.expense.create({
      data: {
        date: body.date,
        type: body.type,
        category: body.category,
        amount: Number(body.amount),
        description: body.description,
        userId: body.userId,
      },
      include: { user: true },
    })
    return NextResponse.json(serializeExpense(expense))
  } catch (error) {
    return apiError('expenses.POST', error, 'Failed to create expense')
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin', 'coordinator'])
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return apiError('expenses.DELETE', error, 'Failed to delete expense')
  }
}
