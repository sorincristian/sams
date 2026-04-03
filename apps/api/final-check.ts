import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
  const admin = await prisma.user.findFirst({ where: { email: 'admin@sams.local' }});
  if (!admin) {
    console.log("NO ADMIN FOUND");
    return;
  }
  const match = await bcrypt.compare('Admin123!', admin.passwordHash);
  console.log({
    email: admin.email,
    role: admin.role,
    active: true, // we set this logically, schema might not enforce
    hashMatches: match,
    createdAt: admin.createdAt,
    lastLogin: null // Or whatever schema has
  });
}

check().catch(console.error).finally(()=>prisma.$disconnect());
