-- AlterTable: SeatInsertType
ALTER TABLE "SeatInsertType" ADD COLUMN "compatibleBusModels" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SeatInsertType" ADD COLUMN "reorderPoint" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SeatInsertType" ADD COLUMN "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SeatInsertType" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIVE', 'ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUST_IN', 'ADJUST_OUT', 'RETURN', 'SCRAP');

-- Notice: SeatInsertType already has updatedAt in the database from init, skipping duplicate ADD COLUMN.

-- AlterTable: InventoryItem
-- 1. Add nullable quantityOnHand first for additive safe migration
ALTER TABLE "InventoryItem" ADD COLUMN "quantityOnHand" INTEGER;
ALTER TABLE "InventoryItem" ADD COLUMN "quantityReserved" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InventoryItem" ADD COLUMN "binLocation" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "InventoryItem" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- 2. Backfill existing quantity to quantityOnHand securely
UPDATE "InventoryItem" SET "quantityOnHand" = "quantity";
UPDATE "InventoryItem" SET "updatedAt" = CURRENT_TIMESTAMP;

-- 3. Enforce not null and default constraints
ALTER TABLE "InventoryItem" ALTER COLUMN "quantityOnHand" SET NOT NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "quantityOnHand" SET DEFAULT 0;
ALTER TABLE "InventoryItem" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 4. Old "quantity" column remains untouched for complete backwards compatibility fallback

-- CreateTable: InventoryTransaction
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "seatInsertTypeId" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "notes" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WorkOrderPartUsage
CREATE TABLE "WorkOrderPartUsage" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "seatInsertTypeId" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "issuedByUserId" TEXT NOT NULL,
    "inventoryTransactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderPartUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "WorkOrderPartUsage_inventoryTransactionId_key" ON "WorkOrderPartUsage"("inventoryTransactionId");

-- AddForeignKeys: InventoryTransaction
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_seatInsertTypeId_fkey" FOREIGN KEY ("seatInsertTypeId") REFERENCES "SeatInsertType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKeys: WorkOrderPartUsage
ALTER TABLE "WorkOrderPartUsage" ADD CONSTRAINT "WorkOrderPartUsage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderPartUsage" ADD CONSTRAINT "WorkOrderPartUsage_seatInsertTypeId_fkey" FOREIGN KEY ("seatInsertTypeId") REFERENCES "SeatInsertType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderPartUsage" ADD CONSTRAINT "WorkOrderPartUsage_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderPartUsage" ADD CONSTRAINT "WorkOrderPartUsage_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrderPartUsage" ADD CONSTRAINT "WorkOrderPartUsage_inventoryTransactionId_fkey" FOREIGN KEY ("inventoryTransactionId") REFERENCES "InventoryTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKeys: AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FUTURE PHASES STUBS
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");

CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);
