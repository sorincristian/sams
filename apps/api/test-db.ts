import { prisma } from './src/prisma.js';
async function main() {
  console.log('SeatInsertType count:', await prisma.seatInsertType.count());
  console.log('InventoryItem count:', await prisma.inventoryItem.count());
}
main().catch(console.error).finally(() => prisma.$disconnect());
