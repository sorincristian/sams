import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const garages = await prisma.garage.findMany({
    select: {
      id: true,
      name: true,
      active: true,
      code: true,
      _count: { select: { inventory: true, workOrders: true, users: true } }
    }
  });
  console.log(JSON.stringify(garages, null, 2));
}

main().catch(console.error).finally(()=>prisma.$disconnect());
