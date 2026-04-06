import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({ include: { user: true } })
    return NextResponse.json(expenses.map(serializeExpense))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const expense = await prisma.expense.create({ data: body, include: { user: true } })
    return NextResponse.json(serializeExpense(expense))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
