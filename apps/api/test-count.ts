import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const arrowGarage = await prisma.garage.findFirst({ where: { name: 'Arrow' } });
  if (!arrowGarage) return;

  const where = { garageId: arrowGarage.id };
  const size = 50;
  const p = 1;

  const [buses, total, totalWithoutWhere] = await Promise.all([
    prisma.bus.findMany({
      where,
      include: { garage: true },
      orderBy: { fleetNumber: "asc" },
      skip: (p - 1) * size,
      take: size,
    }),
    prisma.bus.count({ where }),
    prisma.bus.count()
  ]);

  console.log(`With where: total=${total}, buses.length=${buses.length}`);
  console.log(`Without where: total=${totalWithoutWhere}`);
}

run().finally(() => prisma.$disconnect());
