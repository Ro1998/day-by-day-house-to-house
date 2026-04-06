import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

const inferDatabaseMessage = (error: unknown, fallbackMessage: string) => {
  if (!process.env.DATABASE_URL) {
    return 'DATABASE_URL is missing in the deployed environment.'
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 'Unable to connect to the database. Check DATABASE_URL and database access settings.'
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') {
      return 'Database tables are missing. Run `prisma db push` or apply migrations to the production database.'
    }

    if (error.code === 'P2022') {
      return 'Database columns are out of sync with the Prisma schema. Update the production database schema.'
    }
  }

  return fallbackMessage
}

export const apiError = (scope: string, error: unknown, fallbackMessage: string) => {
  const message = inferDatabaseMessage(error, fallbackMessage)
  console.error(`[${scope}]`, error)

  return NextResponse.json({ error: message }, { status: 500 })
}
