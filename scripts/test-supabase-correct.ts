import { PrismaClient } from '@prisma/client';

// Use the exact format from Supabase dashboard
const SUPABASE_DATABASE_URL = 'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:5432/postgres';

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: SUPABASE_DATABASE_URL,
    },
  },
});

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection with exact dashboard details...');
  console.log(`Host: db.fuhhnfdbepnxwjcgzdpg.supabase.co`);
  console.log(`Port: 5432`);
  console.log(`Database: postgres`);
  console.log(`User: postgres`);
  console.log(`Password: Sovereign@20541126`);
  console.log('');
  
  try {
    console.log('Attempting to connect...');
    await supabasePrisma.$connect();
    console.log('✅ Connection successful!');
    
    // Test a simple query
    console.log('Testing basic query...');
    const result = await supabasePrisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;
    console.log('✅ Query successful!');
    console.log('Result:', result);
    
    // Check if tables exist
    console.log('\nChecking if tables exist...');
    const tables = ['User', 'Expense', 'MonthlyPayment', 'Menu', 'Activity'];
    
    for (const table of tables) {
      try {
        const countResult = await supabasePrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number((countResult as any)[0]?.count || 0);
        console.log(`📊 ${table}: ${count} records`);
      } catch (e) {
        console.log(`❌ ${table}: Table doesn't exist or error - ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }
    
    console.log('\n🎉 Supabase is ready for migration!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.message.includes('Can\'t reach database server')) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check if Supabase project is active (not paused)');
      console.log('2. Verify the database is running');
      console.log('3. Check network connectivity');
      console.log('4. Try connecting with psql directly:');
      console.log('   psql -h db.fuhhnfdbepnxwjcgzdpg.supabase.co -p 5432 -d postgres -U postgres');
    }
    
  } finally {
    await supabasePrisma.$disconnect();
  }
}

testSupabaseConnection();
