import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  try {
      console.log('--- 1) INSPECT PRODUCTION USERS ---');
      const users = await prisma.$queryRaw`SELECT id, email, role, "createdAt", "updatedAt" FROM "User"`;
      console.log(users);
      
      const admin: any = (users as any[]).find(u => u.email === 'admin@sams.local');
      if (admin) {
         console.log('Exists:', admin.email);
         
         console.log('--- 5) RESETTING PASSWORD ---');
         const hash = await bcrypt.hash('Admin123!', 10);
         await prisma.$executeRaw`UPDATE "User" SET "passwordHash" = ${hash} WHERE id = ${admin.id}`;
         console.log('Password Hash Reset Successfully');
      } else {
         console.log('--- 4) CREATING ADMIN ---');
         const hash = await bcrypt.hash('Admin123!', 10);
         const id = crypto.randomUUID();
         try {
             await prisma.$executeRaw`INSERT INTO "User" (id, email, "passwordHash", role, name, "createdAt", "updatedAt") VALUES (${id}, 'admin@sams.local', ${hash}, 'SYSTEM_ADMIN', 'System Admin', NOW(), NOW())`;
             console.log('Created admin@sams.local with raw sql');
         } catch(err: any) {
             console.log('Error creating user:', err.message);
         }
      }
      
  } catch(e) {
      console.error(e);
  } finally {
      await prisma.$disconnect();
  }
}
run();
