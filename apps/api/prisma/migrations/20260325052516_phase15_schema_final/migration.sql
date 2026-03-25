/*
  Warnings:

  - You are about to drop the column `qty` on the `ReupholsteryBatch` table. All the data in the column will be lost.
  - Changed the type of `type` on the `Alert` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('LOW_NEW_INVENTORY', 'HIGH_DIRTY_INVENTORY', 'OVERDUE_REUPHOLSTERY_BATCH', 'DISPOSAL_SPIKE', 'REPLACEMENT_SPIKE', 'INVENTORY_DISCREPANCY');

-- AlterTable
ALTER TABLE "Alert" DROP COLUMN "type",
ADD COLUMN     "type" "AlertType" NOT NULL;

-- AlterTable
ALTER TABLE "DisposalRecord" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReplacementActivity" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ReupholsteryBatch" DROP COLUMN "qty",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "onTimeReturn" BOOLEAN;

-- AlterTable
ALTER TABLE "SeatInsert" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "dirtyAt" TIMESTAMP(3),
ADD COLUMN     "disposedAt" TIMESTAMP(3),
ADD COLUMN     "installedAt" TIMESTAMP(3),
ADD COLUMN     "packedAt" TIMESTAMP(3),
ADD COLUMN     "returnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Alert_type_locationId_status_idx" ON "Alert"("type", "locationId", "status");

-- CreateIndex
CREATE INDEX "DisposalRecord_locationId_disposedAt_idx" ON "DisposalRecord"("locationId", "disposedAt");

-- CreateIndex
CREATE INDEX "ReplacementActivity_locationId_replacedAt_idx" ON "ReplacementActivity"("locationId", "replacedAt");

-- CreateIndex
CREATE INDEX "SeatInsert_status_idx" ON "SeatInsert"("status");

-- CreateIndex
CREATE INDEX "SeatInsert_locationId_idx" ON "SeatInsert"("locationId");

-- CreateIndex
CREATE INDEX "SeatInsert_batchId_idx" ON "SeatInsert"("batchId");
