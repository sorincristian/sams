import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- PRODUCTION AUTH VERIFICATION ---');

  let admin;
  try {
    admin = await prisma.user.findFirst({ where: { email: 'admin@sams.local' } });
    if (!admin) {
        console.log('[RESULT] admin@sams.local DOES NOT EXIST in User table');
    } else {
        console.log(`[RESULT] admin@sams.local EXISTS in User table. id=${admin.id}, role=${admin.role}, hasPassword=${!!admin.passwordHash}`);
    }
  } catch(e: any) {
     console.log('User table error:', e.message);
  }

  // Check Operator if User failed
  let op;
  try {
    if ((prisma as any).operator) {
        op = await (prisma as any).operator.findFirst({ where: { email: 'admin@sams.local' } });
        if (op) {
            console.log(`[RESULT] admin@sams.local EXISTS in Operator table. id=${op.id}`);
        }
    }
  } catch(e: any) {
  }

  console.log('--- CHECKING RENDER ENV ---');
  console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL || 'Not Set');
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not Set');

  if (!admin && !op) {
      console.log('--- ATTEMPTING TO CREATE MISSING ADMIN ---');
      const hash = await bcrypt.hash('Admin123!', 10);
      try {
          const newAdmin = await prisma.user.create({
              data: {
                  email: 'admin@sams.local',
                  passwordHash: hash,
                  role: 'SYSTEM_ADMIN',
                  name: 'System Admin'
              }
          });
          console.log('[SUCCESS] Created admin@sams.local!');
      } catch(e: any) {
          console.log('[ERROR] Failed to create admin:', e.message);
      }
  } else if (admin) {
      console.log('--- ADMIN EXISTS, RESETTING PASSWORD SAFELY ---');
      const hash = await bcrypt.hash('Admin123!', 10);
      try {
          await prisma.user.update({
              where: { id: admin.id },
              data: { passwordHash: hash } as any
          });
          console.log('[SUCCESS] Password reset for admin@sams.local!');
      } catch(e: any) {
          console.log('[ERROR] Failed to reset password:', e.message);
      }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
