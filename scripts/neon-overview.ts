import { PrismaClient } from '@prisma/client';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

const neonPrisma = new PrismaClient({
  datasources: {
    db: {
      url: NEON_DATABASE_URL,
    },
  },
});

async function getNeonOverview() {
  try {
    await neonPrisma.$connect();
    console.log('📊 NEON DATABASE OVERVIEW');
    console.log('='.repeat(50));
    
    const tables = [
      'User', 'RegistrationVerification', 'Expense', 'MonthlyPayment', 
      'Menu', 'MenuItem', 'Activity', 'InventoryItem', 
      'Notification', 'MenuSuggestion', 'Availability', 'SupplyReport'
    ];
    
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await neonPrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number((result as any)[0]?.count || 0);
        totalRecords += count;
        console.log(`${table.padEnd(25)}: ${count.toString().padEnd(6)} records`);
      } catch (e) {
        console.log(`${table.padEnd(25)}: Error - ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }
    
    console.log('='.repeat(50));
    console.log(`📈 TOTAL RECORDS: ${totalRecords}`);
    console.log('✅ Neon database is accessible and ready for migration');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await neonPrisma.$disconnect();
  }
}

getNeonOverview();

