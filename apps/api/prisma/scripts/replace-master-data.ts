import fs from "fs";
import path from "path";
import xlsx from "xlsx";
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

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`Starting Full Fleet Master Import... [DRY_RUN: ${isDryRun}]`);

  const xlsPath = path.resolve(__dirname, "../import-data/Bus Allocation&Status-Seats.xls");
  if (!fs.existsSync(xlsPath)) {
    console.error(`ERROR: XLS file not found at ${xlsPath}`);
    process.exit(1);
  }

  // 1. PARSE NATIVELY
  console.log("Parsing .xls Natively...");
  const workbook = xlsx.readFile(xlsPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

  const parsedGarages = new Set<string>();
  const parsedBuses = new Set<string>();
  const dataMap = new Map<string, Map<string, { model: string, mfg: string }>>();

  let currentGarage = "";
  let currentType = "";
  let currentMfg = "";
  
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    
    const cells = row.map((v: any) => v?.toString().trim()).filter((v: string) => v);
    if (cells.length === 0) continue;

    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];

    if (firstCell.endsWith("Garage") && !firstCell.includes("Total") && !firstCell.includes("Status")) {
       currentGarage = firstCell.replace("Garage", "").trim();
       continue;
    }
    
    if (lastCell.startsWith("Total Buses:")) {
       if (cells.length >= 2) {
         currentType = firstCell;
         currentMfg = getManufacturer(currentType);
       }
       continue;
    }
    
    if (currentGarage && currentType) {
       for (const cell of cells) {
         if (/^\d{4,5}$/.test(cell)) {
            parsedGarages.add(currentGarage);
            parsedBuses.add(cell);
            if (!dataMap.has(currentGarage)) dataMap.set(currentGarage, new Map());
            dataMap.get(currentGarage)!.set(cell, { model: currentType, mfg: currentMfg });
         }
       }
    }
  }

  console.log(`Parsed ${parsedGarages.size} Garages, ${parsedBuses.size} Buses from file.`);

  let stats = {
    garagesCreated: 0, garagesUpdated: 0, garagesDeleted: 0, garagesRetired: 0,
    busesCreated: 0, busesUpdated: 0, busesDeleted: 0, busesRetired: 0
  };

  // 2. UPSERT GARAGES
  console.log("Upserting Garages...");
  const garageIdMap = new Map<string, string>();
  
  for (const gName of parsedGarages) {
      const gCode = gName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().substring(0, 10);
      let existing = await prisma.garage.findFirst({ where: { name: { equals: gName, mode: 'insensitive' } } });
      
      // Fallback matching by generated code
      if (!existing) {
          existing = await prisma.garage.findFirst({ where: { code: gCode } });
      }
      
      if (!isDryRun) {
         if (existing) {
             const updated = await prisma.garage.update({ where: { id: existing.id }, data: { name: gName, active: true } });
             garageIdMap.set(gName, updated.id);
             stats.garagesUpdated++;
         } else {
             const created = await prisma.garage.create({ data: { name: gName, code: gCode, active: true } });
             garageIdMap.set(gName, created.id);
             stats.garagesCreated++;
         }
      } else {
         if(existing) {
            stats.garagesUpdated++;
            garageIdMap.set(gName, existing.id);
         } else {
            stats.garagesCreated++;
            garageIdMap.set(gName, "DRY_" + gCode);
         }
      }
  }

  // 3. UPSERT BUSES
  console.log("Upserting Buses...");
  for (const [gName, busMap] of dataMap.entries()) {
      const gId = garageIdMap.get(gName) || "UNKNOWN";
      
      for (const [fNum, info] of busMap.entries()) {
          const existing = await prisma.bus.findUnique({ where: { fleetNumber: fNum } });
          if (!isDryRun) {
              if (existing) {
                  await prisma.bus.update({ 
                     where: { id: existing.id },
                     data: { model: info.model, manufacturer: info.mfg, garageId: gId, status: existing.status === 'RETIRED' ? 'ACTIVE' : existing.status }
                  });
                  stats.busesUpdated++;
              } else {
                  await prisma.bus.create({
                     data: { fleetNumber: fNum, model: info.model, manufacturer: info.mfg, garageId: gId, status: 'ACTIVE' }
                  });
                  stats.busesCreated++;
              }
          } else {
              if(existing) stats.busesUpdated++; else stats.busesCreated++;
          }
      }
  }

  // 4. OBSOLETE BUSES
  console.log("Processing Obsolete Buses...");
  const missingBuses = await prisma.bus.findMany({ where: { NOT: { fleetNumber: { in: Array.from(parsedBuses) } } } });
  
  for (const bus of missingBuses) {
      if(bus.status === 'RETIRED') continue; // Don't double log
      
      const wos = await prisma.workOrder.count({ where: { busId: bus.id } });
      const inserts = await prisma.seatInsert.count({ where: { installedBusId: bus.id } });
      
      if (wos === 0 && inserts === 0) {
          if(!isDryRun) await prisma.bus.delete({ where: { id: bus.id } });
          console.log(`[Bus ${bus.fleetNumber}] Hard Deleted (0 references)`);
          stats.busesDeleted++;
      } else {
          if(!isDryRun) await prisma.bus.update({ where: { id: bus.id }, data: { status: 'RETIRED' } });
          console.log(`[Bus ${bus.fleetNumber}] Soft-Retired (WOs: ${wos}, Inserts: ${inserts})`);
          stats.busesRetired++;
      }
  }

  // 5. OBSOLETE GARAGES
  console.log("Processing Obsolete Garages...");
  const allGarages = await prisma.garage.findMany();
  const missingGarages = allGarages.filter(g => {
     return !Array.from(parsedGarages).some(pg => pg.toLowerCase() === g.name.toLowerCase());
  });

  for (const g of missingGarages) {
      if(!g.active) continue; // Don't double log inactive garages

      const wos = await prisma.workOrder.count({ where: { garageId: g.id } });
      const invs = await prisma.inventoryItem.count({ where: { garageId: g.id } });
      const users = await prisma.user.count({ where: { garageId: g.id } });
      const bcount = await prisma.bus.count({ where: { garageId: g.id } });
      
      if (wos === 0 && invs === 0 && users === 0 && bcount === 0) {
          if(!isDryRun) await prisma.garage.delete({ where: { id: g.id } });
          console.log(`[Garage ${g.name}] Hard Deleted (0 references)`);
          stats.garagesDeleted++;
      } else {
          if(!isDryRun) await prisma.garage.update({ where: { id: g.id }, data: { active: false } });
          console.log(`[Garage ${g.name}] Soft-Retired (WOs: ${wos}, Inv: ${invs}, Users: ${users}, Buses: ${bcount})`);
          stats.garagesRetired++;
      }
  }

  console.log("\\n=== IMPORT SUMMARY ===");
  console.table(stats);
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
