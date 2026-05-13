export interface VerseOfDayEntry {
  reference: string
  text: string
  translation?: string
}

const VERSE_TIME_ZONE = 'Asia/Kolkata'

const parseVerseEntries = (): VerseOfDayEntry[] => {
  const raw = process.env.VERSE_OF_DAY_ENTRIES

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((entry): entry is VerseOfDayEntry => (
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.reference === 'string' &&
      entry.reference.trim().length > 0 &&
      typeof entry.text === 'string' &&
      entry.text.trim().length > 0 &&
      (typeof entry.translation === 'undefined' || typeof entry.translation === 'string')
    ))
  } catch (error) {
    console.error('Failed to parse VERSE_OF_DAY_ENTRIES', error)
    return []
  }
}

const getDateKey = (date: Date) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: VERSE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

const hashDateKey = (dateKey: string) => {
  let hash = 0

  for (const character of dateKey) {
    hash = ((hash << 5) - hash) + character.charCodeAt(0)
    hash |= 0
  }

  return Math.abs(hash)
}

export const getVerseOfDay = (date = new Date()) => {
  const entries = parseVerseEntries()

  if (entries.length === 0) {
    return null
  }

  const dateKey = getDateKey(date)
  const verse = entries[hashDateKey(dateKey) % entries.length]

  return {
    ...verse,
    dateKey,
  }
}
