/**
 * import-bus-compatibility.ts
 * Reads the "BUSCat." sheet and upserts BusCompatibility records.
 *
 * Usage:
 *   pnpm exec tsx prisma/scripts/import-bus-compatibility.ts <path-to-xls>
 */
import { createRequire } from "module";
const XLSX = createRequire(import.meta.url)("xlsx");
import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

function parseFleetRange(rangeStr: string): { start: number | null; end: number | null } {
  const clean = rangeStr.trim();
  const dashMatch = clean.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (dashMatch) return { start: parseInt(dashMatch[1]), end: parseInt(dashMatch[2]) };
  const singleMatch = clean.match(/^(\d+)$/);
  if (singleMatch) { const n = parseInt(singleMatch[1]); return { start: n, end: n }; }
  return { start: null, end: null };
}

function deriveManufacturer(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("nova")) return "Nova";
  if (l.includes("new flyer")) return "New Flyer";
  if (l.includes("proterra")) return "Proterra";
  if (l.includes("byd")) return "BYD";
  if (l.includes("orion")) return "Orion";
  return label.split(" ")[0];
}

function deriveModelFamily(label: string): string | null {
  // Extract model family hints
  const patterns: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
    [/L\d{3}[^,\s]*/i, (m: RegExpMatchArray) => m[0]],
    [/artic/i, "Artic"],
    [/40\s*ft/i, "40 ft"],
    [/60\s*ft/i, "60 ft"],
    [/electric/i, "Electric"],
    [/hybrid/i, "Hybrid"],
  ];
  for (const [re, val] of patterns) {
    const m = label.match(re as RegExp);
    if (m) return typeof val === "function" ? val(m) : val;
  }
  return null;
}

function derivePropulsion(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes("electric")) return "Electric";
  if (l.includes("hybrid") || l.includes("hyb")) return "Hybrid";
  if (l.includes("diesel")) return "Diesel";
  if (l.includes("cng")) return "CNG";
  return null;
}

async function main() {
  const xlsPath = process.argv[2] ?? path.join(__dirname, "../import-data/Bus Allocation&Status-Seats.xls");
  console.log(`Reading: ${xlsPath}`);

  const wb = XLSX.readFile(xlsPath);
  const ws = wb.Sheets["BUSCat."];
  if (!ws) throw new Error('Sheet "BUSCat." not found — available: ' + wb.SheetNames.join(", "));

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  let imported = 0;
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) { // skip header row
    const row = rows[i];
    // A=0, B=1, C=2, F=5
    const colB = String(row[1] ?? "").trim(); // bus type
    const colC = String(row[2] ?? "").trim(); // fleet range

    if (!colB || !colC) { skipped++; continue; }

    const { start, end } = parseFleetRange(colC);
    const manufacturer = deriveManufacturer(colB);
    const modelFamily = deriveModelFamily(colB);
    const propulsion = derivePropulsion(colB);

    try {
      await prisma.busCompatibility.upsert({
        where: { busTypeLabel_fleetRangeLabel: { busTypeLabel: colB, fleetRangeLabel: colC } },
        update: { manufacturer, modelFamily, propulsion, fleetRangeStart: start, fleetRangeEnd: end },
        create: {
          busTypeLabel: colB,
          manufacturer,
          modelFamily,
          propulsion,
          fleetRangeStart: start,
          fleetRangeEnd: end,
          fleetRangeLabel: colC,
          sourceSheet: "BUSCat.",
          sourceRow: i + 1,
        },
      });
      imported++;
      console.log(`  ✓ ${colB} [${colC}] — ${manufacturer} / ${modelFamily ?? "?"} / ${propulsion ?? "?"}`);
    } catch (err: any) {
      console.error(`  ✗ Row ${i + 1}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
