import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
p.user.findUnique({ where: { email: 'admin@sams-local.com' } }).then(u => { 
  console.log('USER:', u ? { id: u.id, email: u.email, name: u.name, role: u.role, hasPasswordHash: !!u.passwordHash } : 'NOT FOUND'); 
  p.$disconnect(); 
});
