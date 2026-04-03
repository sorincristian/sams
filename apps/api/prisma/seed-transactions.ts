import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample inventory transactions...");

  const user = await prisma.user.findFirst({
    where: { email: { contains: "admin@sams.local" } }
  });
  
  if (!user) {
    throw new Error("Admin user not found. Please ensure the database has been seeded with an admin.");
  }

  let inventoryItems = await prisma.inventoryItem.findMany({
    take: 3,
    include: {
      seatInsertType: true,
      garage: true
    }
  });

  if (inventoryItems.length === 0) {
    console.log("No inventory items found. Creating base inventory...");
    const garage = await prisma.garage.findFirst();
    const parts = await prisma.seatInsertType.findMany({ take: 3 });
    
    if (!garage || parts.length === 0) {
      throw new Error("Missing Garage or SeatInsertType data in db.");
    }
    
    for (const part of parts) {
      await prisma.inventoryItem.create({
        data: {
          garageId: garage.id,
          seatInsertTypeId: part.id,
          quantity: 0,
          quantityOnHand: 0
        }
      });
    }
    
    inventoryItems = await prisma.inventoryItem.findMany({
      take: 3,
      include: {
        seatInsertType: true,
        garage: true
      }
    });
  }

  for (const item of inventoryItems) {
    // 1. Initial RECEIVE (simulate adding stock)
    await createTransaction(item, 10, "RECEIVE", "Initial warehouse intake", user);

    // 2. ISSUE (simulate a mechanic taking a part for a work order)
    if (item.quantityOnHand >= 2) {
      await createTransaction(item, 2, "ISSUE", "Issued for emergency maintenance", user);
    }

    // 3. ADJUST_OUT (simulate a damaged/lost part)
    if (item.quantityOnHand >= 1) {
      await createTransaction(item, 1, "ADJUST_OUT", "Audit adjustment - found damaged", user);
    }
  }

  console.log("Transaction seeding complete!");
}

async function createTransaction(item: any, qty: number, type: any, notes: string, user: any) {
  const isDeduction = ["ISSUE", "TRANSFER_OUT", "ADJUST_OUT", "SCRAP"].includes(type);
  const currentQOH = item.quantityOnHand ?? item.quantity;
  const newQOH = isDeduction ? currentQOH - qty : currentQOH + qty;

  // Enforce zero-bound limitation just in case
  if (newQOH < 0) return;

  await prisma.$transaction(async (tx) => {
    // Update inventory item quantity
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: newQOH, quantity: newQOH }
    });

    // Create the transaction
    const transactionRecord = await tx.inventoryTransaction.create({
      data: {
        seatInsertTypeId: item.seatInsertTypeId,
        garageId: item.garageId,
        quantity: qty,
        type: type,
        notes: notes,
        referenceType: "MANUAL_SEED",
        performedByUserId: user.id
      }
    });

    return transactionRecord;
  });
  
  // Re-fetch to update local reference quantity
  item.quantityOnHand = newQOH; 
  item.quantity = newQOH;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
