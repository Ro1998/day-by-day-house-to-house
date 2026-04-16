import { PrismaClient } from '@prisma/client'

const connectionStrings = process.env.DATABASE_URL ? [process.env.DATABASE_URL] : []

async function testSupabaseConnections() {
  if (connectionStrings.length === 0) {
    console.log('DATABASE_URL is not set.')
    process.exit(1)
  }

  console.log('Testing Supabase connection formats...')

  for (let index = 0; index < connectionStrings.length; index += 1) {
    const connectionString = connectionStrings[index]
    console.log(`--- Test ${index + 1} ---`)
    console.log(`Connection string: ${connectionString.split('@')[0]}@[HIDDEN]`)

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    })

    try {
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1 as test`
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

  console.log('All connection attempts failed.')
}

testSupabaseConnections()
