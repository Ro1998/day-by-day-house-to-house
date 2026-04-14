import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import path from 'path';

const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_nZFi7esA1xbQ@ep-silent-bar-anf7lc3q-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: NEON_DATABASE_URL,
    },
  },
});

async function exportUsers() {
  console.log('🚀 Fetching users and roles from Neon database...');
  try {
    await prisma.$connect();
    
    // Using queryRaw to ensure we get all fields regardless of local schema state
    const users = await prisma.$queryRawUnsafe('SELECT * FROM "User"') as any[];
    
    const exportData = users.map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role, // Exporting user roles
      approved: user.approved,
      phone: user.phone,
      createdAt: user.createdAt
    }));

    const outputPath = path.join(process.cwd(), 'users_export.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Successfully exported ${users.length} users to: ${outputPath}`);
    console.log('\nPreview of exported data:');
    console.table(exportData, ['name', 'role', 'email', 'approved']);
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportUsers();