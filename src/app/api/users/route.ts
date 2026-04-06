import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError } from '@/lib/api-error'

export async function GET() {
  try {
    const users = await prisma.user.findMany()
    return NextResponse.json(users)
  } catch (error) {
    return apiError('users.GET', error, 'Failed to fetch users')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const user = await prisma.user.create({ data: body })
    return NextResponse.json(user)
  } catch (error) {
    return apiError('users.POST', error, 'Failed to create user')
  }
}
