import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const garages = await Promise.all([
    prisma.garage.upsert({ where: { code: "MAL" }, update: {}, create: { code: "MAL", name: "Malvern" } }),
    prisma.garage.upsert({ where: { code: "WIL" }, update: {}, create: { code: "WIL", name: "Wilson" } }),
    prisma.garage.upsert({ where: { code: "MTD" }, update: {}, create: { code: "MTD", name: "Mount Dennis" } })
  ]);

  const [malvern, wilson] = garages;

  const buses = [
    { fleetNumber: "9000", model: "L729/L738", manufacturer: "Nova", garageId: malvern.id },
    { fleetNumber: "9027", model: "L777", manufacturer: "Nova", garageId: malvern.id },
    { fleetNumber: "3725", model: "Catalyst", manufacturer: "Proterra", garageId: wilson.id },
    { fleetNumber: "3750", model: "K9M", manufacturer: "BYD", garageId: wilson.id }
  ];

  for (const bus of buses) {
    await prisma.bus.upsert({
      where: { fleetNumber: bus.fleetNumber },
      update: bus,
      create: bus
    });
  }

  const seatTypes = [
    { partNumber: "N8901287", description: "Back Insert Insight", vendor: "American Seating", minStockLevel: 20 },
    { partNumber: "N8902437", description: "Cushion Insert ASM Insight", vendor: "American Seating", minStockLevel: 20 },
    { partNumber: "PRT-BASE", description: "Proterra Passenger Seat Insert", vendor: "Freedman", minStockLevel: 10 },
    { partNumber: "BYD-BASE", description: "BYD Passenger Seat Insert", vendor: "Freedman", minStockLevel: 10 }
  ];

  for (const seatType of seatTypes) {
    const created = await prisma.seatInsertType.upsert({
      where: { partNumber: seatType.partNumber },
      update: seatType,
      create: seatType
    });

    await prisma.inventoryItem.upsert({
      where: {
        garageId_seatInsertTypeId: {
          garageId: malvern.id,
          seatInsertTypeId: created.id
        }
      },
      update: { quantity: 50 },
      create: { garageId: malvern.id, seatInsertTypeId: created.id, quantity: 50 }
    });
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "admin@sams.local" },
    update: {},
    create: {
      name: "SAMS Admin",
      email: "admin@sams.local",
      passwordHash,
      role: "ADMIN"
    }
  });

  const bus9000 = await prisma.bus.findUniqueOrThrow({ where: { fleetNumber: "9000" } });
  await prisma.workOrder.upsert({
    where: { workOrderNumber: "WO-1001" },
    update: {},
    create: {
      workOrderNumber: "WO-1001",
      issueDescription: "Replace worn seat insert on front section",
      status: "OPEN",
      priority: "HIGH",
      busId: bus9000.id,
      garageId: malvern.id
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
