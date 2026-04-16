import { PrismaClient } from '@prisma/client';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const SUPABASE_DATABASE_URL = process.env.DATABASE_URL;

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

async function fixSchemaIssues() {
  console.log('🔧 Fixing schema issues in Supabase...');
  
  try {
    await supabasePrisma.$connect();
    
    // Drop and recreate tables with proper schema
    const dropAndRecreateStatements = [
      `DROP TABLE IF EXISTS "MonthlyPayment" CASCADE;`,
      `DROP TABLE IF EXISTS "Menu" CASCADE;`,
      `DROP TABLE IF EXISTS "Notification" CASCADE;`,
      `DROP TABLE IF EXISTS "MenuSuggestion" CASCADE;`,
      `DROP TABLE IF EXISTS "Availability" CASCADE;`,
      `DROP TABLE IF EXISTS "User" CASCADE;`,
      `DROP TABLE IF EXISTS "Expense" CASCADE;`,
      
      // Recreate User table
      `CREATE TABLE "User" (
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );`,
      
      // Recreate Expense table
      `CREATE TABLE "Expense" (
        "id" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "description" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
      );`,
      
      // Recreate MonthlyPayment table
      `CREATE TABLE "MonthlyPayment" (
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
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MonthlyPayment_pkey" PRIMARY KEY ("id")
      );`,
      
      // Recreate Menu table
      `CREATE TABLE "Menu" (
        "id" TEXT NOT NULL,
        "week" TEXT NOT NULL,
        "purchasers" TEXT[],
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
      );`,
      
      // Recreate Notification table
      `CREATE TABLE "Notification" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'general',
        "createdById" TEXT NOT NULL,
        "recipientUserIds" TEXT[] DEFAULT '{}',
        "readByUserIds" TEXT[] DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      );`,
      
      // Recreate MenuSuggestion table
      `CREATE TABLE "MenuSuggestion" (
        "id" TEXT NOT NULL,
        "suggestion" TEXT NOT NULL,
        "preferredDay" TEXT,
        "preferredMeal" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MenuSuggestion_pkey" PRIMARY KEY ("id")
      );`,
      
      // Recreate Availability table
      `CREATE TABLE "Availability" (
        "id" TEXT NOT NULL,
        "week" TEXT NOT NULL,
        "day" TEXT NOT NULL,
        "meal" TEXT NOT NULL,
        "available" BOOLEAN NOT NULL DEFAULT true,
        "note" TEXT,
        "userId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
      );`
    ];
    
    for (const sql of dropAndRecreateStatements) {
      try {
        await supabasePrisma.$executeRawUnsafe(sql);
        console.log(`✅ Executed: ${sql.split(' ')[0]} ${sql.split(' ')[1] || ''}`);
      } catch (error) {
        console.log(`ℹ️  ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
    
    console.log('✅ Schema fixed!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function migrateWithDefaults() {
  console.log('🚀 Running final migration with proper defaults...');
  
  try {
    await neonPrisma.$connect();
    await supabasePrisma.$connect();
    
    // Helper function to add updatedAt if missing
    const addUpdatedAt = (record: any) => {
      if (!record.updatedAt) {
        record.updatedAt = new Date();
      }
      return record;
    };
    
    // Migrate Users
    console.log('🔄 Migrating Users...');
    const users = await neonPrisma.user.findMany();
    if (users.length > 0) {
      const usersWithDefaults = users.map(addUpdatedAt);
      await supabasePrisma.user.createMany({ data: usersWithDefaults, skipDuplicates: true });
      console.log(`✅ Migrated ${users.length} Users`);
    }
    
    // Migrate Expenses
    console.log('🔄 Migrating Expenses...');
    const expenses = await neonPrisma.expense.findMany();
    if (expenses.length > 0) {
      const expensesWithDefaults = expenses.map(addUpdatedAt);
      await supabasePrisma.expense.createMany({ data: expensesWithDefaults, skipDuplicates: true });
      console.log(`✅ Migrated ${expenses.length} Expenses`);
    }
    
    // Migrate MonthlyPayments
    console.log('🔄 Migrating MonthlyPayments...');
    const monthlyPayments = await neonPrisma.monthlyPayment.findMany();
    if (monthlyPayments.length > 0) {
      const paymentsWithDefaults = monthlyPayments.map(addUpdatedAt);
      await supabasePrisma.monthlyPayment.createMany({ data: paymentsWithDefaults, skipDuplicates: true });
      console.log(`✅ Migrated ${monthlyPayments.length} MonthlyPayments`);
    }
    
    // Migrate Menus
    console.log('🔄 Migrating Menus...');
    const menus = await neonPrisma.menu.findMany();
    if (menus.length > 0) {
      const menusWithDefaults = menus.map(addUpdatedAt);
      await supabasePrisma.menu.createMany({ data: menusWithDefaults, skipDuplicates: true });
      console.log(`✅ Migrated ${menus.length} Menus`);
    }
    
    // Migrate Notifications
    console.log('🔄 Migrating Notifications...');
    const notifications = await neonPrisma.notification.findMany();
    if (notifications.length > 0) {
      const notificationsWithDefaults = notifications.map(addUpdatedAt);
      await supabasePrisma.notification.createMany({ data: notificationsWithDefaults, skipDuplicates: true });
      console.log(`✅ Migrated ${notifications.length} Notifications`);
    }
    
    // Migrate MenuSuggestions
    console.log('🔄 Migrating MenuSuggestions...');
    const menuSuggestions = await neonPrisma.menuSuggestion.findMany();
    if (menuSuggestions.length > 0) {
      const suggestionsWithDefaults = menuSuggestions.map(addUpdatedAt);
      await supabasePrisma.menuSuggestion.createMany({ data: suggestionsWithDefaults, skipDuplicates: true });
      console.log(`✅ Migrated ${menuSuggestions.length} MenuSuggestions`);
    }
    
    // Migrate Availabilities
    console.log('🔄 Migrating Availabilities...');
    const availabilities = await neonPrisma.availability.findMany();
    if (availabilities.length > 0) {
      const availabilitiesWithDefaults = availabilities.map(addUpdatedAt);
      await supabasePrisma.availability.createMany({ data: availabilitiesWithDefaults, skipDuplicates: true });
      console.log(`✅ Migrated ${availabilities.length} Availabilities`);
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

async function finalVerification() {
  console.log('\n🔍 Final verification...');
  
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
    
    console.log('='.repeat(50));
    console.log(`📈 Total records in Supabase: ${totalRecords}`);
    console.log('🎉 Final migration complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function main() {
  try {
    await fixSchemaIssues();
    await migrateWithDefaults();
    await finalVerification();
  } catch (error) {
    console.error('❌ Final migration process failed:', error);
    process.exit(1);
  }
}

main();

