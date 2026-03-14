/**
 * import-seat-catalog.ts
 * Reads the "Seats" sheet from Bus Allocation&Status-Seats.xls
 * and upserts SeatInsertType records.
 *
 * ACTUAL SHEET STRUCTURE (verified 2026-03-13):
 *   Row 0:  [vendorName, "Manufacturer code", "TTC code"]   ← header / vendor label in col A
 *   Row 1+: [description, manufacturerCode, ttcCodes]
 *
 * Usage (from apps/api):
 *   pnpm exec tsx prisma/scripts/import-seat-catalog.ts <path-to-xls>
 */
import * as XLSX from "xlsx";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

function parseComponentType(description: string): "BACK" | "CUSHION" | null {
  const lower = description.toLowerCase();
  if (lower.includes("insert back")) return "BACK";
  if (lower.includes("insert cushion")) return "CUSHION";
  return null;
}

function parseTrimSpec(description: string): string {
  const commaIdx = description.indexOf(",");
  return commaIdx >= 0 ? description.slice(commaIdx + 1).trim() : "";
}

async function main() {
  const xlsPath = process.argv[2] ?? path.join(__dirname, "../import-data/Bus Allocation&Status-Seats.xls");
  console.log(`Reading: ${xlsPath}`);

  const fileBuffer = fs.readFileSync(xlsPath);
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const ws = wb.Sheets["Seats"];
  if (!ws) throw new Error(`Sheet "Seats" not found. Available: ${wb.SheetNames.join(", ")}`);

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  console.log(`Total rows in Seats sheet: ${rows.length}`);

  // Row 0 is the header — col A contains the vendor name
  let currentVendor = String(rows[0]?.[0] ?? "").trim() || "Unknown";
  console.log(`Initial vendor from header: "${currentVendor}"`);

  let imported = 0;
  let skipped = 0;

  // Start from row 1 (skip header)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const colA = String(row[0] ?? "").trim(); // description
    const colB = String(row[1] ?? "").trim(); // manufacturer code
    const colC = String(row[2] ?? "").trim(); // TTC code(s)

    // If col A looks like a vendor header (no TTC code in col C)
    if (colA && !colC) {
      currentVendor = colA;
      console.log(`  → Vendor: ${currentVendor}`);
      continue;
    }

    // Skip rows with no TTC code
    if (!colC) { skipped++; continue; }

    // Parse slash-separated alternate part numbers from the TTC code field
    const parts = colC.split("/").map((p: string) => p.trim()).filter(Boolean);
    const primaryPart = parts[0];
    const alternatePartNumbers = parts;

    const componentType = parseComponentType(colA);
    const trimSpec = parseTrimSpec(colA);

    try {
      await prisma.seatInsertType.upsert({
        where: { partNumber: primaryPart },
        update: {
          description: colA || undefined,
          manufacturerPartNumber: colB || undefined,
          alternatePartNumbers,
          componentType,
          trimSpec: trimSpec || undefined,
          vendor: currentVendor,
        },
        create: {
          partNumber: primaryPart,
          description: colA || `Part ${primaryPart}`,
          manufacturerPartNumber: colB || null,
          alternatePartNumbers,
          componentType,
          trimSpec: trimSpec || null,
          vendor: currentVendor,
          active: true,
        },
      });
      imported++;
      console.log(`  ✓ ${primaryPart} (${componentType ?? "?"}) - ${currentVendor}`);
    } catch (err: any) {
      console.error(`  ✗ Row ${i + 1} [${primaryPart}]: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
