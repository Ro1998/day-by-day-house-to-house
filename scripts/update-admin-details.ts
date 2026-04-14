import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function updateAdminDetails() {
  try {
    console.log('Connecting to database...');
    
    // Update existing admin user
    console.log('Updating admin user details...');
    const newPassword = 'Jubilee21';
    const hashedPassword = hashPassword(newPassword);
    
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET 
        name = 'Ronald',
        username = 'Ronaldthapa98',
        email = 'ronald.thapa08@gmail.com',
        phone = '8851589380',
        "passwordHash" = '${hashedPassword}',
        "updatedAt" = NOW()
      WHERE role = 'admin'
    `);
    
    console.log('Admin user updated successfully!');
    console.log('Updated credentials:');
    console.log('Username: Ronaldthapa98');
    console.log('Password: Jubilee21');
    console.log('Email: ronald.thapa08@gmail.com');
    console.log('Phone: 8851589380');
    console.log('Name: Ronald');
    console.log('Rows affected:', result);
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminDetails()
  .then(() => {
    console.log('Process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Process failed:', error);
    process.exit(1);
  });
