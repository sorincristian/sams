import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Starting duplicate cleanup...");
  
  // 1. Cleanup Garages
  const allGarages = await prisma.garage.findMany({
    include: {
      _count: {
        select: { buses: true, users: true, inventoryItems: true, workOrders: true, inventoryTransactions: true, workOrderPartUsages: true }
      }
    }
  });

  const nameMap = new Map();
  for (const g of allGarages) {
    const key = g.name.toLowerCase().trim();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key).push(g);
  }

  for (const [name, list] of nameMap.entries()) {
    if (list.length > 1) {
      console.log(`\nFound ${list.length} duplicates for Garage name: "${name}"`);
      
      // Sort to find the winner: most relations gets priority, otherwise oldest
      list.sort((a: any, b: any) => {
        const scoreA = a._count.buses + a._count.users + a._count.inventoryItems + a._count.workOrders + a._count.inventoryTransactions + a._count.workOrderPartUsages;
        const scoreB = b._count.buses + b._count.users + b._count.inventoryItems + b._count.workOrders + b._count.inventoryTransactions + b._count.workOrderPartUsages;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      const winner = list[0];
      const losers = list.slice(1);

      console.log(`Selected Winner: ID ${winner.id} (Score: ${winner._count.buses})`);

      for (const loser of losers) {
        console.log(`Migrating Loser: ID ${loser.id}...`);
        
        // Migrate simple 1-to-many associations
        await prisma.bus.updateMany({ where: { garageId: loser.id }, data: { garageId: winner.id } });
        await prisma.user.updateMany({ where: { garageId: loser.id }, data: { garageId: winner.id } });
        await prisma.workOrder.updateMany({ where: { garageId: loser.id }, data: { garageId: winner.id } });
        await prisma.inventoryTransaction.updateMany({ where: { garageId: loser.id }, data: { garageId: winner.id } });
        await prisma.workOrderPartUsage.updateMany({ where: { garageId: loser.id }, data: { garageId: winner.id } });

        // Migrate InventoryItems (handle @@unique([garageId, seatInsertTypeId]) constraint gracefully)
        const loserInv = await prisma.inventoryItem.findMany({ where: { garageId: loser.id } });
        for (const inv of loserInv) {
             const existing = await prisma.inventoryItem.findUnique({ 
                 where: { garageId_seatInsertTypeId: { garageId: winner.id, seatInsertTypeId: inv.seatInsertTypeId } } 
             });
             
             if (existing) {
                 await prisma.inventoryItem.update({
                      where: { id: existing.id },
                      data: { 
                          quantityOnHand: existing.quantityOnHand + inv.quantityOnHand, 
                          quantityReserved: existing.quantityReserved + inv.quantityReserved,
                          quantity: existing.quantity + inv.quantity
                      }
                 });
                 await prisma.inventoryItem.delete({ where: { id: inv.id }});
             } else {
                 await prisma.inventoryItem.update({ where: { id: inv.id }, data: { garageId: winner.id } });
             }
        }

        // Delete the now-orphaned loser garage
        await prisma.garage.delete({ where: { id: loser.id } });
        console.log(`Successfully merged and deleted Loser: ${loser.id}`);
      }
    }
  }

  // 2. Cleanup Buses
  const allBuses = await prisma.bus.findMany();
  const fleetMap = new Map();
  for (const b of allBuses) {
      if (!fleetMap.has(b.fleetNumber)) fleetMap.set(b.fleetNumber, []);
      fleetMap.get(b.fleetNumber).push(b);
  }
  
  for(const [fleet, list] of fleetMap.entries()) {
      if(list.length > 1) {
          console.log(`\nFound duplicate buses for Fleet #: ${fleet}`);
          const winner = list[0];
          const losers = list.slice(1);
          for(const loser of losers) {
             await prisma.workOrder.updateMany({ where: { busId: loser.id}, data: { busId: winner.id }});
             await prisma.bus.delete({ where: { id: loser.id }});
             console.log(`Merged and deleted duplicate bus: ${loser.id}`);
          }
      }
  }

  console.log("\nCleanup complete.");
}

main().catch(console.error).finally(()=> prisma.$disconnect());
