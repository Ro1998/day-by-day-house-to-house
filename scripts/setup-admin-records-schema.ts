import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const loadEnvLocal = () => {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/)
    if (!match) continue

    const name = match[1].trim()
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[name] = process.env[name] || value
  }
}

loadEnvLocal()

const prisma = new PrismaClient()

const statements = [
  `CREATE TABLE IF NOT EXISTS "PersonalMoneyEntry" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "counterparty" TEXT,
    "description" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonalMoneyEntry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "BookMoneyRecord" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "bookType" TEXT NOT NULL,
    "bookName" TEXT NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "englishPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hindiPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "englishVolumes" INTEGER NOT NULL DEFAULT 1,
    "hindiVolumes" INTEGER NOT NULL DEFAULT 1,
    "mk1English" INTEGER NOT NULL DEFAULT 0,
    "mk1Hindi" INTEGER NOT NULL DEFAULT 0,
    "mk2English" INTEGER NOT NULL DEFAULT 0,
    "mk2Hindi" INTEGER NOT NULL DEFAULT 0,
    "knEnglish" INTEGER NOT NULL DEFAULT 0,
    "knHindi" INTEGER NOT NULL DEFAULT 0,
    "mk1PaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mk1PaidMethod" TEXT,
    "mk1PaidBy" TEXT,
    "mk1PaidAt" TEXT,
    "mk2PaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mk2PaidMethod" TEXT,
    "mk2PaidBy" TEXT,
    "mk2PaidAt" TEXT,
    "knPaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "knPaidMethod" TEXT,
    "knPaidBy" TEXT,
    "knPaidAt" TEXT,
    "deadline" TEXT,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BookMoneyRecord_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "englishPrice" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "hindiPrice" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "englishVolumes" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "hindiVolumes" INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk1PaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk1PaidMethod" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk1PaidBy" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk1PaidAt" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk2PaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk2PaidMethod" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk2PaidBy" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "mk2PaidAt" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "knPaidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "knPaidMethod" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "knPaidBy" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "knPaidAt" TEXT`,
  `ALTER TABLE "BookMoneyRecord" ADD COLUMN IF NOT EXISTS "deadline" TEXT`,
  `UPDATE "BookMoneyRecord"
    SET "englishPrice" = "unitPrice"
    WHERE "englishPrice" = 0 AND "unitPrice" > 0`,
  `UPDATE "BookMoneyRecord"
    SET "hindiPrice" = "unitPrice"
    WHERE "hindiPrice" = 0 AND "unitPrice" > 0`,
  `DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PersonalMoneyEntry_createdById_fkey') THEN
      ALTER TABLE "PersonalMoneyEntry"
      ADD CONSTRAINT "PersonalMoneyEntry_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookMoneyRecord_createdById_fkey') THEN
      ALTER TABLE "BookMoneyRecord"
      ADD CONSTRAINT "BookMoneyRecord_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END
  $$`,
]

async function main() {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('PersonalMoneyEntry', 'BookMoneyRecord')
    ORDER BY table_name
  `

  console.log(`Admin records schema ready: ${tables.map((table) => table.table_name).join(', ')}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
