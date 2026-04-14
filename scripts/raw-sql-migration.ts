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

async function migrateWithRawSQL() {
  console.log('🚀 Running raw SQL migration...');
  
  try {
    await neonPrisma.$connect();
    await supabasePrisma.$connect();
    
    // Get data from Neon and insert using raw SQL
    console.log('🔄 Migrating Users...');
    const users = await neonPrisma.$queryRawUnsafe('SELECT * FROM "User"');
    if (Array.isArray(users) && users.length > 0) {
      for (const user of users) {
        const sql = `INSERT INTO "User" (id, name, username, email, phone, passwordHash, securityAnswers, passwordResetTokenHash, passwordResetTokenExpiresAt, role, approved, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`;
        await supabasePrisma.$executeRawUnsafe(sql, 
          user.id, user.name, user.username, user.email, user.phone, 
          user.passwordHash, user.securityAnswers, user.passwordResetTokenHash, 
          user.passwordResetTokenExpiresAt, user.role, user.approved, user.createdAt
        );
      }
      console.log(`✅ Migrated ${users.length} Users`);
    }
    
    console.log('🔄 Migrating Expenses...');
    const expenses = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Expense"');
    if (Array.isArray(expenses) && expenses.length > 0) {
      for (const expense of expenses) {
        const sql = 'INSERT INTO "Expense" (id, date, type, category, amount, description, userId, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          expense.id, expense.date, expense.type, expense.category,
          expense.amount, expense.description, expense.userId, expense.createdAt
        );
      }
      console.log(`✅ Migrated ${expenses.length} Expenses`);
    }
    
    console.log('🔄 Migrating MonthlyPayments...');
    const monthlyPayments = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MonthlyPayment"');
    if (Array.isArray(monthlyPayments) && monthlyPayments.length > 0) {
      for (const payment of monthlyPayments) {
        const sql = 'INSERT INTO "MonthlyPayment" (id, month, paid, amount, memberName, paymentType, note, reminderSent, expenseId, userId, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          payment.id, payment.month, payment.paid, payment.amount, payment.memberName,
          payment.paymentType, payment.note, payment.reminderSent, payment.expenseId, 
          payment.userId, payment.createdAt
        );
      }
      console.log(`✅ Migrated ${monthlyPayments.length} MonthlyPayments`);
    }
    
    console.log('🔄 Migrating Menus...');
    const menus = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Menu"');
    if (Array.isArray(menus) && menus.length > 0) {
      for (const menu of menus) {
        const sql = 'INSERT INTO "Menu" (id, week, purchasers, userId, createdAt) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          menu.id, menu.week, JSON.stringify(menu.purchasers), menu.userId, menu.createdAt
        );
      }
      console.log(`✅ Migrated ${menus.length} Menus`);
    }
    
    console.log('🔄 Migrating MenuItems...');
    const menuItems = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MenuItem"');
    if (Array.isArray(menuItems) && menuItems.length > 0) {
      for (const item of menuItems) {
        const sql = 'INSERT INTO "MenuItem" (id, day, lunch, dinner, lunchCooks, dinnerCooks, menuId) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          item.id, item.day, item.lunch, item.dinner,
          JSON.stringify(item.lunchCooks), JSON.stringify(item.dinnerCooks), item.menuId
        );
      }
      console.log(`✅ Migrated ${menuItems.length} MenuItems`);
    }
    
    console.log('🔄 Migrating Activities...');
    const activities = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Activity"');
    if (Array.isArray(activities) && activities.length > 0) {
      for (const activity of activities) {
        const sql = 'INSERT INTO "Activity" (id, userId, action, timestamp) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          activity.id, activity.userId, activity.action, activity.timestamp
        );
      }
      console.log(`✅ Migrated ${activities.length} Activities`);
    }
    
    console.log('🔄 Migrating Notifications...');
    const notifications = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Notification"');
    if (Array.isArray(notifications) && notifications.length > 0) {
      for (const notification of notifications) {
        const sql = 'INSERT INTO "Notification" (id, title, message, category, createdById, recipientUserIds, readByUserIds, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          notification.id, notification.title, notification.message, notification.category,
          notification.createdById, JSON.stringify(notification.recipientUserIds),
          JSON.stringify(notification.readByUserIds), notification.createdAt
        );
      }
      console.log(`✅ Migrated ${notifications.length} Notifications`);
    }
    
    console.log('🔄 Migrating MenuSuggestions...');
    const menuSuggestions = await neonPrisma.$queryRawUnsafe('SELECT * FROM "MenuSuggestion"');
    if (Array.isArray(menuSuggestions) && menuSuggestions.length > 0) {
      for (const suggestion of menuSuggestions) {
        const sql = 'INSERT INTO "MenuSuggestion" (id, suggestion, preferredDay, preferredMeal, status, userId, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          suggestion.id, suggestion.suggestion, suggestion.preferredDay,
          suggestion.preferredMeal, suggestion.status, suggestion.userId, suggestion.createdAt
        );
      }
      console.log(`✅ Migrated ${menuSuggestions.length} MenuSuggestions`);
    }
    
    console.log('🔄 Migrating Availabilities...');
    const availabilities = await neonPrisma.$queryRawUnsafe('SELECT * FROM "Availability"');
    if (Array.isArray(availabilities) && availabilities.length > 0) {
      for (const availability of availabilities) {
        const sql = 'INSERT INTO "Availability" (id, week, day, meal, available, note, userId, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          availability.id, availability.week, availability.day, availability.meal,
          availability.available, availability.note, availability.userId, availability.createdAt
        );
      }
      console.log(`✅ Migrated ${availabilities.length} Availabilities`);
    }
    
    console.log('🔄 Migrating SupplyReports...');
    const supplyReports = await neonPrisma.$queryRawUnsafe('SELECT * FROM "SupplyReport"');
    if (Array.isArray(supplyReports) && supplyReports.length > 0) {
      for (const report of supplyReports) {
        const sql = 'INSERT INTO "SupplyReport" (id, title, category, itemName, message, status, response, createdById, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING';
        await supabasePrisma.$executeRawUnsafe(sql,
          report.id, report.title, report.category, report.itemName,
          report.message, report.status, report.response, report.createdById, report.createdAt
        );
      }
      console.log(`✅ Migrated ${supplyReports.length} SupplyReports`);
    }
    
    console.log('🎉 Raw SQL migration completed successfully!');
    
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
    console.log('🎉 Migration complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

async function main() {
  try {
    await migrateWithRawSQL();
    await finalVerification();
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  }
}

main();
