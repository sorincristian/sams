import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function run() {
  try {
    const loginRes = await fetch('http://127.0.0.1:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sams-local.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    console.log('Login Result:', loginData);
    const token = loginData.token;

    const order = await p.seatOrder.findFirst();
    const id = order?.id || 'non-existent-id';
    
    console.log(`Testing with Order ID: ${id}`);

    const getOrd = await fetch(`http://127.0.0.1:4000/api/seat-orders/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`CURL Proof 1 (GET /api/seat-orders/${id}): HTTP ${getOrd.status}`);
    console.log(await getOrd.text());

    const getLogs = await fetch(`http://127.0.0.1:4000/api/seat-orders/${id}/logs?take=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`CURL Proof 2 (GET /api/seat-orders/${id}/logs?take=100): HTTP ${getLogs.status}`);
    console.log(await getLogs.text());

  } catch(e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}
run();
