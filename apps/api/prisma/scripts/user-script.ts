import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    try {
        const [
          totalGarages,
          totalInventory,
          orphanedInventory,
          validInventory
        ] = await Promise.all([
          prisma.garage.count(),
          prisma.inventoryItem.count(),
          prisma.inventoryItem.count({
            where: {
              garageId: { not: null },
              garage: null
            }
          }),
          prisma.inventoryItem.count({
            where: {
              garage: { isNot: null }
            }
          })
        ]);

        console.log({
          totalGarages,
          totalInventory,
          orphanedInventory,
          validInventory
        });
    } catch (e) {
        console.log('Script execution error:', e.message);
    }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
