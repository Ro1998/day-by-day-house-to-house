import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function clearUsersAndCreateAdmin() {
  try {
    console.log('Connecting to database...');
    
    // Delete all registration verifications first (due to foreign key constraints)
    console.log('Deleting all registration verifications...');
    await prisma.registrationVerification.deleteMany();
    
    // Delete all users (this will cascade delete related data due to foreign key constraints)
    console.log('Deleting all users...');
    await prisma.user.deleteMany();
    
    // Create new admin user
    console.log('Creating new admin user...');
    const adminPassword = 'Admin@123456';
    const hashedPassword = hashPassword(adminPassword);
    
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        username: 'admin',
        email: 'admin@daybyday.com',
        role: 'admin',
        approved: true,
        passwordHash: hashedPassword,
      }
    });
    
    console.log('Admin user created successfully!');
    console.log('Login credentials:');
    console.log('Username: admin');
    console.log('Password: Admin@123456');
    console.log('Email: admin@daybyday.com');
    console.log('Admin ID:', admin.id);
    
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

