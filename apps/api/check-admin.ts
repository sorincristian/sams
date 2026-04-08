import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    where: { OR: [ { role: 'SYSTEM_ADMIN' }, { email: { contains: 'admin' } } ] }
  });
  console.log('Admins found:', users.map(u => ({ id: u.id, email: u.email, role: u.role, hash: !!u.passwordHash })));
}

main().then(() => p.$disconnect());
