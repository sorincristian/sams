import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const garages = await prisma.garage.findMany({ where: { name: 'Malvern' } });
  console.log(`Found ${garages.length} Malvern garages:`, garages);

  const g = garages.find(g => g.code === 'MAL');
  if (!g) {
    console.log('Malvern with code MAL not found.');
    return;
  }

  console.log(`Analyzing garage ID: ${g.id}`);
  const busCount = await prisma.bus.count({ where: { garageId: g.id } });
  const userCount = await prisma.user.count({ where: { garageId: g.id } });
  const invCount = await prisma.inventoryItem.count({ where: { garageId: g.id } });
  const woCount = await prisma.workOrder.count({ where: { garageId: g.id } });
  const itCount = await prisma.inventoryTransaction.count({ where: { garageId: g.id } });
  const wpuCount = await prisma.workOrderPartUsage.count({ where: { garageId: g.id } });

  console.log('Relations counts:', { busCount, userCount, invCount, woCount, itCount, wpuCount });

  try {
    console.log('Attempting Prisma delete...');
    await prisma.garage.delete({ where: { id: g.id } });
    console.log('Deleted successfully (which is unexpected)');
  } catch (err: any) {
    console.error('Prisma Error code:', err.code);
    console.error('Prisma Error message:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
