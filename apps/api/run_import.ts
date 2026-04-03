import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function run() {
  const wb = xlsx.readFile('c:\\SIMS\\sams-render\\apps\\api\\prisma\\import-data\\Bus Allocation&Status-Seats.xls');
  const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});

  let currentGarage = null;
  let currentModel = null;
  const buses = [];

  for(let i=0; i<raw.length; i++) {
    const r = raw[i] as any[];
    const rowVals = r.filter(x => x && String(x).trim() !== "");
    if (rowVals.length === 0) continue;
    
    const v0 = String(r[0] || '').trim();
    const v1 = String(r[1] || '').trim();

    if (v0.toLowerCase().includes('garage') || v0.toLowerCase().includes('division')) {
       currentGarage = v0;
    }
    else if (v1.toLowerCase().includes('bus') && !v1.toLowerCase().includes('status')) {
       currentModel = v1;
    }
    else {
      for (let c of r) {
        if (c && String(c).match(/^[0-9]{4}$/)) {
          buses.push({ garage: currentGarage, model: currentModel, fleetNumber: String(c) });
        }
      }
    }
  }

  // Ensure Garages exist
  const uniqueGarages = Array.from(new Set(buses.map(b => b.garage).filter(Boolean)));
  const garageMap = new Map();
  for (const gName of uniqueGarages) {
    let g = await prisma.garage.findFirst({ where: { name: { equals: String(gName), mode: 'insensitive' } } });
    if (!g) {
      g = await prisma.garage.create({
        data: { name: String(gName), code: `G-${crypto.randomUUID().substring(0, 5).toUpperCase()}` }
      });
    }
    garageMap.set(gName, g.id);
  }

  let created = 0;
  for (const b of buses) {
    const garageId = b.garage ? garageMap.get(b.garage) : null;
    if (!garageId) continue;
    
    let manufacturer = 'Unknown';
    if (b.model && b.model.toLowerCase().includes('orion')) manufacturer = 'Orion';
    if (b.model && b.model.toLowerCase().includes('nova')) manufacturer = 'Nova Bus';
    if (b.model && b.model.toLowerCase().includes('new flyer')) manufacturer = 'New Flyer';
    if (b.model && b.model.toLowerCase().includes('proterra')) manufacturer = 'Proterra';
    if (b.model && b.model.toLowerCase().includes('byd')) manufacturer = 'BYD';

    await prisma.bus.upsert({
      where: { fleetNumber: b.fleetNumber },
      update: { garageId, model: String(b.model || 'Unknown'), manufacturer, status: 'ACTIVE' },
      create: { fleetNumber: String(b.fleetNumber), garageId, model: String(b.model || 'Unknown'), manufacturer, status: 'ACTIVE' }
    });
    created++;
  }
  
  const count = await prisma.bus.count();
  console.log(`Import complete. Processed rows/buses: ${created}. Total buses in DB: ${count}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
