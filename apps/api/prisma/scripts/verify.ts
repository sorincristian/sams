import { PrismaClient } from '@prisma/client'; 
const prisma = new PrismaClient(); 

async function main() { 
  const parent = await prisma.seatInsertType.findUnique({
    where: { partNumber: 'SK3324-8030' },
    include: { components: true }
  });
  console.log("PARENT:", parent);

  const inventoryItems = await prisma.seatInsertType.findMany({
    where: { partNumber: { startsWith: 'BS-' } }
  });
  console.log("CHILDREN:", inventoryItems);

  const bomRows = await prisma.bomComponent.findMany();
  console.log("BOM ROWS:", bomRows);

  const mockChild = inventoryItems[0];
  const stock = await prisma.inventoryItem.findMany({
    where: { seatInsertTypeId: mockChild.id }
  });
  console.log(`STOCK records for ${mockChild.partNumber}:`, stock.length);
} 
main();
