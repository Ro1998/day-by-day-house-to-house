import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const tables = [
  'User',
  'RegistrationVerification',
  'Expense',
  'MonthlyPayment',
  'Menu',
  'MenuItem',
  'Activity',
  'InventoryItem',
  'Notification',
  'MenuSuggestion',
  'Availability',
  'SupplyReport',
  'CommunityEvent',
] as const

async function main() {
  await prisma.$executeRawUnsafe(`
    DELETE FROM public."Menu"
    WHERE id IN (
      SELECT id
      FROM (
        SELECT
          id,
          row_number() OVER (PARTITION BY week ORDER BY "createdAt" DESC, id DESC) AS duplicate_rank
        FROM public."Menu"
      ) ranked
      WHERE ranked.duplicate_rank > 1
    )
  `)

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Menu_week_key'
      ) THEN
        ALTER TABLE public."Menu"
        ADD CONSTRAINT "Menu_week_key" UNIQUE (week);
      END IF;
    END
    $$;
  `)

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`)
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${table}_postgres_full_access" ON public."${table}"`)
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "${table}_service_role_full_access" ON public."${table}"`)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${table}_postgres_full_access"
      ON public."${table}"
      FOR ALL
      TO postgres
      USING (true)
      WITH CHECK (true)
    `)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${table}_service_role_full_access"
      ON public."${table}"
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    `)
  }

  const status = await prisma.$queryRawUnsafe(`
    select
      c.relname as table_name,
      c.relrowsecurity as row_security_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname in (${tables.map((table) => `'${table}'`).join(', ')})
    order by c.relname
  `)

  console.log(JSON.stringify(status, null, 2))
}

main()
  .catch((error) => {
    console.error('Failed to enable Supabase RLS:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
