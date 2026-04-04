import { PrismaClient } from '@prisma/client'; 
import * as fs from 'fs';
const prisma = new PrismaClient(); 

async function main() { 
  const parent = await prisma.seatInsertType.findUnique({
    where: { partNumber: 'SK3324-8030' },
    include: { components: true }
  });
  let out = "PARENT:\n" + JSON.stringify(parent, null, 2) + "\n\n";

  const inventoryItems = await prisma.seatInsertType.findMany({
    where: { partNumber: { startsWith: 'BS-' } }
  });
  out += "CHILDREN:\n" + JSON.stringify(inventoryItems, null, 2) + "\n\n";

  const bomRows = await prisma.bomComponent.findMany();
  out += "BOM ROWS:\n" + JSON.stringify(bomRows, null, 2) + "\n\n";

  const mockChild = inventoryItems[0];
  const stock = await prisma.inventoryItem.findMany({
    where: { seatInsertTypeId: mockChild.id }
  });
  out += `STOCK records for ${mockChild.partNumber}: ` + stock.length;
  
  fs.writeFileSync('verify-out.txt', out, 'utf-8');
} 
main();
