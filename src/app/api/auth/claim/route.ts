import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Claim Existing Account has been removed. Use Forgot Password or ask an admin for a reset link.' },
    { status: 410 },
  )
}
