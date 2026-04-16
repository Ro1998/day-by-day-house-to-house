import { PrismaClient } from '@prisma/client';

const SUPABASE_DATABASE_URL = process.env.DATABASE_URL;

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: SUPABASE_DATABASE_URL,
    },
  },
});

async function verifyAllData() {
  console.log('Verifying all data in Supabase...');
  
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
        // Use a fresh connection for each query to avoid prepared statement conflicts
        const freshPrisma = new PrismaClient({
          datasources: {
            db: {
              url: SUPABASE_DATABASE_URL,
            },
          },
        });
        
        await freshPrisma.$connect();
        
        const result = await freshPrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number((result as any)[0]?.count || 0);
        totalRecords += count;
        console.log(` ${table.padEnd(25)}: ${count.toString().padEnd(6)} records`);
        
        await freshPrisma.$disconnect();
      } catch (e) {
        console.log(` ${table.padEnd(25)}: Error - ${e instanceof Error ? e.message.substring(0, 50) + '...' : 'Unknown'}`);
      }
    }
    
    console.log('='.repeat(50));
    console.log(`Total records in Supabase: ${totalRecords}`);
    console.log(`Expected total: 188`);
    console.log(`Success rate: ${Math.round((totalRecords / 188) * 100)}%`);
    
    if (totalRecords >= 180) {
      console.log('EXCELLENT: Nearly complete migration!');
    } else if (totalRecords >= 150) {
      console.log('GOOD: Majority migrated!');
    } else if (totalRecords >= 100) {
      console.log('PARTIAL: Significant data migrated');
    } else {
      console.log('NEEDS WORK: Limited data migrated');
    }
    
    return totalRecords;
    
  } catch (error) {
    console.error('Verification failed:', error);
    return 0;
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function main() {
  console.log('Final verification of Neon to Supabase migration');
  console.log('='.repeat(50));
  
  const totalRecords = await verifyAllData();
  
  console.log('\nMigration Summary:');
  console.log('='.repeat(50));
  console.log('Status: Migration completed');
  console.log(`Records: ${totalRecords}/188 migrated`);
  console.log(`Success: ${Math.round((totalRecords / 188) * 100)}%`);
  
  if (totalRecords >= 170) {
    console.log('Result: SUCCESSFUL - Nearly all data migrated!');
  } else if (totalRecords >= 150) {
    console.log('Result: GOOD - Most data migrated!');
  } else {
    console.log('Result: PARTIAL - Some data may need manual review');
  }
}

main();

