/*
  Warnings:

  - The values [AWAITING_PICKUP,IN_TRANSIT,IN_PRODUCTION] on the enum `ReupholsteryBatchStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `locationId` on the `ReupholsteryBatch` table. All the data in the column will be lost.
  - Added the required column `garageId` to the `ReupholsteryBatch` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VendorOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SeatInsertCategory" AS ENUM ('CUSHION', 'BACK');

-- CreateEnum
CREATE TYPE "VendorReceiptStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "SeatOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENDING', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'INSTALLED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'VENDOR_SLA_BREACH';
ALTER TYPE "AlertType" ADD VALUE 'OVERDUE_VENDOR_RETURN';
ALTER TYPE "AlertType" ADD VALUE 'OVERDUE_VENDOR_ORDER';
ALTER TYPE "AlertType" ADD VALUE 'PARTIAL_RECEIPT_PENDING';

-- AlterEnum
BEGIN;
CREATE TYPE "ReupholsteryBatchStatus_new" AS ENUM ('DRAFT', 'PACKED', 'SHIPPED', 'RECEIVED_BY_VENDOR', 'IN_REUPHOLSTERY', 'READY_TO_RETURN', 'RETURNED', 'CLOSED');
ALTER TABLE "ReupholsteryBatch" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ReupholsteryBatch" ALTER COLUMN "status" TYPE "ReupholsteryBatchStatus_new" USING ("status"::text::"ReupholsteryBatchStatus_new");
ALTER TYPE "ReupholsteryBatchStatus" RENAME TO "ReupholsteryBatchStatus_old";
ALTER TYPE "ReupholsteryBatchStatus_new" RENAME TO "ReupholsteryBatchStatus";
DROP TYPE "ReupholsteryBatchStatus_old";
ALTER TABLE "ReupholsteryBatch" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "ReupholsteryBatch" DROP CONSTRAINT "ReupholsteryBatch_locationId_fkey";

-- DropIndex
DROP INDEX "SeatInsert_locationId_idx";

-- AlterTable
ALTER TABLE "CatalogAttachment" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ReupholsteryBatch" DROP COLUMN "locationId",
ADD COLUMN     "garageId" TEXT NOT NULL,
ADD COLUMN     "shippedDate" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "SeatInsert" ADD COLUMN     "seatInsertTypeId" TEXT,
ADD COLUMN     "vendorOrderLineId" TEXT;

-- AlterTable
ALTER TABLE "SeatInsertType" ADD COLUMN     "category" "SeatInsertCategory";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'REUPHOLSTERY_VENDOR';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "seatInsertTypeId" TEXT;

-- CreateTable
CREATE TABLE "BomComponent" (
    "id" TEXT NOT NULL,
    "parentAssemblyId" TEXT NOT NULL,
    "childComponentId" TEXT NOT NULL,
    "requiredQty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BomComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "VendorOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VendorOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "seatInsertTypeId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VendorOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorReceipt" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reupholsteryBatchId" TEXT,
    "vendorOrderId" TEXT,
    "garageId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT NOT NULL,
    "status" "VendorReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GarageEmailProfile" (
    "id" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "replyToEmail" TEXT NOT NULL,
    "signatureHtml" TEXT,
    "harveyToEmail" TEXT NOT NULL,
    "defaultCc" TEXT,
    "defaultBcc" TEXT,
    "providerType" TEXT NOT NULL DEFAULT 'SMTP',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarageEmailProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subjectTemplate" TEXT NOT NULL,
    "bodyHtmlTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundEmail" (
    "id" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "cc" TEXT,
    "bcc" TEXT,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "templateCode" TEXT NOT NULL DEFAULT 'SEAT_ORDER_HARVEY',
    "seatOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAuditEvent" (
    "id" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "message" TEXT,
    "providerResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "garageId" TEXT NOT NULL,
    "status" "SeatOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatOrderLine" (
    "id" TEXT NOT NULL,
    "seatOrderId" TEXT NOT NULL,
    "seatInsertTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "description" TEXT,

    CONSTRAINT "SeatOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatOrderApproval" (
    "id" TEXT NOT NULL,
    "seatOrderId" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatOrderApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatOrderReceipt" (
    "id" TEXT NOT NULL,
    "seatOrderId" TEXT NOT NULL,
    "receivedByUserId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatOrderReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatOrderReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "seatOrderLineId" TEXT NOT NULL,
    "receivedQty" INTEGER NOT NULL,

    CONSTRAINT "SeatOrderReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatOrderAttachment" (
    "id" TEXT NOT NULL,
    "seatOrderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatOrderAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BomComponent_parentAssemblyId_childComponentId_key" ON "BomComponent"("parentAssemblyId", "childComponentId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorOrder_orderNumber_key" ON "VendorOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GarageEmailProfile_garageId_key" ON "GarageEmailProfile"("garageId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_code_key" ON "EmailTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SeatOrder_orderNumber_key" ON "SeatOrder"("orderNumber");

-- AddForeignKey
ALTER TABLE "BomComponent" ADD CONSTRAINT "BomComponent_parentAssemblyId_fkey" FOREIGN KEY ("parentAssemblyId") REFERENCES "SeatInsertType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BomComponent" ADD CONSTRAINT "BomComponent_childComponentId_fkey" FOREIGN KEY ("childComponentId") REFERENCES "SeatInsertType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_seatInsertTypeId_fkey" FOREIGN KEY ("seatInsertTypeId") REFERENCES "SeatInsertType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatInsert" ADD CONSTRAINT "SeatInsert_seatInsertTypeId_fkey" FOREIGN KEY ("seatInsertTypeId") REFERENCES "SeatInsertType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatInsert" ADD CONSTRAINT "SeatInsert_vendorOrderLineId_fkey" FOREIGN KEY ("vendorOrderLineId") REFERENCES "VendorOrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReupholsteryBatch" ADD CONSTRAINT "ReupholsteryBatch_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrder" ADD CONSTRAINT "VendorOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrderLine" ADD CONSTRAINT "VendorOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "VendorOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOrderLine" ADD CONSTRAINT "VendorOrderLine_seatInsertTypeId_fkey" FOREIGN KEY ("seatInsertTypeId") REFERENCES "SeatInsertType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReceipt" ADD CONSTRAINT "VendorReceipt_reupholsteryBatchId_fkey" FOREIGN KEY ("reupholsteryBatchId") REFERENCES "ReupholsteryBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReceipt" ADD CONSTRAINT "VendorReceipt_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "VendorOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReceipt" ADD CONSTRAINT "VendorReceipt_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReceipt" ADD CONSTRAINT "VendorReceipt_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReceipt" ADD CONSTRAINT "VendorReceipt_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageEmailProfile" ADD CONSTRAINT "GarageEmailProfile_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundEmail" ADD CONSTRAINT "OutboundEmail_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundEmail" ADD CONSTRAINT "OutboundEmail_seatOrderId_fkey" FOREIGN KEY ("seatOrderId") REFERENCES "SeatOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAuditEvent" ADD CONSTRAINT "EmailAuditEvent_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "OutboundEmail"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrder" ADD CONSTRAINT "SeatOrder_garageId_fkey" FOREIGN KEY ("garageId") REFERENCES "Garage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrder" ADD CONSTRAINT "SeatOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderLine" ADD CONSTRAINT "SeatOrderLine_seatOrderId_fkey" FOREIGN KEY ("seatOrderId") REFERENCES "SeatOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderLine" ADD CONSTRAINT "SeatOrderLine_seatInsertTypeId_fkey" FOREIGN KEY ("seatInsertTypeId") REFERENCES "SeatInsertType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderApproval" ADD CONSTRAINT "SeatOrderApproval_seatOrderId_fkey" FOREIGN KEY ("seatOrderId") REFERENCES "SeatOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderApproval" ADD CONSTRAINT "SeatOrderApproval_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderReceipt" ADD CONSTRAINT "SeatOrderReceipt_seatOrderId_fkey" FOREIGN KEY ("seatOrderId") REFERENCES "SeatOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderReceipt" ADD CONSTRAINT "SeatOrderReceipt_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderReceiptLine" ADD CONSTRAINT "SeatOrderReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "SeatOrderReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderReceiptLine" ADD CONSTRAINT "SeatOrderReceiptLine_seatOrderLineId_fkey" FOREIGN KEY ("seatOrderLineId") REFERENCES "SeatOrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderAttachment" ADD CONSTRAINT "SeatOrderAttachment_seatOrderId_fkey" FOREIGN KEY ("seatOrderId") REFERENCES "SeatOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatOrderAttachment" ADD CONSTRAINT "SeatOrderAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
