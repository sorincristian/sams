-- Create a temporary table to rank Duplicate Garages
CREATE TEMP TABLE ranked_garages AS
SELECT 
    id, 
    LOWER(TRIM(name)) as "norm_name",
    ROW_NUMBER() OVER(
        PARTITION BY LOWER(TRIM(name)) 
        ORDER BY 
            (SELECT COUNT(*) FROM "Bus" WHERE "garageId" = "Garage".id) +
            (SELECT COUNT(*) FROM "User" WHERE "garageId" = "Garage".id) +
            (SELECT COUNT(*) FROM "WorkOrder" WHERE "garageId" = "Garage".id) +
            (SELECT COUNT(*) FROM "InventoryItem" WHERE "garageId" = "Garage".id) +
            (SELECT COUNT(*) FROM "InventoryTransaction" WHERE "garageId" = "Garage".id) +
            (SELECT COUNT(*) FROM "WorkOrderPartUsage" WHERE "garageId" = "Garage".id) DESC, 
            "createdAt" ASC
    ) as rank
FROM "Garage";

-- Extract mapping of loser IDs to their single keeper ID
CREATE TEMP TABLE garage_merges AS
SELECT 
    l.id AS loser_id, 
    k.id AS keeper_id 
FROM ranked_garages l
JOIN ranked_garages k ON l.norm_name = k.norm_name AND k.rank = 1
WHERE l.rank > 1;

-- 1. Reassign 1-to-many foreign keys
UPDATE "Bus" 
SET "garageId" = m.keeper_id 
FROM garage_merges m 
WHERE "Bus"."garageId" = m.loser_id;

UPDATE "User" 
SET "garageId" = m.keeper_id 
FROM garage_merges m 
WHERE "User"."garageId" = m.loser_id;

UPDATE "WorkOrder" 
SET "garageId" = m.keeper_id 
FROM garage_merges m 
WHERE "WorkOrder"."garageId" = m.loser_id;

UPDATE "InventoryTransaction" 
SET "garageId" = m.keeper_id 
FROM garage_merges m 
WHERE "InventoryTransaction"."garageId" = m.loser_id;

UPDATE "WorkOrderPartUsage" 
SET "garageId" = m.keeper_id 
FROM garage_merges m 
WHERE "WorkOrderPartUsage"."garageId" = m.loser_id;

-- 2. Merge InventoryItems gracefully (avoiding Uniqueness crashes if both garages share a part)
UPDATE "InventoryItem" keeper_item
SET 
  "quantity" = keeper_item."quantity" + loser_item."quantity",
  "quantityOnHand" = keeper_item."quantityOnHand" + loser_item."quantityOnHand",
  "quantityReserved" = keeper_item."quantityReserved" + loser_item."quantityReserved"
FROM "InventoryItem" loser_item
JOIN garage_merges m ON loser_item."garageId" = m.loser_id
WHERE keeper_item."garageId" = m.keeper_id 
  AND keeper_item."seatInsertTypeId" = loser_item."seatInsertTypeId";

-- Delete the loser InventoryItems that were successfully merged into keeper quantities
DELETE FROM "InventoryItem"
WHERE "garageId" IN (SELECT loser_id FROM garage_merges)
  AND "seatInsertTypeId" IN (
    SELECT "seatInsertTypeId" FROM "InventoryItem" WHERE "garageId" IN (SELECT keeper_id FROM garage_merges)
  );

-- Update completely orphaned loser InventoryItems to point at the keeper's ID directly
UPDATE "InventoryItem" 
SET "garageId" = m.keeper_id 
FROM garage_merges m 
WHERE "InventoryItem"."garageId" = m.loser_id;

-- 3. Safely Delete the Empty Duplicate Garages
DELETE FROM "Garage" WHERE id IN (SELECT loser_id FROM garage_merges);

-- Cleanup
DROP TABLE garage_merges;
DROP TABLE ranked_garages;

-- Now, it is strictly safe to enforce database-level Uniqueness on Name
CREATE UNIQUE INDEX IF NOT EXISTS "Garage_name_key" ON "Garage"("name");
