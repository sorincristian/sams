-- Migration: Add busCompatibilityId to Bus
-- Created: 2026-03-15

ALTER TABLE "Bus" ADD COLUMN IF NOT EXISTS "busCompatibilityId" TEXT;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Bus_busCompatibilityId_fkey'
    ) THEN
        ALTER TABLE "Bus" 
        ADD CONSTRAINT "Bus_busCompatibilityId_fkey" 
        FOREIGN KEY ("busCompatibilityId") REFERENCES "BusCompatibility"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
