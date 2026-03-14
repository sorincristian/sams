-- Migration: add DiagramHotspot table and previewImageUrl to CatalogAttachment
-- Created: 2026-03-14

ALTER TABLE "CatalogAttachment" ADD COLUMN IF NOT EXISTS "previewImageUrl" TEXT;

CREATE TABLE IF NOT EXISTS "DiagramHotspot" (
    "id"                  TEXT NOT NULL,
    "catalogAttachmentId" TEXT NOT NULL,
    "seatLabel"           TEXT NOT NULL,
    "partNumber"          TEXT NOT NULL,
    "seatInsertTypeId"    TEXT,
    "x"                   DOUBLE PRECISION NOT NULL,
    "y"                   DOUBLE PRECISION NOT NULL,
    "width"               DOUBLE PRECISION NOT NULL,
    "height"              DOUBLE PRECISION NOT NULL,
    "shape"               TEXT NOT NULL DEFAULT 'rect',
    "notes"               TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramHotspot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DiagramHotspot_catalogAttachmentId_fkey"
        FOREIGN KEY ("catalogAttachmentId")
        REFERENCES "CatalogAttachment"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiagramHotspot_seatInsertTypeId_fkey"
        FOREIGN KEY ("seatInsertTypeId")
        REFERENCES "SeatInsertType"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);
