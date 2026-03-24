import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('sams123', 10);
  
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' }
  });

  const user = await prisma.user.upsert({
    where: { email: 'testadmin@sams.local' },
    update: { passwordHash: hash, role: 'ADMIN' },
    create: {
      email: 'testadmin@sams.local',
      name: 'Phase 11 Audit',
      passwordHash: hash,
      role: 'ADMIN'
    }
  });

  console.log('Seed successful:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
