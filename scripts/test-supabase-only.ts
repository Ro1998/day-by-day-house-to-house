import { PrismaClient } from '@prisma/client';

// Try different Supabase connection string formats
const connectionStrings = [
  'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:5432/postgres?sslmode=require',
  'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:5432/postgres',
  'postgres://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:5432/postgres?sslmode=require',
  'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:5432/postgres?sslmode=require&connect_timeout=10'
];

async function testSupabaseConnections() {
  console.log('🔍 Testing different Supabase connection formats...\n');
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const connectionString = connectionStrings[i];
    console.log(`\n--- Test ${i + 1} ---`);
    console.log(`Connection string: ${connectionString.split('@')[0]}@[HIDDEN]`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
    
    try {
      console.log('Attempting connection...');
      await prisma.$connect();
      console.log('✅ Connection successful!');
      
      // Test a simple query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Query successful!');
      
      await prisma.$disconnect();
      console.log('🎉 This connection string works!');
      return; // Exit on first success
      
    } catch (error) {
      console.log('❌ Connection failed:', error instanceof Error ? error.message : 'Unknown error');
      try {
        await prisma.$disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  }
  
  console.log('\n❌ All connection attempts failed.');
  console.log('\nPossible issues:');
  console.log('1. Supabase database is not active/paused');
  console.log('2. Wrong hostname or port');
  console.log('3. Incorrect password');
  console.log('4. Network connectivity issues');
  console.log('5. Database name is not "postgres"');
}

testSupabaseConnections();
