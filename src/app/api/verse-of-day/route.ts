import { NextResponse } from 'next/server'
import { getVerseOfDay } from '@/lib/verse-of-day'

export async function GET() {
  const verse = getVerseOfDay()

  return NextResponse.json({
    verse,
    enabled: verse !== null,
  })
}
