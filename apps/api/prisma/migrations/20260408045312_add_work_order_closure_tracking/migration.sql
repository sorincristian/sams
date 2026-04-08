-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedNotes" TEXT;
