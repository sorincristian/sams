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
    const token = loginData.token;

    const garage = await p.garage.findFirst({ where: { name: 'Birchmount Garage' } });
    if (!garage) {
      console.log('Could not find Birch Mount. Searching for similar...');
      const fallback = await p.garage.findFirst({ where: { name: { contains: 'Birch' } } });
      var garageId = fallback?.id;
    } else {
      var garageId = garage.id;
    }
    
    console.log(`Testing with Garage ID: ${garageId}`);

    const payload = {
      garageId,
      fromName: 'TTC Birch Dispatch',
      fromEmail: 'birch@sams.local',
      replyToEmail: 'dispatch@sams.local',
      harveyToEmail: 'noreply@sams.local',
      providerType: 'SMTP',
      active: true
    };

    const postProf = await fetch(`http://127.0.0.1:4000/api/email-centre/profiles`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log(`CURL Proof 1 (POST /api/email-centre/profiles): HTTP ${postProf.status}`);
    console.log(await postProf.text());

    const getProf = await fetch(`http://127.0.0.1:4000/api/email-centre/profiles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`CURL Proof 2 (GET /api/email-centre/profiles): HTTP ${getProf.status}`);
    console.log(await getProf.text());

  } catch(e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}
run();
