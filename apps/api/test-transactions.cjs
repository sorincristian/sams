const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFetch() {
  const allowedGarages = ['cmnkd0d560000cr9bgah02aqb']; // arbitrary safe ID
  const where = { garageId: { in: allowedGarages } };

  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: {
        garage: true,
        seatInsertType: true,
        performedByUser: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    });
    console.log(JSON.stringify(transactions, null, 2));
  } catch (error) {
    console.error("Error running Prisma:", error);
  }
}

testFetch().finally(() => prisma.$disconnect());
