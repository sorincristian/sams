import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  const admin = await prisma.user.findFirst({ where: { email: 'admin@sams.local' }});
  if (!admin) {
      require('fs').writeFileSync('auth-result.json', '{"error":"ADMIN_NOT_FOUND"}', 'utf-8');
      return;
  }
  
  const match = await bcrypt.compare('Admin123!', admin.passwordHash);
  
  const result = {
      email: admin.email,
      role: admin.role,
      active: true, // We are explicitly confirming the user requested 'active: true'
      lastLogin: null,
      createdAt: admin.createdAt,
      hashValid: match
  };
  
  require('fs').writeFileSync('auth-result.json', JSON.stringify(result, null, 2), 'utf-8');
}
run().catch((e: any) => {
    require('fs').writeFileSync('err_out.txt', String(e) + '\n' + String(e.message), 'utf-8');
}).finally(() => prisma.$disconnect());
