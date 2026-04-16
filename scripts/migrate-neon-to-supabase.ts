import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Connection strings
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const SUPABASE_DATABASE_URL = process.env.DATABASE_URL;

// Create Prisma clients for both databases
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

interface MigrationStats {
  table: string;
  neonCount: number;
  supabaseCount: number;
  success: boolean;
  error?: string;
}

async function migrateTable<T extends Record<string, any>>(
  tableName: string,
  fetchFromNeon: () => Promise<T[]>,
  insertToSupabase: (data: T[]) => Promise<any>
): Promise<MigrationStats> {
  try {
    console.log(`🔄 Migrating ${tableName}...`);
    
    // Fetch data from Neon
    const neonData = await fetchFromNeon();
    console.log(`📊 Found ${neonData.length} records in Neon ${tableName}`);
    
    if (neonData.length === 0) {
      return {
        table: tableName,
        neonCount: 0,
        supabaseCount: 0,
        success: true,
      };
    }
    
    // Insert data to Supabase
    await insertToSupabase(neonData);
    
    // Verify insertion
    const supabaseCount = await getSupabaseCount(tableName);
    
    console.log(`✅ Successfully migrated ${neonData.length} ${tableName} to Supabase`);
    
    return {
      table: tableName,
      neonCount: neonData.length,
      supabaseCount,
      success: true,
    };
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error);
    return {
      table: tableName,
      neonCount: 0,
      supabaseCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getSupabaseCount(tableName: string): Promise<number> {
  try {
    const result = await supabasePrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
    return Number((result as any)[0]?.count || 0);
  } catch (error) {
    console.error(`Error getting count for ${tableName}:`, error);
    return 0;
  }
}

async function clearSupabaseTable(tableName: string): Promise<void> {
  try {
    await supabasePrisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
    console.log(`🧹 Cleared Supabase table: ${tableName}`);
  } catch (error) {
    console.error(`Error clearing table ${tableName}:`, error);
  }
}

async function main() {
  console.log('🚀 Starting Neon to Supabase migration...');
  
  const stats: MigrationStats[] = [];
  
  try {
    // Test connections
    console.log('🔍 Testing database connections...');
    await neonPrisma.$connect();
    console.log('✅ Connected to Neon database');
    
    await supabasePrisma.$connect();
    console.log('✅ Connected to Supabase database');
    
    // Clear existing data in Supabase (in reverse order of dependencies)
    console.log('🧹 Clearing existing data from Supabase...');
    await clearSupabaseTable('SupplyReport');
    await clearSupabaseTable('Availability');
    await clearSupabaseTable('MenuSuggestion');
    await clearSupabaseTable('Notification');
    await clearSupabaseTable('InventoryItem');
    await clearSupabaseTable('Activity');
    await clearSupabaseTable('MenuItem');
    await clearSupabaseTable('Menu');
    await clearSupabaseTable('MonthlyPayment');
    await clearSupabaseTable('Expense');
    await clearSupabaseTable('RegistrationVerification');
    await clearSupabaseTable('User');
    
    // Migrate data in correct order ( respecting dependencies)
    console.log('📦 Starting data migration...');
    
    // 1. Users (independent)
    const userResult = await migrateTable(
      'User',
      () => neonPrisma.user.findMany(),
      (users) => supabasePrisma.user.createMany({ data: users, skipDuplicates: true })
    );
    stats.push(userResult);
    
    // 2. RegistrationVerification (independent)
    const regResult = await migrateTable(
      'RegistrationVerification',
      () => neonPrisma.registrationVerification.findMany(),
      (regs) => supabasePrisma.registrationVerification.createMany({ data: regs, skipDuplicates: true })
    );
    stats.push(regResult);
    
    // 3. Expenses (depends on User)
    const expenseResult = await migrateTable(
      'Expense',
      () => neonPrisma.expense.findMany(),
      (expenses) => supabasePrisma.expense.createMany({ data: expenses, skipDuplicates: true })
    );
    stats.push(expenseResult);
    
    // 4. MonthlyPayments (depends on User)
    const paymentResult = await migrateTable(
      'MonthlyPayment',
      () => neonPrisma.monthlyPayment.findMany(),
      (payments) => supabasePrisma.monthlyPayment.createMany({ data: payments, skipDuplicates: true })
    );
    stats.push(paymentResult);
    
    // 5. Menus (depends on User)
    const menusResult = await migrateTable(
      'Menu',
      () => neonPrisma.menu.findMany(),
      (menus) => supabasePrisma.menu.createMany({ data: menus, skipDuplicates: true })
    );
    stats.push(menusResult);
    
    // 6. MenuItems (depends on Menu)
    const menuItemsResult = await migrateTable(
      'MenuItem',
      () => neonPrisma.menuItem.findMany(),
      (items) => supabasePrisma.menuItem.createMany({ data: items, skipDuplicates: true })
    );
    stats.push(menuItemsResult);
    
    // 7. Activities (depends on User)
    const activityResult = await migrateTable(
      'Activity',
      () => neonPrisma.activity.findMany(),
      (activities) => supabasePrisma.activity.createMany({ data: activities, skipDuplicates: true })
    );
    stats.push(activityResult);
    
    // 8. InventoryItems (depends on User)
    const inventoryResult = await migrateTable(
      'InventoryItem',
      () => neonPrisma.inventoryItem.findMany(),
      (items) => supabasePrisma.inventoryItem.createMany({ data: items, skipDuplicates: true })
    );
    stats.push(inventoryResult);
    
    // 9. Notifications (depends on User)
    const notificationResult = await migrateTable(
      'Notification',
      () => neonPrisma.notification.findMany(),
      (notifications) => supabasePrisma.notification.createMany({ data: notifications, skipDuplicates: true })
    );
    stats.push(notificationResult);
    
    // 10. MenuSuggestions (depends on User)
    const menuSuggestionResult = await migrateTable(
      'MenuSuggestion',
      () => neonPrisma.menuSuggestion.findMany(),
      (suggestions) => supabasePrisma.menuSuggestion.createMany({ data: suggestions, skipDuplicates: true })
    );
    stats.push(menuSuggestionResult);
    
    // 11. Availabilities (depends on User)
    const availabilityResult = await migrateTable(
      'Availability',
      () => neonPrisma.availability.findMany(),
      (availabilities) => supabasePrisma.availability.createMany({ data: availabilities, skipDuplicates: true })
    );
    stats.push(availabilityResult);
    
    // 12. SupplyReports (depends on User)
    const supplyReportResult = await migrateTable(
      'SupplyReport',
      () => neonPrisma.supplyReport.findMany(),
      (reports) => supabasePrisma.supplyReport.createMany({ data: reports, skipDuplicates: true })
    );
    stats.push(supplyReportResult);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
  
  // Print summary
  console.log('\n📋 Migration Summary:');
  console.log('='.repeat(80));
  stats.forEach(stat => {
    const status = stat.success ? '✅' : '❌';
    console.log(`${status} ${stat.table.padEnd(20)} | Neon: ${stat.neonCount.toString().padEnd(6)} | Supabase: ${stat.supabaseCount.toString().padEnd(8)} | ${stat.success ? 'Success' : 'Failed'}`);
    if (stat.error) {
      console.log(`   Error: ${stat.error}`);
    }
  });
  
  const totalNeon = stats.reduce((sum, stat) => sum + stat.neonCount, 0);
  const totalSupabase = stats.reduce((sum, stat) => sum + stat.supabaseCount, 0);
  const successCount = stats.filter(stat => stat.success).length;
  
  console.log('='.repeat(80));
  console.log(`📊 Total Records: Neon: ${totalNeon} | Supabase: ${totalSupabase}`);
  console.log(`🎯 Success Rate: ${successCount}/${stats.length} tables migrated successfully`);
  
  if (successCount === stats.length) {
    console.log('🎉 Migration completed successfully!');
  } else {
    console.log('⚠️  Migration completed with some errors. Please check the summary above.');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the migration
main().catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});

