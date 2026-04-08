import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const email = 'admin@sams-local.com';
  
  const existing = await p.user.findUnique({ where: { email } });
  if (existing) {
    await p.user.update({
      where: { email },
      data: { passwordHash: hash, role: 'SYSTEM_ADMIN' }
    });
    console.log('Updated existing admin@sams-local.com');
  } else {
    await p.user.create({
      data: {
        email,
        passwordHash: hash,
        role: 'SYSTEM_ADMIN',
        name: 'System Admin Recovery',
        active: true
      } as any
    });
    console.log('Created new admin@sams-local.com');
  }

  const bypassUser = await p.user.findFirst({ where: { email: 'dev@local' } });
  console.log('Bypass user exists in db?', !!bypassUser);
}

main().then(() => p.$disconnect());
