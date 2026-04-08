import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
async function run() {
  try {
    const garages = await p.garage.count();
    const buses = await p.bus.count();
    console.log(`DB Counts -> Garages: ${garages}, Buses: ${buses}`);
  } catch(e) {
    console.log("DB ERROR:", e);
  } finally {
    await p.$disconnect();
  }
}
run();
