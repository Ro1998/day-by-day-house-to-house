import { PrismaClient } from '@prisma/client';

const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_nZFi7esA1xbQ@ep-silent-bar-anf7lc3q-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_DATABASE_URL = 'postgresql://postgres.fuhhnfdbepnxwjcgzdpg:Sovereign%4020541126@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require';

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
  console.log('Fixing schema issues...');
  
  try {
    // Add missing updatedAt columns with proper defaults
    const fixes = [
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "MonthlyPayment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "Menu" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "MenuSuggestion" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "Availability" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "SupplyReport" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'
    ];
    
    for (const fix of fixes) {
      try {
        await supabasePrisma.$executeRawUnsafe(fix);
      } catch (error) {
        console.log(`Schema fix note: ${error}`);
      }
    }
    
    console.log('Schema fixes completed');
  } catch (error) {
    console.error('Schema fix failed:', error);
  }
}

async function migrateUsers() {
  console.log('Migrating Users...');
  try {
    const users = await neonPrisma.$queryRawUnsafe('SELECT * FROM "User"') as any[];
    let migrated = 0;
    
    for (const user of users) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "app_user" ("id", "name", "username", "email", "phone", "password_hash", "security_answers", "password_reset_token_hash", "password_reset_token_expires_at", "role", "approved") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT ("id") DO NOTHING',
          user.id, user.name, user.username, user.email, user.phone,
          user.passwordHash || user.password_hash, user.securityAnswers || user.security_answers, 
          user.passwordResetTokenHash || user.password_reset_token_hash,
          user.passwordResetTokenExpiresAt || user.password_reset_token_expires_at, 
          user.role, user.approved
        );
        migrated++;
      } catch (error) {
        console.log(`Failed user ${user.name}: ${error}`);
      }
    }
    console.log(`Users: ${migrated}/${users.length}`);
    return migrated;
  } catch (error) {
    console.error('Users migration failed:', error);
    return 0;
  }
}

async function migrateExpenses() {
  console.log('Migrating Expenses...');
  try {
    const expenses = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Expense"') as any[];
    let migrated = 0;
    
    for (const expense of expenses) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "Expense" ("id", "date", "type", "category", "amount", "description", "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT ("id") DO NOTHING',
          expense.id, expense.date, expense.type, expense.category,
          expense.amount, expense.description, expense.userId, 
          expense.createdAt, expense.updatedAt || new Date()
        );
        migrated++;
      } catch (error) {
        console.log(`Failed expense ${expense.id}: ${error}`);
      }
    }
    console.log(`Expenses: ${migrated}/${expenses.length}`);
    return migrated;
  } catch (error) {
    console.error('Expenses migration failed:', error);
    return 0;
  }
}

async function migrateMonthlyPayments() {
  console.log('Migrating MonthlyPayments...');
  try {
    const payments = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MonthlyPayment"') as any[];
    let migrated = 0;
    
    for (const payment of payments) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "MonthlyPayment" ("id", "month", "paid", "amount", "memberName", "paymentType", "note", "reminderSent", "expenseId", "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT ("id") DO NOTHING',
          payment.id, payment.month, payment.paid, payment.amount, payment.memberName,
          payment.paymentType, payment.note, payment.reminderSent, payment.expenseId,
          payment.userId, payment.createdAt, payment.updatedAt || new Date()
        );
        migrated++;
      } catch (error) {
        console.log(`Failed payment ${payment.id}: ${error}`);
      }
    }
    console.log(`MonthlyPayments: ${migrated}/${payments.length}`);
    return migrated;
  } catch (error) {
    console.error('MonthlyPayments migration failed:', error);
    return 0;
  }
}

async function migrateMenus() {
  console.log('Migrating Menus...');
  try {
    const menus = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Menu"') as any[];
    let migrated = 0;
    
    for (const menu of menus) {
      try {
        // Handle array field properly
        const purchasers = menu.purchasers || [];
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "Menu" ("id", "week", "purchasers", "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3::text[], $4, $5, $6) ON CONFLICT ("id") DO NOTHING',
          menu.id, menu.week, purchasers, menu.userId, menu.createdAt, menu.updatedAt || new Date()
        );
        migrated++;
      } catch (error) {
        console.log(`Failed menu ${menu.id}: ${error}`);
      }
    }
    console.log(`Menus: ${migrated}/${menus.length}`);
    return migrated;
  } catch (error) {
    console.error('Menus migration failed:', error);
    return 0;
  }
}

async function migrateMenuItems() {
  console.log('Migrating MenuItems...');
  try {
    const items = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MenuItem"') as any[];
    let migrated = 0;
    
    for (const item of items) {
      try {
        // Handle array fields properly
        const lunchCooks = item.lunchCooks || [];
        const dinnerCooks = item.dinnerCooks || [];
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "MenuItem" ("id", "day", "lunch", "dinner", "lunchCooks", "dinnerCooks", "menuId") VALUES ($1, $2, $3, $4, $5::text[], $6::text[], $7) ON CONFLICT ("id") DO NOTHING',
          item.id, item.day, item.lunch, item.dinner, lunchCooks, dinnerCooks, item.menuId
        );
        migrated++;
      } catch (error) {
        console.log(`Failed menu item ${item.id}: ${error}`);
      }
    }
    console.log(`MenuItems: ${migrated}/${items.length}`);
    return migrated;
  } catch (error) {
    console.error('MenuItems migration failed:', error);
    return 0;
  }
}

async function migrateActivities() {
  console.log('Migrating Activities...');
  try {
    const activities = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Activity"') as any[];
    let migrated = 0;
    
    for (const activity of activities) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "Activity" ("id", "userId", "action", "timestamp") VALUES ($1, $2, $3, $4) ON CONFLICT ("id") DO NOTHING',
          activity.id, activity.userId, activity.action, activity.timestamp
        );
        migrated++;
      } catch (error) {
        console.log(`Failed activity ${activity.id}: ${error}`);
      }
    }
    console.log(`Activities: ${migrated}/${activities.length}`);
    return migrated;
  } catch (error) {
    console.error('Activities migration failed:', error);
    return 0;
  }
}

async function migrateNotifications() {
  console.log('Migrating Notifications...');
  try {
    const notifications = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Notification"') as any[];
    let migrated = 0;
    
    for (const notification of notifications) {
      try {
        // Handle array fields properly
        const recipientUserIds = notification.recipientUserIds || [];
        const readByUserIds = notification.readByUserIds || [];
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "Notification" ("id", "title", "message", "category", "createdById", "recipientUserIds", "readByUserIds", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6::text[], $7::text[], $8, $9) ON CONFLICT ("id") DO NOTHING',
          notification.id, notification.title, notification.message, notification.category,
          notification.createdById, recipientUserIds, readByUserIds, 
          notification.createdAt, notification.updatedAt || new Date()
        );
        migrated++;
      } catch (error) {
        console.log(`Failed notification ${notification.id}: ${error}`);
      }
    }
    console.log(`Notifications: ${migrated}/${notifications.length}`);
    return migrated;
  } catch (error) {
    console.error('Notifications migration failed:', error);
    return 0;
  }
}

async function migrateMenuSuggestions() {
  console.log('Migrating MenuSuggestions...');
  try {
    const suggestions = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MenuSuggestion"') as any[];
    let migrated = 0;
    
    for (const suggestion of suggestions) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "MenuSuggestion" ("id", "suggestion", "preferredDay", "preferredMeal", "status", "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("id") DO NOTHING',
          suggestion.id, suggestion.suggestion, suggestion.preferredDay,
          suggestion.preferredMeal, suggestion.status, suggestion.userId, 
          suggestion.createdAt, suggestion.updatedAt || new Date()
        );
        migrated++;
      } catch (error) {
        console.log(`Failed menu suggestion ${suggestion.id}: ${error}`);
      }
    }
    console.log(`MenuSuggestions: ${migrated}/${suggestions.length}`);
    return migrated;
  } catch (error) {
    console.error('MenuSuggestions migration failed:', error);
    return 0;
  }
}

async function migrateAvailabilities() {
  console.log('Migrating Availabilities...');
  try {
    const availabilities = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Availability"') as any[];
    let migrated = 0;
    
    for (const availability of availabilities) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "Availability" ("id", "week", "day", "meal", "available", "note", "userId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT ("id") DO NOTHING',
          availability.id, availability.week, availability.day, availability.meal,
          availability.available, availability.note, availability.userId, 
          availability.createdAt, availability.updatedAt || new Date()
        );
        migrated++;
      } catch (error) {
        console.log(`Failed availability ${availability.id}: ${error}`);
      }
    }
    console.log(`Availabilities: ${migrated}/${availabilities.length}`);
    return migrated;
  } catch (error) {
    console.error('Availabilities migration failed:', error);
    return 0;
  }
}

async function migrateSupplyReports() {
  console.log('Migrating SupplyReports...');
  try {
    const reports = await neonPrisma.$queryRawUnsafe('SELECT * FROM "SupplyReport"') as any[];
    let migrated = 0;
    
    for (const report of reports) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "SupplyReport" ("id", "title", "category", "itemName", "message", "status", "response", "createdById", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT ("id") DO NOTHING',
          report.id, report.title, report.category, report.itemName,
          report.message, report.status, report.response, report.createdById, 
          report.createdAt, report.updatedAt || new Date()
        );
        migrated++;
      } catch (error) {
        console.log(`Failed supply report ${report.id}: ${error}`);
      }
    }
    console.log(`SupplyReports: ${migrated}/${reports.length}`);
    return migrated;
  } catch (error) {
    console.error('SupplyReports migration failed:', error);
    return 0;
  }
}

async function main() {
  console.log('Starting FINAL complete migration with all fixes...');
  
  try {
    await neonPrisma.$connect();
    await supabasePrisma.$connect();
    
    // Fix schema issues first
    await fixSchemaIssues();
    
    // Clear existing data
    console.log('Clearing existing data...');
    const tables = ['SupplyReport', 'Availability', 'MenuSuggestion', 'Notification', 'Activity', 'MenuItem', 'Menu', 'MonthlyPayment', 'Expense', 'User'];
    for (const table of tables) {
      try {
        await supabasePrisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
      } catch (error) {
        console.log(`Could not clear ${table}`);
      }
    }
    
    // Migrate all tables
    let totalMigrated = 0;
    totalMigrated += await migrateUsers();
    totalMigrated += await migrateExpenses();
    totalMigrated += await migrateMonthlyPayments();
    totalMigrated += await migrateMenus();
    totalMigrated += await migrateMenuItems();
    totalMigrated += await migrateActivities();
    totalMigrated += await migrateNotifications();
    totalMigrated += await migrateMenuSuggestions();
    totalMigrated += await migrateAvailabilities();
    totalMigrated += await migrateSupplyReports();
    
    console.log('='.repeat(60));
    console.log(`Total records migrated: ${totalMigrated}`);
    
    // Final verification
    const tablesWithCounts = [
      'User', 'RegistrationVerification', 'Expense', 'MonthlyPayment',
      'Menu', 'MenuItem', 'Activity', 'InventoryItem',
      'Notification', 'MenuSuggestion', 'Availability', 'SupplyReport'
    ];
    
    let totalVerified = 0;
    console.log('\nFinal verification:');
    for (const table of tablesWithCounts) {
      try {
        const result = await supabasePrisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = Number((result as any)[0]?.count || 0);
        totalVerified += count;
        console.log(`${table}: ${count} records`);
      } catch (error) {
        console.log(`${table}: Error`);
      }
    }
    
    console.log('='.repeat(60));
    console.log(`Total verified: ${totalVerified}`);
    console.log(`Success rate: ${Math.round((totalVerified / 188) * 100)}%`);
    
    if (totalVerified >= 180) {
      console.log('EXCELLENT: Nearly complete migration!');
    } else if (totalVerified >= 150) {
      console.log('GOOD: Majority migrated!');
    } else {
      console.log('PARTIAL: Some issues remain');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

main();
