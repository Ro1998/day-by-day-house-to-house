import { PrismaClient } from '@prisma/client';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const SUPABASE_DATABASE_URL = process.env.DATABASE_URL;

const neonPrisma = new PrismaClient({
  datasources: {
    db: {
      url: NEON_DATABASE_URL,
    },
  },
});

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: SUPABASE_DATABASE_URL,
    },
  },
});

async function fixMissingColumns() {
  console.log('🔧 Fixing missing columns in Supabase tables...');
  
  try {
    await supabasePrisma.$connect();
    
    // Add missing updatedAt columns where needed
    const alterStatements = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "MenuSuggestion" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "Availability" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "SupplyReport" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`
    ];
    
    for (const sql of alterStatements) {
      try {
        await supabasePrisma.$executeRawUnsafe(sql);
        console.log(`✅ Column added: ${sql.split('ADD COLUMN')[1]?.split(' ')[1] || 'Unknown'}`);
      } catch (error) {
        console.log(`ℹ️  Column already exists or error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
    
    console.log('✅ Missing columns fixed!');
    
  } catch (error) {
    console.error('❌ Failed to fix columns:', error);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function migrateTableIndividually<T extends Record<string, any>>(
  tableName: string,
  fetchFromNeon: () => Promise<T[]>,
  insertToSupabase: (data: T[]) => Promise<any>
): Promise<void> {
  try {
    console.log(`🔄 Migrating ${tableName}...`);
    
    // Fetch data from Neon
    const neonData = await fetchFromNeon();
    console.log(`📊 Found ${neonData.length} records in Neon ${tableName}`);
    
    if (neonData.length === 0) {
      console.log(`⚠️  No data to migrate for ${tableName}`);
      return;
    }
    
    // Insert data to Supabase one by one to avoid prepared statement issues
    let successCount = 0;
    for (let i = 0; i < neonData.length; i++) {
      try {
        await insertToSupabase([neonData[i]]);
        successCount++;
      } catch (error) {
        console.log(`❌ Failed to insert record ${i + 1}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
    
    console.log(`✅ Successfully migrated ${successCount}/${neonData.length} ${tableName} records to Supabase`);
    
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error);
  }
}

async function runTargetedMigration() {
  console.log('🚀 Running targeted migration for failed tables...');
  
  try {
    await neonPrisma.$connect();
    await supabasePrisma.$connect();
    
    // Migrate tables that failed
    await migrateTableIndividually(
      'User',
      () => neonPrisma.user.findMany(),
      (users) => supabasePrisma.user.createMany({ data: users, skipDuplicates: true })
    );
    
    await migrateTableIndividually(
      'Expense',
      () => neonPrisma.expense.findMany(),
      (expenses) => supabasePrisma.expense.createMany({ data: expenses, skipDuplicates: true })
    );
    
    await migrateTableIndividually(
      'MonthlyPayment',
      () => neonPrisma.monthlyPayment.findMany(),
      (payments) => supabasePrisma.monthlyPayment.createMany({ data: payments, skipDuplicates: true })
    );
    
    await migrateTableIndividually(
      'Menu',
      () => neonPrisma.menu.findMany(),
      (menus) => supabasePrisma.menu.createMany({ data: menus, skipDuplicates: true })
    );
    
    await migrateTableIndividually(
      'Notification',
      () => neonPrisma.notification.findMany(),
      (notifications) => supabasePrisma.notification.createMany({ data: notifications, skipDuplicates: true })
    );
    
    await migrateTableIndividually(
      'MenuSuggestion',
      () => neonPrisma.menuSuggestion.findMany(),
      (suggestions) => supabasePrisma.menuSuggestion.createMany({ data: suggestions, skipDuplicates: true })
    );
    
    await migrateTableIndividually(
      'Availability',
      () => neonPrisma.availability.findMany(),
      (availabilities) => supabasePrisma.availability.createMany({ data: availabilities, skipDuplicates: true })
    );
    
    await migrateTableIndividually(
      'SupplyReport',
      () => neonPrisma.supplyReport.findMany(),
      (reports) => supabasePrisma.supplyReport.createMany({ data: reports, skipDuplicates: true })
    );
    
  } catch (error) {
    console.error('❌ Targeted migration failed:', error);
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

async function finalVerification() {
  console.log('\n🔍 Final verification of migrated data...');
  
  try {
    await supabasePrisma.$connect();
    
    const tables = [
      'User', 'RegistrationVerification', 'Expense', 'MonthlyPayment',
      'Menu', 'MenuItem', 'Activity', 'InventoryItem',
      'Notification', 'MenuSuggestion', 'Availability', 'SupplyReport'
    ];
    
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await supabasePrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number((result as any)[0]?.count || 0);
        totalRecords += count;
        console.log(`✅ ${table.padEnd(25)}: ${count.toString().padEnd(6)} records`);
      } catch (e) {
        console.log(`❌ ${table.padEnd(25)}: Error - ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }
    
    console.log('='.repeat(50));
    console.log(`📈 Total records in Supabase: ${totalRecords}`);
    console.log('🎉 Migration verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function main() {
  try {
    await fixMissingColumns();
    await runTargetedMigration();
    await finalVerification();
  } catch (error) {
    console.error('❌ Migration fix process failed:', error);
    process.exit(1);
  }
}

main();

