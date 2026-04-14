import { PrismaClient } from '@prisma/client';

// Try Session Pooler connection (as mentioned in dashboard)
const SESSION_POOLER_URL = 'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:6543/postgres';

// Also try common Supabase session pooler patterns
const alternativeUrls = [
  'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:6543/postgres',
  'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:5432/postgres?pgbouncer=true',
  'postgresql://postgres:Sovereign@20541126@db.fuhhnfdbepnxwjcgzdpg.supabase.co:6543/postgres?pgbouncer=true'
];

async function testSessionPooler() {
  console.log('🔍 Testing Session Pooler connections...');
  console.log('Note: Session Pooler usually uses port 6543 instead of 5432');
  console.log('');
  
  for (let i = 0; i < alternativeUrls.length; i++) {
    const url = alternativeUrls[i];
    console.log(`--- Test ${i + 1} ---`);
    console.log(`URL: ${url.split('@')[0]}@[HIDDEN]`);
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: url,
        },
      },
    });
    
    try {
      console.log('Attempting connection...');
      await prisma.$connect();
      console.log('✅ Connection successful!');
      
      const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;
      console.log('✅ Query successful!');
      console.log('Result:', result);
      
      await prisma.$disconnect();
      console.log('🎉 This connection works!');
      return;
      
    } catch (error) {
      console.log('❌ Connection failed:', error instanceof Error ? error.message : 'Unknown error');
      try {
        await prisma.$disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    console.log('');
  }
  
  console.log('❌ All Session Pooler attempts failed.');
  console.log('\n🔧 Please check your Supabase dashboard again:');
  console.log('1. Is the project active (not paused)?');
  console.log('2. Look for "Connection pooling" settings');
  console.log('3. Check if there are different hostnames for Direct vs Pooler');
  console.log('4. Verify the project URL is correct');
}

testSessionPooler();
