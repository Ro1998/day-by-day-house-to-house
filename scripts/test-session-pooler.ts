import { PrismaClient } from '@prisma/client'

const sessionPoolerUrl = process.env.DATABASE_URL

const alternativeUrls = sessionPoolerUrl
  ? Array.from(
      new Set([
        sessionPoolerUrl,
        sessionPoolerUrl.replace(':5432/', ':6543/'),
        sessionPoolerUrl.includes('pgbouncer=true')
          ? sessionPoolerUrl
          : `${sessionPoolerUrl}${sessionPoolerUrl.includes('?') ? '&' : '?'}pgbouncer=true`,
      ]),
    )
  : []

async function testSessionPooler() {
  if (alternativeUrls.length === 0) {
    console.log('DATABASE_URL is not set.')
    process.exit(1)
  }

  console.log('Testing session-pooler connection options...')

  for (let index = 0; index < alternativeUrls.length; index += 1) {
    const url = alternativeUrls[index]
    console.log(`--- Test ${index + 1} ---`)
    console.log(`URL: ${url.split('@')[0]}@[HIDDEN]`)

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url,
        },
      },
    })

    try {
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`
      await prisma.$disconnect()
      console.log('Connection successful.')
      return
    } catch (error) {
      console.log('Connection failed:', error instanceof Error ? error.message : 'Unknown error')
      try {
        await prisma.$disconnect()
      } catch {
        // Ignore disconnect errors for failed connection attempts.
      }
    }
  }

  console.log('All session-pooler connection attempts failed.')
}

testSessionPooler()
