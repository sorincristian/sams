import { prisma } from './src/prisma.js';

async function main() {
  const c1 = await prisma.seatInsertType.create({
    data: { partNumber: "SIT-100", description: "Standard Driver Seat Assm", vendor: "Generic Parts Co", minStockLevel: 5, componentType: "Seat" }
  });
  const c2 = await prisma.seatInsertType.create({
    data: { partNumber: "SIT-200", description: "Heavy Duty Transit Seat", vendor: "TransitCorp", minStockLevel: 2, componentType: "Seat" }
  });
  const c3 = await prisma.seatInsertType.create({
    data: { partNumber: "UPH-01", description: "Vinyl Upholstery Fix", vendor: "Upholstery Pros", minStockLevel: 10, componentType: "Upholstery" }
  });
  
  // Find or create a garage
  let garage = await prisma.garage.findFirst();
  if (!garage) {
    garage = await prisma.garage.create({ data: { name: "Central Terminal", code: "CT-01" } });
  }

  await prisma.inventoryItem.create({
    data: { seatInsertTypeId: c1.id, garageId: garage.id, quantityOnHand: 8, quantityReserved: 0 }
  });
  await prisma.inventoryItem.create({
    data: { seatInsertTypeId: c2.id, garageId: garage.id, quantityOnHand: 1, quantityReserved: 0 }
  });
  await prisma.inventoryItem.create({
    data: { seatInsertTypeId: c3.id, garageId: garage.id, quantityOnHand: 20, quantityReserved: 5 }
  });

  console.log("Seeded 3 Catalog Parts and 3 Inventory Items!");
}
main().catch(console.error).finally(() => prisma.$disconnect());
