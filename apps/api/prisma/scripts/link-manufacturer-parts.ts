/**
 * link-manufacturer-parts.ts
 * Links manually-created catalog parts (PRT-BASE, BYD-BASE) to their
 * BusCompatibility rows and CatalogAttachment records.
 *
 * These parts were not in the Seats spreadsheet, so import-seat-catalog.ts
 * did not link them. This script does it explicitly by partNumber.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx prisma/scripts/link-manufacturer-parts.ts
 */
import { createRequire } from "module";
createRequire(import.meta.url); // ensure ESM compat
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Explicit part → compat mappings (partNumber, busTypeLabel, fleetRangeLabel)
const PART_COMPAT_LINKS = [
  {
    partNumber: "PRT-BASE",
    busTypeLabel: "Proterra Electric Bus",
    fleetRangeLabel: "3725-3749",
  },
  {
    partNumber: "BYD-BASE",
    busTypeLabel: "BYD Bus",
    fleetRangeLabel: "3750-3759",
  },
];

async function main() {
  console.log("=== Linking manufacturer parts to BusCompatibility ===\n");

  for (const link of PART_COMPAT_LINKS) {
    const part = await prisma.seatInsertType.findUnique({
      where: { partNumber: link.partNumber },
    });

    if (!part) {
      console.log(`  ! Part not found: ${link.partNumber} — skipping`);
      continue;
    }

    const compat = await prisma.busCompatibility.findUnique({
      where: {
        busTypeLabel_fleetRangeLabel: {
          busTypeLabel: link.busTypeLabel,
          fleetRangeLabel: link.fleetRangeLabel,
        },
      },
    });

    if (!compat) {
      console.log(`  ! BusCompatibility not found: ${link.busTypeLabel} [${link.fleetRangeLabel}] — skipping`);
      continue;
    }

    // 1. Connect part to compat via many-to-many
    await prisma.seatInsertType.update({
      where: { id: part.id },
      data: { busCompatibilities: { connect: { id: compat.id } } },
    });
    console.log(`  ✓ Linked ${link.partNumber} → ${link.busTypeLabel} [${link.fleetRangeLabel}]`);

    // 2. Update CatalogAttachment: set seatInsertTypeId on the matching attachment
    const attachments = await prisma.catalogAttachment.findMany({
      where: { busCompatibilityId: compat.id },
    });

    for (const att of attachments) {
      await prisma.catalogAttachment.update({
        where: { id: att.id },
        data: { seatInsertTypeId: part.id },
      });
      console.log(`  ✓ Attachment "${att.fileName}" → seatInsertTypeId = ${link.partNumber}`);
    }

    if (attachments.length === 0) {
      console.log(`  ! No CatalogAttachment found linked to ${link.busTypeLabel} [${link.fleetRangeLabel}]`);
    }
  }

  console.log("\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
