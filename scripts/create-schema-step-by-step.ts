import { PrismaClient } from '@prisma/client';

const SUPABASE_DATABASE_URL = 'postgresql://postgres.fuhhnfdbepnxwjcgzdpg:Sovereign@20541126@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require';

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: SUPABASE_DATABASE_URL,
    },
  },
});

// Individual SQL statements
const sqlStatements = [
  // User table
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "securityAnswers" TEXT,
    "passwordResetTokenHash" TEXT,
    "passwordResetTokenExpiresAt" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'user',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "User_name_key" ON "User"("name");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`,

  // RegistrationVerification table
  `CREATE TABLE IF NOT EXISTS "RegistrationVerification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "securityAnswers" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "otpExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistrationVerification_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationVerification_username_key" ON "RegistrationVerification"("username");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationVerification_email_key" ON "RegistrationVerification"("email");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RegistrationVerification_phone_key" ON "RegistrationVerification"("phone");`,

  // Expense table
  `CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
  );`,

  // MonthlyPayment table
  `CREATE TABLE IF NOT EXISTS "MonthlyPayment" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "amount" DOUBLE PRECISION NOT NULL,
    "memberName" TEXT,
    "paymentType" TEXT DEFAULT 'custom',
    "note" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "expenseId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MonthlyPayment_pkey" PRIMARY KEY ("id")
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyPayment_expenseId_key" ON "MonthlyPayment"("expenseId");`,

  // Menu table
  `CREATE TABLE IF NOT EXISTS "Menu" (
    "id" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "purchasers" TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
  );`,

  // MenuItem table
  `CREATE TABLE IF NOT EXISTS "MenuItem" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "lunch" TEXT NOT NULL,
    "dinner" TEXT NOT NULL,
    "lunchCooks" TEXT[],
    "dinnerCooks" TEXT[],
    "menuId" TEXT NOT NULL,
    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
  );`,

  // Activity table
  `CREATE TABLE IF NOT EXISTS "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
  );`,

  // InventoryItem table
  `CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPurchasedAt" TEXT,
    "lastPrice" DOUBLE PRECISION,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
  );`,

  // Notification table
  `CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdById" TEXT NOT NULL,
    "recipientUserIds" TEXT[] DEFAULT '{}',
    "readByUserIds" TEXT[] DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
  );`,

  // MenuSuggestion table
  `CREATE TABLE IF NOT EXISTS "MenuSuggestion" (
    "id" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "preferredDay" TEXT,
    "preferredMeal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MenuSuggestion_pkey" PRIMARY KEY ("id")
  );`,

  // Availability table
  `CREATE TABLE IF NOT EXISTS "Availability" (
    "id" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
  );`,

  // SupplyReport table
  `CREATE TABLE IF NOT EXISTS "SupplyReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemName" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'missing',
    "response" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplyReport_pkey" PRIMARY KEY ("id")
  );`,

  // Foreign key constraints
  `ALTER TABLE "Expense" ADD CONSTRAINT IF NOT EXISTS "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "MonthlyPayment" ADD CONSTRAINT IF NOT EXISTS "MonthlyPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "Menu" ADD CONSTRAINT IF NOT EXISTS "Menu_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "MenuItem" ADD CONSTRAINT IF NOT EXISTS "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "Activity" ADD CONSTRAINT IF NOT EXISTS "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "InventoryItem" ADD CONSTRAINT IF NOT EXISTS "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "Notification" ADD CONSTRAINT IF NOT EXISTS "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "MenuSuggestion" ADD CONSTRAINT IF NOT EXISTS "MenuSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "Availability" ADD CONSTRAINT IF NOT EXISTS "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`,
  `ALTER TABLE "SupplyReport" ADD CONSTRAINT IF NOT EXISTS "SupplyReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`
];

async function createSchema() {
  console.log('🔧 Creating database schema in Supabase step by step...');
  
  try {
    await supabasePrisma.$connect();
    console.log('✅ Connected to Supabase');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      try {
        await supabasePrisma.$executeRawUnsafe(sql);
        successCount++;
        console.log(`✅ Statement ${i + 1}/${sqlStatements.length}: Success`);
      } catch (error) {
        errorCount++;
        console.log(`❌ Statement ${i + 1}/${sqlStatements.length}: Failed - ${error instanceof Error ? error.message : 'Unknown'}`);
        console.log(`   SQL: ${sql.substring(0, 100)}...`);
      }
    }
    
    console.log(`\n📊 Schema creation summary: ${successCount}/${sqlStatements.length} statements executed successfully`);
    
    if (errorCount === 0) {
      console.log('🎉 All schema statements executed successfully!');
    } else {
      console.log(`⚠️  ${errorCount} statements failed. Check errors above.`);
    }
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    throw error;
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function verifySchema() {
  console.log('\n🔍 Verifying schema creation...');
  
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
      return true;
    } else {
      console.log('⚠️  Some tables failed to create. Please check errors above.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function main() {
  try {
    await createSchema();
    const schemaReady = await verifySchema();
    
    if (schemaReady) {
      console.log('\n🚀 Schema is ready! You can now run the migration with:');
      console.log('   node_modules\\.bin\\tsx.cmd scripts/migrate-neon-to-supabase.ts');
    }
    
  } catch (error) {
    console.error('❌ Schema setup process failed:', error);
    process.exit(1);
  }
}

main();
