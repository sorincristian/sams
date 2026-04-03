import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Smoke Test Data...');
  
  // Create test garages
  let g1 = await prisma.garage.findFirst({ where: { name: 'Smoke Test Garage Alpha' } });
  if (!g1) g1 = await prisma.garage.create({ data: { name: 'Smoke Test Garage Alpha', code: 'SMK-01', location: 'Test Track', thresholdNewInventory: 5, thresholdDirtyInventory: 10 } });

  let g2 = await prisma.garage.findFirst({ where: { name: 'Smoke Test Garage Beta (Zero Pool)' } });
  if (!g2) g2 = await prisma.garage.create({ data: { name: 'Smoke Test Garage Beta (Zero Pool)', code: 'SMK-02', location: 'Test Track', thresholdNewInventory: 5, thresholdDirtyInventory: 10 } });

  // Create seat type
  let type = await prisma.seatInsertType.findFirst({ where: { partNumber: 'SMK-PART-1' } });
  if (!type) type = await prisma.seatInsertType.create({ data: { partNumber: 'SMK-PART-1', description: 'Standard Test Seat Foam', cost: 450, isSerialized: true } });

  // Clear existing inserts for these garages
  await prisma.seatInsert.deleteMany({ where: { locationId: { in: [g1.id, g2.id] } } });

  // Scenario 1: Alpha Garage gets 1 REBUILT and 1 NEW
  await prisma.seatInsert.createMany({
    data: [
      { id: 'SMOKE-UNIT-NEW', locationId: g1.id, seatInsertTypeId: type.id, stockClass: 'REPLACEMENT_AVAILABLE', conditionSource: 'NEW', seatType: 'STANDARD', color: 'BLUE', hardwareCode: 'H1', fleetType: 'MIXED' },
      { id: 'SMOKE-UNIT-REB', locationId: g1.id, seatInsertTypeId: type.id, stockClass: 'REPLACEMENT_AVAILABLE', conditionSource: 'REBUILT', seatType: 'STANDARD', color: 'BLUE', hardwareCode: 'H1', fleetType: 'MIXED' }
    ]
  });

  // Scenario 2: Beta Garage gets 0 Available (Maybe a dirty one just to exist)
  await prisma.seatInsert.create({
    data: { id: 'SMOKE-UNIT-DIRTY', locationId: g2.id, seatInsertTypeId: type.id, stockClass: 'DIRTY_RECOVERY', conditionSource: 'NEW', seatType: 'STANDARD', color: 'BLUE', hardwareCode: 'H1', fleetType: 'MIXED' }
  });

  // Create a bus and work order to test the UI Modal
  let bus = await prisma.bus.findFirst({ where: { fleetNumber: 'SMK-BUS-X' } });
  if (!bus) bus = await prisma.bus.create({ data: { fleetNumber: 'SMK-BUS-X', garageId: g1.id, type: 'MIXED', status: 'ACTIVE' } });
  
  let wo = await prisma.workOrder.findFirst({ where: { workOrderNumber: 'WO-SMOKE-1' } });
  if (!wo) wo = await prisma.workOrder.create({ data: { workOrderNumber: 'WO-SMOKE-1', busId: bus.id, garageId: g1.id, type: 'REPAIR', status: 'IN_PROGRESS' } });

  // Bus 2 for zero-pool
  let bus2 = await prisma.bus.findFirst({ where: { fleetNumber: 'SMK-BUS-Z' } });
  if (!bus2) bus2 = await prisma.bus.create({ data: { fleetNumber: 'SMK-BUS-Z', garageId: g2.id, type: 'MIXED', status: 'ACTIVE' } });
  
  let wo2 = await prisma.workOrder.findFirst({ where: { workOrderNumber: 'WO-SMOKE-2' } });
  if (!wo2) wo2 = await prisma.workOrder.create({ data: { workOrderNumber: 'WO-SMOKE-2', busId: bus2.id, garageId: g2.id, type: 'REPAIR', status: 'IN_PROGRESS' } });

  console.log('--- SEEDING COMPLETE ---');
  console.log('Work Order for Garage Alpha (Has Pool):', wo.id);
  console.log('Work Order for Garage Beta (Zero Pool):', wo2.id);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
