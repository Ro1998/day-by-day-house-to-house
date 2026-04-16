import { PrismaClient } from '@prisma/client'

const supabaseDatabaseUrl = process.env.DATABASE_URL

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: supabaseDatabaseUrl,
    },
  },
})

async function testSupabaseConnection() {
  if (!supabaseDatabaseUrl) {
    console.log('DATABASE_URL is not set.')
    process.exit(1)
  }

  const parsedUrl = new URL(supabaseDatabaseUrl)

  console.log('Testing Supabase connection details...')
  console.log(`Host: ${parsedUrl.hostname}`)
  console.log(`Port: ${parsedUrl.port || '5432'}`)
  console.log(`Database: ${parsedUrl.pathname.replace(/^\//, '') || 'postgres'}`)
  console.log(`User: ${decodeURIComponent(parsedUrl.username || 'postgres')}`)
  console.log('')

  try {
    await supabasePrisma.$connect()
    const result = await supabasePrisma.$queryRaw`SELECT 1 as test, NOW() as current_time`
    console.log('Connection successful.')
    console.log('Result:', result)

    const tables = ['User', 'Expense', 'MonthlyPayment', 'Menu', 'Activity']

    for (const table of tables) {
      try {
        const countResult = await supabasePrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`)
        const count = Number((countResult as any)[0]?.count || 0)
        console.log(`${table}: ${count} records`)
      } catch (error) {
        console.log(
          `${table}: Table does not exist or returned an error - ${
            error instanceof Error ? error.message : 'Unknown'
          }`,
        )
      }
    }
  } catch (error) {
    console.error('Connection failed:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.log(
      `psql -h ${parsedUrl.hostname} -p ${parsedUrl.port || '5432'} -d ${
        parsedUrl.pathname.replace(/^\//, '') || 'postgres'
      } -U ${decodeURIComponent(parsedUrl.username || 'postgres')}`,
    )
  } finally {
    await supabasePrisma.$disconnect()
  }
}

testSupabaseConnection()
