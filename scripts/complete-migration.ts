import { PrismaClient } from '@prisma/client';

const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_nZFi7esA1xbQ@ep-silent-bar-anf7lc3q-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_DATABASE_URL = 'postgresql://postgres.fuhhnfdbepnxwjcgzdpg:Sovereign@20541126@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require';

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

async function getTableSchema(tableName: string) {
  try {
    const result = await supabasePrisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}' 
      ORDER BY ordinal_position
    `);
    return result;
  } catch (error) {
    console.log(`❌ Could not get schema for ${tableName}: ${error}`);
    return [];
  }
}

async function migrateTableWithSchemaCheck(tableName: string, neonData: any[]) {
  console.log(`🔄 Migrating ${tableName} (${neonData.length} records)...`);
  
  if (neonData.length === 0) {
    console.log(`⚠️  No data to migrate for ${tableName}`);
    return 0;
  }
  
  try {
    // Get actual Supabase schema
    const schema = await getTableSchema(tableName);
    
    let migratedCount = 0;
    
    for (const record of neonData) {
      try {
        // Prepare data based on actual schema
        const insertData: any = {};
        
        // Map fields based on schema
        for (const column of schema as any[]) {
          const columnName = column.column_name;
          if (record[columnName] !== undefined) {
            insertData[columnName] = record[columnName];
          } else if (record[columnName.charAt(0).toLowerCase() + columnName.slice(1)] !== undefined) {
            // Try camelCase version
            insertData[columnName] = record[columnName.charAt(0).toLowerCase() + columnName.slice(1)];
          }
        }
        
        // Use raw SQL to avoid prepared statement issues
        const columns = Object.keys(insertData).join(', ');
        const placeholders = Object.keys(insertData).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(insertData);
        
        const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        
        await supabasePrisma.$executeRawUnsafe(sql, ...values);
        migratedCount++;
        
      } catch (error) {
        console.log(`❌ Failed to migrate record ${migratedCount + 1}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
    
    console.log(`✅ Successfully migrated ${migratedCount}/${neonData.length} ${tableName} records`);
    return migratedCount;
    
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error);
    return 0;
  }
}

async function completeMigration() {
  console.log('🚀 Starting complete migration from Neon to Supabase...');
  
  try {
    await neonPrisma.$connect();
    await supabasePrisma.$connect();
    
    console.log('📊 Fetching all data from Neon...');
    
    // Get all data from Neon
    const users = await neonPrisma.$queryRawUnsafe('SELECT * FROM "User"');
    const registrationVerifications = await neonPrisma.$queryRawUnsafe('SELECT * FROM "RegistrationVerification"');
    const expenses = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Expense"');
    const monthlyPayments = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MonthlyPayment"');
    const menus = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Menu"');
    const menuItems = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MenuItem"');
    const activities = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Activity"');
    const inventoryItems = await neonPrisma.$queryRawUnsafe('SELECT * FROM "InventoryItem"');
    const notifications = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Notification"');
    const menuSuggestions = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MenuSuggestion"');
    const availabilities = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Availability"');
    const supplyReports = await neonPrisma.$queryRawUnsafe('SELECT * FROM "SupplyReport"');
    
    console.log('🧹 Clearing existing data from Supabase...');
    
    // Clear existing data
    const tables = [
      'SupplyReport', 'Availability', 'MenuSuggestion', 'Notification',
      'InventoryItem', 'Activity', 'MenuItem', 'Menu',
      'MonthlyPayment', 'Expense', 'RegistrationVerification', 'User'
    ];
    
    for (const table of tables) {
      try {
        await supabasePrisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
        console.log(`✅ Cleared ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not clear ${table}: ${error}`);
      }
    }
    
    console.log('📤 Starting data migration...');
    
    // Migrate all tables
    let totalMigrated = 0;
    
    totalMigrated += await migrateTableWithSchemaCheck('User', users);
    totalMigrated += await migrateTableWithSchemaCheck('RegistrationVerification', registrationVerifications);
    totalMigrated += await migrateTableWithSchemaCheck('Expense', expenses);
    totalMigrated += await migrateTableWithSchemaCheck('MonthlyPayment', monthlyPayments);
    totalMigrated += await migrateTableWithSchemaCheck('Menu', menus);
    totalMigrated += await migrateTableWithSchemaCheck('MenuItem', menuItems);
    totalMigrated += await migrateTableWithSchemaCheck('Activity', activities);
    totalMigrated += await migrateTableWithSchemaCheck('InventoryItem', inventoryItems);
    totalMigrated += await migrateTableWithSchemaCheck('Notification', notifications);
    totalMigrated += await migrateTableWithSchemaCheck('MenuSuggestion', menuSuggestions);
    totalMigrated += await migrateTableWithSchemaCheck('Availability', availabilities);
    totalMigrated += await migrateTableWithSchemaCheck('SupplyReport', supplyReports);
    
    console.log('='.repeat(60));
    console.log(`🎉 Migration completed! Total records migrated: ${totalMigrated}`);
    
    return totalMigrated;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

async function finalVerification() {
  console.log('\n🔍 Final verification of all migrated data...');
  
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
    
    console.log('='.repeat(60));
    console.log(`📈 Total records in Supabase: ${totalRecords}`);
    
    if (totalRecords >= 180) {
      console.log('🎉 SUCCESS: Nearly all data migrated to Supabase!');
    } else if (totalRecords >= 150) {
      console.log('✅ GOOD: Most data migrated to Supabase!');
    } else {
      console.log('⚠️  PARTIAL: Some data may not have migrated');
    }
    
    return totalRecords;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return 0;
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function main() {
  try {
    console.log('🎯 Starting complete Neon to Supabase migration...');
    console.log('This will migrate ALL data from Neon to Supabase\n');
    
    const migratedCount = await completeMigration();
    const finalCount = await finalVerification();
    
    console.log('\n🏁 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Records migrated: ${migratedCount}`);
    console.log(`📊 Records verified: ${finalCount}`);
    console.log(`📊 Success rate: ${Math.round((finalCount / 188) * 100)}%`);
    
    if (finalCount >= 180) {
      console.log('🎉 EXCELLENT: Migration nearly complete!');
    } else if (finalCount >= 150) {
      console.log('✅ GOOD: Migration mostly successful!');
    } else {
      console.log('⚠️  PARTIAL: Some issues encountered');
    }
    
  } catch (error) {
    console.error('❌ Complete migration process failed:', error);
    process.exit(1);
  }
}

main();
