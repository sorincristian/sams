/**
 * import-seat-catalog.ts
 * Reads the "Seats" sheet from Bus Allocation&Status-Seats.xls
 * and upserts SeatInsertType records.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx prisma/scripts/import-seat-catalog.ts <path-to-xls>
 */
import { createRequire } from "module";
const XLSX = createRequire(import.meta.url)("xlsx");
import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

// Rows where a manufacturer section header appears (cell B)
// These are non-data rows we detect by the absence of a valid TTC code in col D.
function detectManufacturer(cellB: string): string | null {
  const known = ["New Flyer", "NOVA", "Nova", "BYD", "Proterra", "Orion"];
  for (const k of known) {
    if (cellB?.toLowerCase().includes(k.toLowerCase())) return k;
  }
  return null;
}

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

  const wb = XLSX.readFile(xlsPath);
  const ws = wb.Sheets["Seats"];
  if (!ws) throw new Error('Sheet "Seats" not found in workbook');

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  let currentVendor = "Unknown";
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const colB = String(row[1] ?? "").trim(); // description
    const colC = String(row[2] ?? "").trim(); // manufacturer code
    const colD = String(row[3] ?? "").trim(); // TTC code

    // Detect section header (vendor name in col B, no TTC code in D)
    if (colB && !colD && detectManufacturer(colB)) {
      currentVendor = detectManufacturer(colB)!;
      console.log(`  → Vendor section: ${currentVendor}`);
      continue;
    }

    // Skip rows without a TTC code
    if (!colD) { skipped++; continue; }

    // Parse slash-separated alternate part numbers
    const parts = colD.split("/").map((p) => p.trim()).filter(Boolean);
    const primaryPart = parts[0];
    const alternatePartNumbers = parts; // includes primary

    const componentType = parseComponentType(colB);
    const trimSpec = parseTrimSpec(colB);

    try {
      await prisma.seatInsertType.upsert({
        where: { partNumber: primaryPart },
        update: {
          description: colB || undefined,
          manufacturerPartNumber: colC || undefined,
          alternatePartNumbers,
          componentType,
          trimSpec: trimSpec || undefined,
          vendor: currentVendor,
        },
        create: {
          partNumber: primaryPart,
          description: colB || `Part ${primaryPart}`,
          manufacturerPartNumber: colC || null,
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
      console.error(`  ✗ Row ${i + 1} error: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
