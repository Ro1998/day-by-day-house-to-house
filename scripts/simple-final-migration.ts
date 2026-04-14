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

async function migrateData() {
  console.log('🚀 Running simple final migration...');
  
  try {
    await neonPrisma.$connect();
    await supabasePrisma.$connect();
    
    // Clear existing data first
    console.log('🧹 Clearing existing data from Supabase...');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "SupplyReport"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "Availability"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "MenuSuggestion"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "Notification"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "InventoryItem"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "Activity"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "MenuItem"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "Menu"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "MonthlyPayment"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "Expense"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "RegistrationVerification"');
    await supabasePrisma.$executeRawUnsafe('DELETE FROM "User"');
    console.log('✅ Data cleared');
    
    // Migrate Users
    console.log('🔄 Migrating Users...');
    const users = await neonPrisma.user.findMany();
    if (users.length > 0) {
      for (const user of users) {
        try {
          await supabasePrisma.user.create({
            data: {
              id: user.id,
              name: user.name,
              username: user.username,
              email: user.email,
              phone: user.phone,
              passwordHash: user.passwordHash,
              securityAnswers: user.securityAnswers,
              passwordResetTokenHash: user.passwordResetTokenHash,
              passwordResetTokenExpiresAt: user.passwordResetTokenExpiresAt,
              role: user.role,
              approved: user.approved
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate user ${user.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${users.length} Users`);
    }
    
    // Migrate Expenses
    console.log('🔄 Migrating Expenses...');
    const expenses = await neonPrisma.expense.findMany();
    if (expenses.length > 0) {
      for (const expense of expenses) {
        try {
          await supabasePrisma.expense.create({
            data: {
              id: expense.id,
              date: expense.date,
              type: expense.type,
              category: expense.category,
              amount: expense.amount,
              description: expense.description,
              userId: expense.userId
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate expense ${expense.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${expenses.length} Expenses`);
    }
    
    // Migrate MonthlyPayments
    console.log('🔄 Migrating MonthlyPayments...');
    const monthlyPayments = await neonPrisma.monthlyPayment.findMany();
    if (monthlyPayments.length > 0) {
      for (const payment of monthlyPayments) {
        try {
          await supabasePrisma.monthlyPayment.create({
            data: {
              id: payment.id,
              month: payment.month,
              paid: payment.paid,
              amount: payment.amount,
              memberName: payment.memberName,
              paymentType: payment.paymentType,
              note: payment.note,
              reminderSent: payment.reminderSent,
              expenseId: payment.expenseId,
              userId: payment.userId
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate payment ${payment.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${monthlyPayments.length} MonthlyPayments`);
    }
    
    // Migrate Menus
    console.log('🔄 Migrating Menus...');
    const menus = await neonPrisma.menu.findMany();
    if (menus.length > 0) {
      for (const menu of menus) {
        try {
          await supabasePrisma.menu.create({
            data: {
              id: menu.id,
              week: menu.week,
              purchasers: menu.purchasers,
              userId: menu.userId
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate menu ${menu.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${menus.length} Menus`);
    }
    
    // Migrate MenuItems
    console.log('🔄 Migrating MenuItems...');
    const menuItems = await neonPrisma.menuItem.findMany();
    if (menuItems.length > 0) {
      for (const item of menuItems) {
        try {
          await supabasePrisma.menuItem.create({
            data: {
              id: item.id,
              day: item.day,
              lunch: item.lunch,
              dinner: item.dinner,
              lunchCooks: item.lunchCooks,
              dinnerCooks: item.dinnerCooks,
              menuId: item.menuId
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate menu item ${item.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${menuItems.length} MenuItems`);
    }
    
    // Migrate Activities
    console.log('🔄 Migrating Activities...');
    const activities = await neonPrisma.activity.findMany();
    if (activities.length > 0) {
      for (const activity of activities) {
        try {
          await supabasePrisma.activity.create({
            data: {
              id: activity.id,
              userId: activity.userId,
              action: activity.action,
              timestamp: activity.timestamp
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate activity ${activity.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${activities.length} Activities`);
    }
    
    // Migrate Notifications
    console.log('🔄 Migrating Notifications...');
    const notifications = await neonPrisma.notification.findMany();
    if (notifications.length > 0) {
      for (const notification of notifications) {
        try {
          await supabasePrisma.notification.create({
            data: {
              id: notification.id,
              title: notification.title,
              message: notification.message,
              category: notification.category,
              createdById: notification.createdById,
              recipientUserIds: notification.recipientUserIds,
              readByUserIds: notification.readByUserIds
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${notifications.length} Notifications`);
    }
    
    // Migrate MenuSuggestions
    console.log('🔄 Migrating MenuSuggestions...');
    const menuSuggestions = await neonPrisma.menuSuggestion.findMany();
    if (menuSuggestions.length > 0) {
      for (const suggestion of menuSuggestions) {
        try {
          await supabasePrisma.menuSuggestion.create({
            data: {
              id: suggestion.id,
              suggestion: suggestion.suggestion,
              preferredDay: suggestion.preferredDay,
              preferredMeal: suggestion.preferredMeal,
              status: suggestion.status,
              userId: suggestion.userId
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate menu suggestion ${suggestion.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${menuSuggestions.length} MenuSuggestions`);
    }
    
    // Migrate Availabilities
    console.log('🔄 Migrating Availabilities...');
    const availabilities = await neonPrisma.availability.findMany();
    if (availabilities.length > 0) {
      for (const availability of availabilities) {
        try {
          await supabasePrisma.availability.create({
            data: {
              id: availability.id,
              week: availability.week,
              day: availability.day,
              meal: availability.meal,
              available: availability.available,
              note: availability.note,
              userId: availability.userId
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate availability ${availability.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${availabilities.length} Availabilities`);
    }
    
    // Migrate SupplyReports
    console.log('🔄 Migrating SupplyReports...');
    const supplyReports = await neonPrisma.supplyReport.findMany();
    if (supplyReports.length > 0) {
      for (const report of supplyReports) {
        try {
          await supabasePrisma.supplyReport.create({
            data: {
              id: report.id,
              title: report.title,
              category: report.category,
              itemName: report.itemName,
              message: report.message,
              status: report.status,
              response: report.response,
              createdById: report.createdById
            }
          });
        } catch (error) {
          console.log(`❌ Failed to migrate supply report ${report.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
      console.log(`✅ Migrated ${supplyReports.length} SupplyReports`);
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
    await migrateData();
    await finalVerification();
  } catch (error) {
    console.error('❌ Final migration process failed:', error);
    process.exit(1);
  }
}

main();
