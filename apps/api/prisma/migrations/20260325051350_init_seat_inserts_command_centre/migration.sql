/*
  Warnings:

  - Added the required column `updatedAt` to the `Vendor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('NEW', 'DIRTY', 'PACKED_FOR_RETURN', 'RETURNED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "ReupholsteryBatchStatus" AS ENUM ('AWAITING_PICKUP', 'IN_TRANSIT', 'IN_PRODUCTION', 'RETURNED');

-- CreateEnum
CREATE TYPE "RecordReason" AS ENUM ('TORN', 'GRAFFITI', 'FOAM_DAMAGE', 'HARDWARE_DAMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- AlterTable
ALTER TABLE "Garage" ADD COLUMN     "thresholdDirtyInventory" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "thresholdNewInventory" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "SeatInsert" (
    "id" TEXT NOT NULL,
    "seatType" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "hardwareCode" TEXT NOT NULL,
    "fleetType" TEXT NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'NEW',
    "locationId" TEXT NOT NULL,
    "batchId" TEXT,
    "installedBusId" TEXT,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatInsert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReupholsteryBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "seatType" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "packedDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3) NOT NULL,
    "actualReturnDate" TIMESTAMP(3),
    "status" "ReupholsteryBatchStatus" NOT NULL DEFAULT 'AWAITING_PICKUP',
    "trackingNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReupholsteryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReplacementActivity" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT,
    "busId" TEXT,
    "locationId" TEXT NOT NULL,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" "RecordReason" NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReplacementActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalRecord" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT,
    "locationId" TEXT NOT NULL,
    "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" "RecordReason" NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisposalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locationId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReupholsteryBatch_batchNumber_key" ON "ReupholsteryBatch"("batchNumber");

-- AddForeignKey
ALTER TABLE "SeatInsert" ADD CONSTRAINT "SeatInsert_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatInsert" ADD CONSTRAINT "SeatInsert_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ReupholsteryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatInsert" ADD CONSTRAINT "SeatInsert_installedBusId_fkey" FOREIGN KEY ("installedBusId") REFERENCES "Bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReupholsteryBatch" ADD CONSTRAINT "ReupholsteryBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReupholsteryBatch" ADD CONSTRAINT "ReupholsteryBatch_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementActivity" ADD CONSTRAINT "ReplacementActivity_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "SeatInsert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementActivity" ADD CONSTRAINT "ReplacementActivity_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementActivity" ADD CONSTRAINT "ReplacementActivity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplacementActivity" ADD CONSTRAINT "ReplacementActivity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRecord" ADD CONSTRAINT "DisposalRecord_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "SeatInsert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRecord" ADD CONSTRAINT "DisposalRecord_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRecord" ADD CONSTRAINT "DisposalRecord_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Garage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
