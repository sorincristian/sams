import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VERIFIED_SKUS = [
  { partNumber: "6476097", category: "CUSHION" },
  { partNumber: "6476099", category: "CUSHION" },
  { partNumber: "6476101", category: "CUSHION" },
  { partNumber: "6499298", category: "CUSHION" },
  { partNumber: "6476096", category: "BACK" },
  { partNumber: "6476098", category: "BACK" },
  { partNumber: "6498984", category: "BACK" },
  { partNumber: "6477979", category: "BACK" },
];

const TEMPLATES = [
  {
    partNumber: "EV_STANDARD_40FT",
    description: "Seat Template - 40ft EV / HYB Core",
    componentType: "TEMPLATE",
    backends: ["6476096", "6476098", "6498984"],
    cushions: ["6476097", "6476099", "6476101"],
    fleets: ["New Flyer 40 ft HYB", "Proterra", "BYD"]
  },
  {
    partNumber: "EV_STANDARD_60FT",
    description: "Seat Template - 60ft HYB Core",
    componentType: "TEMPLATE",
    backends: ["6476096", "6476098", "6498984"],
    cushions: ["6476097", "6476099", "6476101"],
    fleets: ["New Flyer 60 ft HYB"]
  },
  {
    partNumber: "NEW_FLYER_40E_RED_CRIMSON",
    description: "Seat Template - 40ft New Flyer Red Crimson",
    componentType: "TEMPLATE",
    backends: ["6477979"],
    cushions: ["6499298"],
    fleets: ["New Flyer 40 ft Electric"]
  },
  {
    partNumber: "ORION_1336AB_TEMPLATE",
    description: "Seat Template - Orion 1336AB (#8100-8219)",
    componentType: "TEMPLATE",
    backends: [],
    cushions: [],
    fleets: ["Orion 1336AB (#8100-8219)"]
  },
  {
    partNumber: "ORION_1358AB_TEMPLATE",
    description: "Seat Template - Orion 1358AB (#8300-8396)",
    componentType: "TEMPLATE",
    backends: [],
    cushions: [],
    fleets: ["Orion 1358AB (#8300-8396)"]
  }
];

async function main() {
  console.log("Starting production deployment script for Fleet BOM templates...");

  let loadedCushions = 0;
  let loadedBacks = 0;
  let createdParents = 0;
  let createdLinks = 0;
  let mapCount = 0;

  // 1) Assert verified SKUs exist (safety check)
  for (const sku of VERIFIED_SKUS) {
    const exists = await prisma.seatInsertType.findUnique({ where: { partNumber: sku.partNumber } });
    if (!exists) {
      console.warn(`WARNING: Verified SKU ${sku.partNumber} does not exist in production! Must run strict catalog import first.`);
      continue;
    }
    if (sku.category === "CUSHION") loadedCushions++;
    if (sku.category === "BACK") loadedBacks++;
  }

  console.log(`Verified DB base layer: ${loadedCushions} CUSHIONS, ${loadedBacks} BACKS.`);

  // 2) Upsert Parent BOM Templates and map fleets
  for (const t of TEMPLATES) {
    // 2a. Parent template record
    const parent = await prisma.seatInsertType.upsert({
      where: { partNumber: t.partNumber },
      update: {
        description: t.description,
        componentType: t.componentType
      },
      create: {
        partNumber: t.partNumber,
        description: t.description,
        vendor: "SAMS Fleet Operations",
        componentType: t.componentType,
        active: true
      }
    });
    createdParents++;

    // 2b. Map fleets to template through canonical busCompatibilities
    for (const f of t.fleets) {
      // Safely ensure BusCompatibility exists
      const compatId = f.replace(/[^A-Za-z0-9]/g, "_").toUpperCase() + "_GENERIC";
      
      const compat = await prisma.busCompatibility.upsert({
        where: { busTypeLabel_fleetRangeLabel: { busTypeLabel: f, fleetRangeLabel: "General Fleet" } },
        update: {},
        create: {
          busTypeLabel: f,
          manufacturer: f.split(" ")[0] || "Unknown",
          fleetRangeLabel: "General Fleet"
        }
      });

      // Connect SeatInsertType -> busCompatibility
      await prisma.seatInsertType.update({
        where: { id: parent.id },
        data: {
          busCompatibilities: {
            connect: { id: compat.id }
          }
        }
      });
      mapCount++;
    }

    // 2c. Link Child BOM parts (Skip for Orion templates / empty shells)
    const combinedChildren = [...t.backends, ...t.cushions];
    for (const childPartNo of combinedChildren) {
      const child = await prisma.seatInsertType.findUnique({ where: { partNumber: childPartNo } });
      if (!child) continue;

      // Link via BomComponent
      await prisma.bomComponent.upsert({
        where: { parentAssemblyId_childComponentId: { parentAssemblyId: parent.id, childComponentId: child.id } },
        update: { requiredQty: 1 },
        create: {
          parentAssemblyId: parent.id,
          childComponentId: child.id,
          requiredQty: 1
        }
      });
      createdLinks++;
    }
  }

  console.log("\n====== DEPLOYMENT SUMMARY ======");
  console.log(`Parent Templates Deployed: ${createdParents}`);
  console.log(`Child SKUs verified and linked: ${createdLinks}`);
  console.log(`Fleet Compatibility mappings linked: ${mapCount}`);
}

main().catch(err => {
  console.error("FATAL ERROR", err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
