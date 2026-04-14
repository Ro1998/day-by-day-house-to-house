import { PrismaClient } from '@prisma/client';

const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_nZFi7esA1xbQ@ep-silent-bar-anf7lc3q-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const neonPrisma = new PrismaClient({
  datasources: {
    db: {
      url: NEON_DATABASE_URL,
    },
  },
});

async function quickTest() {
  try {
    console.log('Testing Neon connection...');
    await neonPrisma.$connect();
    console.log('✅ Neon connected successfully');
    
    const result = await neonPrisma.$queryRaw`SELECT COUNT(*) as count FROM "User"`;
    const count = Number((result as any)[0]?.count || 0);
    console.log(`📊 Users: ${count} records`);
    
    // Test a few more tables
    const tables = ['Expense', 'MonthlyPayment', 'Menu', 'Activity'];
    for (const table of tables) {
      try {
        const tableResult = await neonPrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const tableCount = Number((tableResult as any)[0]?.count || 0);
        console.log(`📊 ${table}: ${tableCount} records`);
      } catch (e) {
        console.log(`❌ ${table}: Error - ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Neon connection failed:', error);
  } finally {
    await neonPrisma.$disconnect();
  }
}

quickTest();
