import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const g = await prisma.garage.findFirst({where:{code:'MAL'}});
  if(!g) { console.log("Not found"); return; }
  console.log('ID:', g.id);
  const u = await prisma.user.count({where:{garageId: g.id}});
  const w = await prisma.workOrder.count({where:{garageId: g.id}});
  const i = await prisma.inventoryItem.count({where:{garageId: g.id}});
  const t = await prisma.inventoryTransaction.count({where:{garageId: g.id}});
  console.log('Users:', u, 'WorkOrders:', w, 'Inventory:', i, 'Txns:', t);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
