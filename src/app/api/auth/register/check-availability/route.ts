import { NextResponse } from 'next/server'
import { apiError } from '@/lib/api-error'
import { getRegistrationConflictMessage } from '@/lib/registration'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const email = String(body.email ?? '').trim().toLowerCase()

    const [usernameMessage, emailMessage] = await Promise.all([
      username ? getRegistrationConflictMessage({ username }) : Promise.resolve(null),
      email ? getRegistrationConflictMessage({ email }) : Promise.resolve(null),
    ])

    return NextResponse.json({
      usernameMessage,
      emailMessage,
    })
  } catch (error) {
    return apiError('auth.register.check-availability.POST', error, 'Failed to check registration availability')
  }
}
