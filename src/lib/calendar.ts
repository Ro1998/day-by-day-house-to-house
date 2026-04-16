const CALENDAR_TIMEZONE = process.env.APP_TIMEZONE?.trim() || 'Asia/Kolkata'

const pad = (value: number) => String(value).padStart(2, '0')

const escapeCalendarText = (value: string) => (
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
)

const parseEventDate = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0)
}

const formatFloatingDateTime = (value: Date) => (
  `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}T${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}`
)

const formatUtcDateTime = (value: Date) => (
  `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}Z`
)

export const getEventDateRange = (date: string, time: string, durationMinutes = 60) => {
  const start = parseEventDate(date, time)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  return {
    start,
    end,
    startFloating: formatFloatingDateTime(start),
    endFloating: formatFloatingDateTime(end),
    startUtc: formatUtcDateTime(start),
    endUtc: formatUtcDateTime(end),
  }
}

export const buildGoogleCalendarUrl = (input: {
  title: string
  date: string
  time: string
  description?: string | null
  location?: string | null
  durationMinutes?: number
}) => {
  const range = getEventDateRange(input.date, input.time, input.durationMinutes)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${range.startFloating}/${range.endFloating}`,
    ctz: CALENDAR_TIMEZONE,
  })

  if (input.description?.trim()) {
    params.set('details', input.description.trim())
  }

  if (input.location?.trim()) {
    params.set('location', input.location.trim())
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export const buildEventIcsContent = (input: {
  id: string
  title: string
  date: string
  time: string
  description?: string | null
  location?: string | null
  durationMinutes?: number
}) => {
  const range = getEventDateRange(input.date, input.time, input.durationMinutes)
  const stamp = formatUtcDateTime(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Day by Day//Community Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(input.id)}@day-by-day-house-to-house`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${range.startFloating}`,
    `DTEND:${range.endFloating}`,
    `SUMMARY:${escapeCalendarText(input.title)}`,
  ]

  if (input.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeCalendarText(input.description.trim())}`)
  }

  if (input.location?.trim()) {
    lines.push(`LOCATION:${escapeCalendarText(input.location.trim())}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join('\r\n')
}
