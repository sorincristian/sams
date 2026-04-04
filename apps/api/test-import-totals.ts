import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

function normalizeCategory(raw: string): "CUSHION" | "BACK" | null {
  const norm = String(raw || "").toLowerCase().replace(/[^a-z]/g, "");

  const cushionAliases = new Set([
    "cushion",
    "seatcushion",
    "cushioninsert",
    "seatbottom",
    "bottomcushion",
    "insertcushion",
  ]);

  const backAliases = new Set([
    "back",
    "seatback",
    "backinsert",
    "backrest",
    "seatbackrest",
    "lowerback",
    "upperback",
    "insertback",
  ]);

  if (cushionAliases.has(norm)) return "CUSHION";
  if (backAliases.has(norm)) return "BACK";
  return null;
}

async function main() {
  const xlsPath = path.join(import.meta.dirname, "prisma/import-data/Bus Allocation&Status-Seats.xls");
  const fileBuffer = fs.readFileSync(xlsPath);
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const ws = wb.Sheets["Seats"];
  if (!ws) throw new Error("Seat sheet not found");

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  let totalRows = 0;
  let validCushionCount = 0;
  let validBackCount = 0;
  let skippedCount = 0;
  
  const skippedCategories = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const colA = String(row[0] ?? "").trim(); // description
    const colC = String(row[2] ?? "").trim(); // TTC code(s)

    if (colA && !colC) {
      continue; // Vendor header
    }

    if (!colC) { 
       continue; // empty row
    }

    totalRows++;
    
    const colARaw = String(row[0] ?? "").trim();
    const categoryRaw = colARaw.split(",")[0].trim();
    
    const category = normalizeCategory(categoryRaw);
    
    if (!category) {
       skippedCount++;
       skippedCategories.add(colA);
    } else {
       if (category === "CUSHION") validCushionCount++;
       if (category === "BACK") validBackCount++;
    }
  }

  console.log(`=== FULL PREVIEW TOTALS ===`);
  console.log(`Total Valid Rows Detected: ${totalRows}`);
  console.log(`Inserted Cushions: ${validCushionCount}`);
  console.log(`Inserted Backs: ${validBackCount}`);
  console.log(`Skipped Rows: ${skippedCount}`);
  
  console.log(`=== SKIPPED CATEGORY EXAMPLES ===`);
  const skippedList = Array.from(skippedCategories);
  console.log(skippedList.slice(0, 15).map(v => `- ${v}`).join("\n"));
  if (skippedList.length > 15) console.log(`...and ${skippedList.length - 15} more.`);
}

main().catch(console.error);
