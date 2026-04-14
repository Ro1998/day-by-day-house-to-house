import { PrismaClient } from '@prisma/client';

const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_nZFi7esA1xbQ@ep-silent-bar-anf7lc3q-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SUPABASE_DATABASE_URL = 'postgresql://postgres.fuhhnfdbepnxwjcgzdpg:Sovereign@20541126@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require';

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

async function migrateUsers() {
  console.log('Migrating Users...');
  try {
    const users = await neonPrisma.$queryRawUnsafe('SELECT * FROM "User"') as any[];
    let migrated = 0;
    
    for (const user of users) {
      try {
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "User" ("id", "name", "username", "email", "phone", "passwordHash", "securityAnswers", "passwordResetTokenHash", "passwordResetTokenExpiresAt", "role", "approved", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT ("id") DO NOTHING',
          user.id, user.name, user.username, user.email, user.phone,
          user.passwordHash, user.securityAnswers, user.passwordResetTokenHash,
          user.passwordResetTokenExpiresAt, user.role, user.approved, user.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate user ${user.name}: ${error}`);
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
          'INSERT INTO "Expense" ("id", "date", "type", "category", "amount", "description", "userId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("id") DO NOTHING',
          expense.id, expense.date, expense.type, expense.category,
          expense.amount, expense.description, expense.userId, expense.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate expense ${expense.id}: ${error}`);
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
          'INSERT INTO "MonthlyPayment" ("id", "month", "paid", "amount", "memberName", "paymentType", "note", "reminderSent", "expenseId", "userId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT ("id") DO NOTHING',
          payment.id, payment.month, payment.paid, payment.amount, payment.memberName,
          payment.paymentType, payment.note, payment.reminderSent, payment.expenseId,
          payment.userId, payment.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate payment ${payment.id}: ${error}`);
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
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "Menu" ("id", "week", "purchasers", "userId", "createdAt") VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("id") DO NOTHING',
          menu.id, menu.week, JSON.stringify(menu.purchasers), menu.userId, menu.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate menu ${menu.id}: ${error}`);
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
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "MenuItem" ("id", "day", "lunch", "dinner", "lunchCooks", "dinnerCooks", "menuId") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("id") DO NOTHING',
          item.id, item.day, item.lunch, item.dinner,
          JSON.stringify(item.lunchCooks), JSON.stringify(item.dinnerCooks), item.menuId
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate menu item ${item.id}: ${error}`);
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
        console.log(`Failed to migrate activity ${activity.id}: ${error}`);
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
        await supabasePrisma.$executeRawUnsafe(
          'INSERT INTO "Notification" ("id", "title", "message", "category", "createdById", "recipientUserIds", "readByUserIds", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("id") DO NOTHING',
          notification.id, notification.title, notification.message, notification.category,
          notification.createdById, JSON.stringify(notification.recipientUserIds),
          JSON.stringify(notification.readByUserIds), notification.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate notification ${notification.id}: ${error}`);
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
          'INSERT INTO "MenuSuggestion" ("id", "suggestion", "preferredDay", "preferredMeal", "status", "userId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("id") DO NOTHING',
          suggestion.id, suggestion.suggestion, suggestion.preferredDay,
          suggestion.preferredMeal, suggestion.status, suggestion.userId, suggestion.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate menu suggestion ${suggestion.id}: ${error}`);
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
          'INSERT INTO "Availability" ("id", "week", "day", "meal", "available", "note", "userId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("id") DO NOTHING',
          availability.id, availability.week, availability.day, availability.meal,
          availability.available, availability.note, availability.userId, availability.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate availability ${availability.id}: ${error}`);
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
          'INSERT INTO "SupplyReport" ("id", "title", "category", "itemName", "message", "status", "response", "createdById", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT ("id") DO NOTHING',
          report.id, report.title, report.category, report.itemName,
          report.message, report.status, report.response, report.createdById, report.createdAt
        );
        migrated++;
      } catch (error) {
        console.log(`Failed to migrate supply report ${report.id}: ${error}`);
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
  console.log('Starting complete migration with proper column mapping...');
  
  try {
    await neonPrisma.$connect();
    await supabasePrisma.$connect();
    
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
    
    console.log('='.repeat(50));
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
    
    console.log('='.repeat(50));
    console.log(`Total verified: ${totalVerified}`);
    console.log(`Success rate: ${Math.round((totalVerified / 188) * 100)}%`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await neonPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  }
}

main();
