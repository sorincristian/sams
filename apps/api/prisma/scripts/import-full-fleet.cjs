const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function getManufacturer(typeStr) {
  const norm = typeStr.toLowerCase();
  if (norm.includes("nova")) return "Nova";
  if (norm.includes("new flyer")) return "New Flyer";
  if (norm.includes("orion")) return "Orion";
  if (norm.includes("byd")) return "BYD";
  if (norm.includes("proterra")) return "Proterra";
  return "Unknown";
}

function getPropulsion(typeStr) {
  const norm = typeStr.toLowerCase();
  if (norm.includes("electric") || norm.includes("battery")) return "Electric";
  if (norm.includes("hybrid")) return "Hybrid";
  if (norm.includes("diesel")) return "Diesel";
  return null;
}

// Basic CSV line parser (handles quoted values with internal commas well enough for this specific file)
function parseCSVLine(line) {
  const result = [];
  let inQuotes = false;
  let currentVal = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal.trim());
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
}

async function main() {
  console.log("Starting Full Fleet Import from basic CJS script...");

  const csvPath = path.resolve(__dirname, "../import-data/out.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  const csvData = fs.readFileSync(csvPath, "utf-8");
  const lines = csvData.split(/\r?\n/).filter(l => l.trim().length > 0);

  let currentGarage = "";
  let createdCount = 0;
  let updatedCount = 0;
  let linkedCount = 0;
  let skippedCount = 0;

  // Process rows starting from index 1 (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) {
      skippedCount++;
      continue;
    }

    const locationCol = row[0];
    const typeCol = row[1];
    const rangeCol = row[2];

    if (locationCol && locationCol.length > 0) {
      currentGarage = locationCol;
    }

    if (!typeCol || !rangeCol) {
      skippedCount++;
      continue;
    }

    const manufacturer = getManufacturer(typeCol);
    const propulsion = getPropulsion(typeCol);

    let garageId = "";
    if (currentGarage) {
      const gCode = currentGarage.replace(/[^A-Za-z0-9]/g, "").toUpperCase().substring(0, 10);
      const garage = await prisma.garage.upsert({
        where: { code: gCode },
        create: { name: currentGarage, code: gCode },
        update: { name: currentGarage }
      });
      garageId = garage.id;
    }

    const ranges = rangeCol.split(/[,&\+]/).map(s => s.trim());
    for (const rangeChunk of ranges) {
      if (!rangeChunk) continue;

      const parts = rangeChunk.split("-").map(p => parseInt(p.trim(), 10));
      let start = parts[0];
      let end = parts.length > 1 ? parts[1] : parts[0];

      if (isNaN(start) || isNaN(end)) continue;

      for (let num = start; num <= end; num++) {
        const fleetNumStr = num.toString();
        
        const existing = await prisma.bus.findUnique({ where: { fleetNumber: fleetNumStr } });
        if (existing) {
          await prisma.bus.update({
            where: { fleetNumber: fleetNumStr },
            data: {
              model: typeCol,
              manufacturer: manufacturer,
              garageId: garageId || existing.garageId,
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
                garageId: garageId
              }
            });
            createdCount++;
          } catch (e) {
            console.error(`Failed to create bus ${fleetNumStr}: ${e.message}`);
          }
        }
      }
    }
  }

  console.log("Analyzing Bus Compatibility links...");
  const compatibilities = await prisma.busCompatibility.findMany({
    where: { fleetRangeStart: { not: null }, fleetRangeEnd: { not: null } }
  });

  for (const compat of compatibilities) {
    const start = compat.fleetRangeStart;
    const end = compat.fleetRangeEnd;
    
    // Generate array of fleet numbers inside range
    const fleetNumbers = [];
    for (let i = start; i <= end; i++) {
        fleetNumbers.push(i.toString());
    }

    const busesInRange = await prisma.bus.findMany({
      where: {
        fleetNumber: { in: fleetNumbers }
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
