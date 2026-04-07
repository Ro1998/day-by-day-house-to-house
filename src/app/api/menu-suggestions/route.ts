import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireApprovedUser } from '@/lib/auth'

const serializeSuggestion = (suggestion: Awaited<ReturnType<typeof prisma.menuSuggestion.findFirstOrThrow>> & { user: { name: string } }) => ({
  id: suggestion.id,
  suggestion: suggestion.suggestion,
  preferredDay: suggestion.preferredDay,
  preferredMeal: suggestion.preferredMeal,
  status: suggestion.status,
  user: suggestion.user.name,
  userId: suggestion.userId,
  createdAt: suggestion.createdAt.toISOString(),
})

export async function GET(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const suggestions = await prisma.menuSuggestion.findMany({
      where: auth.user.role === 'user' ? { userId: auth.user.id } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(suggestions.map(serializeSuggestion))
  } catch (error) {
    return apiError('menu-suggestions.GET', error, 'Failed to fetch menu suggestions')
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApprovedUser(request)
    if (auth.error) return auth.error
    const body = await request.json()
    const suggestion = await prisma.menuSuggestion.create({
      data: {
        suggestion: String(body.suggestion).trim(),
        preferredDay: body.preferredDay ? String(body.preferredDay) : null,
        preferredMeal: body.preferredMeal ? String(body.preferredMeal) : null,
        status: 'pending',
        userId: body.userId,
      },
      include: { user: true },
    })
    return NextResponse.json(serializeSuggestion(suggestion))
  } catch (error) {
    return apiError('menu-suggestions.POST', error, 'Failed to create menu suggestion')
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApprovedUser(request, ['admin'])
    if (auth.error) return auth.error
    const body = await request.json()
    const suggestion = await prisma.menuSuggestion.update({
      where: { id: String(body.id) },
      data: { status: String(body.status) },
      include: { user: true },
    })
    return NextResponse.json(serializeSuggestion(suggestion))
  } catch (error) {
    return apiError('menu-suggestions.PATCH', error, 'Failed to update menu suggestion')
  }
}
