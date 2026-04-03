import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function run() {
  console.log('--- Checking admin user ---');
  let user = await prisma.user.findUnique({ where: { email: 'admin@sams.local' }});

  const targetPassword = 'Admin123!';
  const targetRole = 'SYSTEM_ADMIN';
  const hashed = await bcrypt.hash(targetPassword, 10);

  if (!user) {
    console.log('[ACTION] User is missing. Creating...');
    user = await prisma.user.create({
      data: {
        email: 'admin@sams.local',
        passwordHash: hashed,
        role: targetRole,
        name: 'System Admin'
      }
    });
    console.log('[RESULT] User created.');
  } else {
    console.log('[ACTION] User exists. Updating password and role...');
    user = await prisma.user.update({
      where: { email: 'admin@sams.local' },
      data: {
        passwordHash: hashed,
        role: targetRole
      }
    });
    console.log('[RESULT] User updated successfully.');
  }

  console.log('\n--- Verifying Login via real auth path ---');
  try {
    const res = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sams.local', password: targetPassword })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('[SUCCESS] Login successful!', {
        statusCode: res.status,
        email: data.user.email,
        role: data.user.role,
        tokenReceived: !!data.token
      });
    } else {
      const err = await res.text();
      console.log('[ERROR] Login failed:', res.status, err);
    }
  } catch(e: any) {
    console.log('[ERROR] Fetch error:', e.message);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
