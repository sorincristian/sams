-- CreateEnum
CREATE TYPE "StockClass" AS ENUM ('REPLACEMENT_AVAILABLE', 'INSTALLED', 'DIRTY_RECOVERY', 'HARVEY_IN_PROGRESS', 'SCRAPPED');

-- CreateEnum
CREATE TYPE "ConditionSource" AS ENUM ('NEW', 'REBUILT');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'INSTALLED', 'RELEASED', 'EXPIRED', 'BLOCKED');

-- AlterTable
ALTER TABLE "SeatInsert" 
  ADD COLUMN "stockClass" "StockClass" NOT NULL DEFAULT 'REPLACEMENT_AVAILABLE',
  ADD COLUMN "conditionSource" "ConditionSource";

-- === Safe SQL Mapping ===
UPDATE "SeatInsert" SET "stockClass" = 'REPLACEMENT_AVAILABLE', "conditionSource" = 'NEW' WHERE "status"::text = 'NEW';
UPDATE "SeatInsert" SET "stockClass" = 'REPLACEMENT_AVAILABLE', "conditionSource" = 'REBUILT' WHERE "status"::text = 'RETURNED_FROM_VENDOR';
UPDATE "SeatInsert" SET "stockClass" = 'INSTALLED' WHERE "status"::text = 'INSTALLED';
UPDATE "SeatInsert" SET "stockClass" = 'DIRTY_RECOVERY' WHERE "status"::text = 'DIRTY';
UPDATE "SeatInsert" SET "stockClass" = 'HARVEY_IN_PROGRESS' WHERE "status"::text IN ('PACKED_FOR_RETURN', 'IN_TRANSIT_TO_VENDOR', 'AT_VENDOR');
UPDATE "SeatInsert" SET "stockClass" = 'SCRAPPED' WHERE "status"::text = 'DISPOSED';

-- CreateTable
CREATE TABLE "ReplacementReservation" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT,
    "busId" TEXT,
    "seatPosition" TEXT,
    "actualInventoryUnitId" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "expiresAt" TIMESTAMP(3),
    "reservedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplacementReservation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReplacementReservation" ADD CONSTRAINT "ReplacementReservation_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementReservation" ADD CONSTRAINT "ReplacementReservation_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementReservation" ADD CONSTRAINT "ReplacementReservation_actualInventoryUnitId_fkey" FOREIGN KEY ("actualInventoryUnitId") REFERENCES "SeatInsert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementReservation" ADD CONSTRAINT "ReplacementReservation_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop Index
DROP INDEX "SeatInsert_status_idx";

-- Drop Column "status"
ALTER TABLE "SeatInsert" DROP COLUMN "status";

-- Create Index
CREATE INDEX "SeatInsert_locationId_stockClass_conditionSource_idx" ON "SeatInsert"("locationId", "stockClass", "conditionSource");

-- DropEnum
DROP TYPE "InventoryStatus";
