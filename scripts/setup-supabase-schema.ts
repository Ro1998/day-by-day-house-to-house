import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_DATABASE_URL = process.env.DATABASE_URL;

async function setupSupabaseSchema() {
  console.log('🔧 Setting up database schema in Supabase...');
  
  // Test connection first
  console.log('🔍 Testing Supabase connection...');
  const testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: SUPABASE_DATABASE_URL,
      },
    },
  });
  
  await testPrisma.$connect();
  console.log('✅ Supabase connection successful');
  await testPrisma.$disconnect();
  
  // Create a temporary .env file for Prisma
  const envContent = `DATABASE_URL="${SUPABASE_DATABASE_URL}"`;
  const tempEnvPath = path.join(process.cwd(), '.env.temp');
  
  fs.writeFileSync(tempEnvPath, envContent);
  console.log('📝 Created temporary .env file');
  
  // Backup original .env if it exists
  let originalEnvContent = '';
  const originalEnvPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(originalEnvPath)) {
    originalEnvContent = fs.readFileSync(originalEnvPath, 'utf8');
  }
  
  try {
    // Set DATABASE_URL for Prisma
    fs.writeFileSync(originalEnvPath, envContent);
    console.log('📝 Updated .env file with Supabase connection');
    
    // Run Prisma commands
    console.log('🔄 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: process.cwd() });
    
    console.log('📤 Pushing schema to Supabase...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: process.cwd() });
    
    console.log('✅ Schema created successfully in Supabase!');
    
  } catch (error) {
    console.error('❌ Schema setup failed:', error);
    throw error;
  } finally {
    // Restore original .env if it existed
    if (originalEnvContent) {
      fs.writeFileSync(originalEnvPath, originalEnvContent);
      console.log('📝 Restored original .env file');
    } else {
      fs.unlinkSync(originalEnvPath);
      console.log('📝 Removed temporary .env file');
    }
    
    // Clean up temp file
    if (fs.existsSync(tempEnvPath)) {
      fs.unlinkSync(tempEnvPath);
    }
  }
}

async function verifySchema() {
  console.log('\n🔍 Verifying schema creation...');
  
  const supabasePrisma = new PrismaClient({
    datasources: {
      db: {
        url: SUPABASE_DATABASE_URL,
      },
    },
  });
  
  try {
    await supabasePrisma.$connect();
    
    const tables = [
      'User', 'RegistrationVerification', 'Expense', 'MonthlyPayment',
      'Menu', 'MenuItem', 'Activity', 'InventoryItem',
      'Notification', 'MenuSuggestion', 'Availability', 'SupplyReport'
    ];
    
    let successCount = 0;
    
    for (const table of tables) {
      try {
        const result = await supabasePrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number((result as any)[0]?.count || 0);
        console.log(`✅ ${table.padEnd(25)}: ${count.toString().padEnd(6)} records`);
        successCount++;
      } catch (e) {
        console.log(`❌ ${table.padEnd(25)}: Error - ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }
    
    console.log(`\n📊 Schema verification: ${successCount}/${tables.length} tables created successfully`);
    
    if (successCount === tables.length) {
      console.log('🎉 All tables created! Ready for data migration.');
    } else {
      console.log('⚠️  Some tables failed to create. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function main() {
  try {
    await setupSupabaseSchema();
    await verifySchema();
  } catch (error) {
    console.error('❌ Schema setup process failed:', error);
    process.exit(1);
  }
}

main();

