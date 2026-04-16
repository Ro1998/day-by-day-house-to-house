import { PrismaClient } from '@prisma/client';

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

async function testConnection(name: string, prisma: PrismaClient): Promise<boolean> {
  try {
    console.log(`🔍 Testing connection to ${name}...`);
    await prisma.$connect();
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log(`✅ ${name} connection successful`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} connection failed:`, error);
    return false;
  }
}

async function getTableCounts(name: string, prisma: PrismaClient): Promise<void> {
  try {
    console.log(`\n📊 Getting table counts for ${name}...`);
    
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
      'SupplyReport'
    ];
    
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number((result as any)[0]?.count || 0);
        totalRecords += count;
        console.log(`  ${table.padEnd(25)}: ${count} records`);
      } catch (error) {
        console.log(`  ${table.padEnd(25)}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`\n📈 Total records in ${name}: ${totalRecords}`);
  } catch (error) {
    console.error(`❌ Error getting table counts for ${name}:`, error);
  }
}

async function main() {
  console.log('🚀 Testing database connections for Neon to Supabase migration...\n');
  
  const neonConnected = await testConnection('Neon', neonPrisma);
  const supabaseConnected = await testConnection('Supabase', supabasePrisma);
  
  if (!neonConnected || !supabaseConnected) {
    console.log('\n❌ One or both database connections failed. Please check your connection strings and try again.');
    process.exit(1);
  }
  
  console.log('\n✅ Both databases connected successfully!');
  
  // Get table counts for both databases
  await getTableCounts('Neon', neonPrisma);
  await getTableCounts('Supabase', supabasePrisma);
  
  console.log('\n🎯 Connection testing complete!');
  console.log('You can now run the migration with: npm run migrate:neon-to-supabase');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the connection tests
main().catch((error) => {
  console.error('Connection test failed:', error);
  process.exit(1);
}).finally(() => {
  neonPrisma.$disconnect();
  supabasePrisma.$disconnect();
});

