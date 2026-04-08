import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log('SeatInsert:', await prisma.seatInsert.count());
  console.log('SeatInsertType:', await prisma.seatInsertType.count());
  console.log('InventoryItem:', await prisma.inventoryItem.count());
  console.log('InventoryTransaction:', await prisma.inventoryTransaction.count());
  console.log('WorkOrder:', await prisma.workOrder.count());
  console.log('SeatOrder:', await prisma.seatOrder?.count?.());
}
main().catch(console.error).finally(()=>prisma.$disconnect());
