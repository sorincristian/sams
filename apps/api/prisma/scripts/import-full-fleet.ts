/**
 * Full Fleet Import Script
 * Parses `Bus Allocation&Status-Seats.xls` (via `out.csv`) to upsert the TTC
 * fleet roster, preserving all linked tables and generating `busCompatibilityId`
 * relationships dynamically.
 */
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function getManufacturer(typeStr: string): string {
  const norm = typeStr.toLowerCase();
  if (norm.includes("nova")) return "Nova";
  if (norm.includes("new flyer")) return "New Flyer";
  if (norm.includes("orion")) return "Orion";
  if (norm.includes("byd")) return "BYD";
  if (norm.includes("proterra")) return "Proterra";
  return "Unknown";
}

function getPropulsion(typeStr: string): string | null {
  const norm = typeStr.toLowerCase();
  if (norm.includes("electric") || norm.includes("battery")) return "Electric";
  if (norm.includes("hybrid")) return "Hybrid";
  if (norm.includes("diesel")) return "Diesel";
  return null;
}

async function main() {
  console.log("Starting Full Fleet Import...");

  const csvPath = path.resolve(__dirname, "../../import-data/out.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvData = fs.readFileSync(csvPath, "utf-8");
  // Skip the first row if it's the structural header: "Location","Type","Range","F4","F5","Total Buses"
  const records = parse(csvData, { columns: false, skip_empty_lines: true, from_line: 2 });

  let currentGarage = "";
  
  // Stats
  let createdCount = 0;
  let updatedCount = 0;
  let linkedCount = 0;
  let skippedCount = 0;

  // Track the actual buses processed to link combatibilities next
  const importedBuses: { fleetNumber: string }[] = [];

  for (const row of records) {
    // Array: [Location, Type, Range, F4, F5, F6]
    const locationCol = row[0]?.trim();
    const typeCol = row[1]?.trim();
    const rangeCol = row[2]?.trim();

    if (locationCol && locationCol.length > 0) {
      currentGarage = locationCol;
    }

    // Skip groups that lack a valid Type or Range definition
    if (!typeCol || !rangeCol) {
      skippedCount++;
      continue;
    }

    const manufacturer = getManufacturer(typeCol);
    const propulsion = getPropulsion(typeCol);

    // Ensure Garage Exists
    let garageId = "";
    if (currentGarage) {
      // Upsert garage using the string literal. Generate a safe code (e.g. McNicoll -> MCNICOLL)
      const gCode = currentGarage.replace(/[^A-Za-z0-9]/g, "").toUpperCase().substring(0, 10);
      const garage = await prisma.garage.upsert({
        where: { code: gCode },
        create: { name: currentGarage, code: gCode },
        update: { name: currentGarage }
      });
      garageId = garage.id;
    }

    // Expand the Range column (e.g., "3180-3329" or "8400")
    const ranges = rangeCol.split(/[,&\+]/).map(s => s.trim());
    for (const rangeChunk of ranges) {
      if (!rangeChunk) continue;

      const parts = rangeChunk.split("-").map(p => parseInt(p.trim(), 10));
      let start = parts[0];
      let end = parts.length > 1 ? parts[1] : parts[0];

      if (isNaN(start) || isNaN(end)) continue;

      for (let num = start; num <= end; num++) {
        const fleetNumStr = num.toString();
        
        // Upsert bus
        const existing = await prisma.bus.findUnique({ where: { fleetNumber: fleetNumStr } });
        if (existing) {
          await prisma.bus.update({
            where: { fleetNumber: fleetNumStr },
            data: {
              model: typeCol,
              manufacturer: manufacturer,
              garageId: garageId || existing.garageId, // preserve if unknown
            }
          });
          updatedCount++;
        } else {
          try {
            await prisma.bus.create({
              data: {
                fleetNumber: fleetNumStr,
                model: typeCol,
                manufacturer: manufacturer,
                garageId: garageId // Fails cleanly if no garage maps, schema enforced
              }
            });
            createdCount++;
          } catch (e: any) {
            console.error(`Failed to create bus ${fleetNumStr}: ${e.message}`);
          }
        }
        importedBuses.push({ fleetNumber: fleetNumStr });
      }
    }
  }

  // Phase 2: Link Compatibility Ranges
  console.log("Analyzing Bus Compatibility links...");
  const compatibilities = await prisma.busCompatibility.findMany({
    where: { fleetRangeStart: { not: null }, fleetRangeEnd: { not: null } }
  });

  for (const compat of compatibilities) {
    const start = compat.fleetRangeStart!;
    const end = compat.fleetRangeEnd!;
    
    // Find all buses that exist in the database with fleetNumber between start and end
    // Use raw query or bounded search
    const busesInRange = await prisma.bus.findMany({
      where: {
        // Unfortunately fleetNumber is a String in schema, so we have to manually cast or do IN array.
        // We'll generate the string array
        fleetNumber: {
          in: Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString())
        }
      }
    });

    for (const b of busesInRange) {
      if (b.busCompatibilityId !== compat.id) {
        await prisma.bus.update({
          where: { id: b.id },
          data: { busCompatibilityId: compat.id }
        });
        linkedCount++;
      }
    }
  }

  console.log("\nFleet Import Summary");
  console.log("--------------------");
  console.log(`Buses Created:   ${createdCount}`);
  console.log(`Buses Updated:   ${updatedCount}`);
  console.log(`Buses Linked:    ${linkedCount} (to diagram compatibility)`);
  console.log(`Rows Skipped:    ${skippedCount}`);
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
