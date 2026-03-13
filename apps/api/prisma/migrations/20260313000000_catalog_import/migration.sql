-- AlterTable: add new nullable columns to SeatInsertType
ALTER TABLE "SeatInsertType" ADD COLUMN IF NOT EXISTS "manufacturerPartNumber" TEXT;
ALTER TABLE "SeatInsertType" ADD COLUMN IF NOT EXISTS "alternatePartNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SeatInsertType" ADD COLUMN IF NOT EXISTS "componentType" TEXT;
ALTER TABLE "SeatInsertType" ADD COLUMN IF NOT EXISTS "trimSpec" TEXT;

-- CreateTable: BusCompatibility
CREATE TABLE IF NOT EXISTS "BusCompatibility" (
    "id" TEXT NOT NULL,
    "busTypeLabel" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "modelFamily" TEXT,
    "propulsion" TEXT,
    "fleetRangeStart" INTEGER,
    "fleetRangeEnd" INTEGER,
    "fleetRangeLabel" TEXT NOT NULL,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique busTypeLabel + fleetRangeLabel
CREATE UNIQUE INDEX IF NOT EXISTS "BusCompatibility_busTypeLabel_fleetRangeLabel_key"
    ON "BusCompatibility"("busTypeLabel", "fleetRangeLabel");

-- CreateTable: CatalogAttachment
CREATE TABLE IF NOT EXISTS "CatalogAttachment" (
    "id" TEXT NOT NULL,
    "seatInsertTypeId" TEXT,
    "busCompatibilityId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "attachmentType" TEXT NOT NULL,
    "urlOrPath" TEXT NOT NULL,
    "busTypeLabel" TEXT,
    "fleetRangeLabel" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: CatalogAttachment -> SeatInsertType
ALTER TABLE "CatalogAttachment"
    ADD CONSTRAINT "CatalogAttachment_seatInsertTypeId_fkey"
    FOREIGN KEY ("seatInsertTypeId")
    REFERENCES "SeatInsertType"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: CatalogAttachment -> BusCompatibility
ALTER TABLE "CatalogAttachment"
    ADD CONSTRAINT "CatalogAttachment_busCompatibilityId_fkey"
    FOREIGN KEY ("busCompatibilityId")
    REFERENCES "BusCompatibility"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: many-to-many join for SeatInsertType <-> BusCompatibility
CREATE TABLE IF NOT EXISTS "_SeatInsertBusCompat" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_SeatInsertBusCompat_AB_unique"
    ON "_SeatInsertBusCompat"("A", "B");

CREATE INDEX IF NOT EXISTS "_SeatInsertBusCompat_B_index"
    ON "_SeatInsertBusCompat"("B");

ALTER TABLE "_SeatInsertBusCompat"
    ADD CONSTRAINT "_SeatInsertBusCompat_A_fkey"
    FOREIGN KEY ("A") REFERENCES "BusCompatibility"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_SeatInsertBusCompat"
    ADD CONSTRAINT "_SeatInsertBusCompat_B_fkey"
    FOREIGN KEY ("B") REFERENCES "SeatInsertType"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
