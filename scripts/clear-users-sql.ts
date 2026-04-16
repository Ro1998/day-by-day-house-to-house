import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function clearUsersAndCreateAdmin() {
  try {
    console.log('Connecting to database...');
    
    // Use raw SQL to delete users and registration verifications
    console.log('Deleting all registration verifications...');
    await prisma.$executeRawUnsafe('DELETE FROM "RegistrationVerification"');
    
    console.log('Deleting all users...');
    await prisma.$executeRawUnsafe('DELETE FROM "User"');
    
    // Create new admin user using raw SQL
    console.log('Creating new admin user...');
    const adminPassword = 'Admin@123456';
    const hashedPassword = hashPassword(adminPassword);
    const adminId = 'admin_' + Date.now();
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" (
        id, 
        name, 
        username, 
        email, 
        role, 
        approved, 
        "passwordHash",
        "createdAt",
        "updatedAt"
      ) VALUES (
        '${adminId}',
        'Admin',
        'admin',
        'admin@daybyday.com',
        'admin',
        true,
        '${hashedPassword}',
        NOW(),
        NOW()
      )
    `);
    
    console.log('Admin user created successfully!');
    console.log('Login credentials:');
    console.log('Username: admin');
    console.log('Password: Admin@123456');
    console.log('Email: admin@daybyday.com');
    console.log('Admin ID:', adminId);
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearUsersAndCreateAdmin()
  .then(() => {
    console.log('Process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });

