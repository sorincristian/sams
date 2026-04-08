import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth, AuthRequest } from "../../auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { Prisma } from "@prisma/client";

const router = Router();

router.get("/", requireAuth, requirePermission("inventory", "view"), async (req: AuthRequest, res) => {
  const allowedGarages = req.user?.scope?.garages || [];
  const where: Prisma.InventoryItemWhereInput = {};
  if (req.user?.role !== "SYSTEM_ADMIN") {
    where.garageId = { in: allowedGarages };
  }

  const inventory = await prisma.inventoryItem.findMany({
    where,
    include: { garage: true, seatInsertType: true },
    orderBy: [{ garage: { name: "asc" } }, { seatInsertType: { partNumber: "asc" } }]
  });
  const mapped = inventory.map(item => ({
    ...item,
    quantityOnHand: item.quantityOnHand ?? item.quantity
  }));
  res.json(mapped);
});

router.post("/transaction", requireAuth, requirePermission("inventory", "manage"), async (req: AuthRequest, res) => {
  const schema = z.object({
    inventoryItemId: z.string(),
    type: z.enum(["RECEIVE", "ISSUE", "TRANSFER_OUT", "TRANSFER_IN", "ADJUST_IN", "ADJUST_OUT", "RETURN", "SCRAP"]),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
    referenceType: z.string().optional(),
    referenceId: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request payload" });

  const actorUserId = (req as any).user?.userId;
  if (!actorUserId) {
    return res.status(401).json({ message: "Unauthorized: Missing user identity" });
  }

  if (["TRANSFER_IN", "TRANSFER_OUT"].includes(parsed.data.type)) {
    return res.status(400).json({ message: "Transfer workflows require a two-garage endpoint; use ADJUST for single locations." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current item securely
      const item = await tx.inventoryItem.findUnique({
        where: { id: parsed.data.inventoryItemId },
        include: { seatInsertType: true, garage: true }
      });

      if (!item) throw new Error("Inventory item not found");

      const allowedGarages = req.user?.scope?.garages || [];
      if (req.user?.role !== "SYSTEM_ADMIN" && !allowedGarages.includes(item.garageId)) {
        throw new Error("Forbidden: Attempting to modify stock in a strictly prohibited facility.");
      }

      // 2. Calculate newly requested quantityOnHand
      const isDeduction = ["ISSUE", "TRANSFER_OUT", "ADJUST_OUT", "SCRAP"].includes(parsed.data.type);
      const currentQOH = item.quantityOnHand ?? item.quantity;
      const newQOH = isDeduction ? currentQOH - parsed.data.quantity : currentQOH + parsed.data.quantity;

      // 3. Absolute No-Negative Guardian
      if (newQOH < 0) {
        throw new Error(`Insufficient stock. Cannot deduct ${parsed.data.quantity} when only ${currentQOH} exist.`);
      }

      // 4. Update the actual stock
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantityOnHand: newQOH },
        include: { garage: true, seatInsertType: true }
      });

      // 5. Append to exactly ONE immutable ledger transaction
      const transactionRecord = await tx.inventoryTransaction.create({
        data: {
          seatInsertTypeId: item.seatInsertTypeId,
          garageId: item.garageId,
          quantity: parsed.data.quantity,
          type: parsed.data.type,
          notes: parsed.data.notes,
          referenceType: parsed.data.referenceType,
          referenceId: parsed.data.referenceId,
          performedByUserId: actorUserId
        }
      });

      // 6. Explicit System Audit Log
      await tx.auditLog.create({
        data: {
          action: "INVENTORY_TRANSACTION_EXECUTE",
          entity: "InventoryItem",
          entityId: item.id,
          userId: actorUserId,
          before: { quantityOnHand: currentQOH },
          after: { quantityOnHand: newQOH, transactionId: transactionRecord.id, type: parsed.data.type }
        }
      });

      return { updatedItem, transactionRecord };
    });

    res.json(result);
  } catch (err: any) {
    console.error("TRANSACTION ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to execute transaction" });
  }
});
router.get("/seat-inserts/by-range", requireAuth, requirePermission("inventory", "view"), async (req: AuthRequest, res) => {
  const { garageId, busCompatibilityId } = req.query;
  if (!garageId || !busCompatibilityId) {
    return res.status(400).json({ message: "Missing garageId or busCompatibilityId" });
  }

  // Find all seatInsertTypes attached to this bus compatibility
  const compat = await prisma.busCompatibility.findUnique({
    where: { id: String(busCompatibilityId) },
    include: {
      seatInsertTypes: {
        where: { active: true },
        orderBy: { partNumber: 'asc' }
      }
    }
  });

  if (!compat) return res.status(404).json({ message: "Bus range not found" });

  const partIds = compat.seatInsertTypes.map(s => s.id);

  // Get current inventory levels at localized garage
  const inventoryRecords = await prisma.inventoryItem.findMany({
    where: {
      garageId: String(garageId),
      seatInsertTypeId: { in: partIds }
    }
  });

  // Map to the requested frontend shape
  const items = compat.seatInsertTypes.map(part => {
    const inv = inventoryRecords.find(r => r.seatInsertTypeId === part.id);
    return {
      seatInsertTypeId: part.id,
      partNumber: part.partNumber,
      description: part.description,
      busRangeLabel: compat.fleetRangeLabel,
      currentQty: inv ? inv.quantityOnHand : 0
    };
  });

  res.json(items);
});

router.post("/seat-inserts/intake", requireAuth, requirePermission("inventory", "manage"), async (req: AuthRequest, res) => {
  const schema = z.object({
    garageId: z.string(),
    busCompatibilityId: z.string().nullable().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
      seatInsertTypeId: z.string(),
      quantity: z.number().int().positive() // Automatically rejects <= 0
    })).min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload", errors: parsed.error.errors });

  const actorUserId = (req as any).user?.userId;
  const allowedGarages = req.user?.scope?.garages || [];

  if (req.user?.role !== "SYSTEM_ADMIN" && !allowedGarages.includes(parsed.data.garageId)) {
    return res.status(403).json({ message: "Forbidden: Attempting to modify stock in a strictly prohibited facility." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let addedQty = 0;

      for (const item of parsed.data.items) {
        if (item.quantity <= 0) continue; // Safety guard

        // Upsert the inventory record securely
        await tx.inventoryItem.upsert({
          where: {
            garageId_seatInsertTypeId: {
              garageId: parsed.data.garageId,
              seatInsertTypeId: item.seatInsertTypeId
            }
          },
          create: {
            garageId: parsed.data.garageId,
            seatInsertTypeId: item.seatInsertTypeId,
            quantity: item.quantity,
            quantityOnHand: item.quantity
          },
          update: {
            quantity: { increment: item.quantity },
            quantityOnHand: { increment: item.quantity }
          }
        });

        // Write strict audit-safe ledger transaction
        await tx.inventoryTransaction.create({
          data: {
            seatInsertTypeId: item.seatInsertTypeId,
            garageId: parsed.data.garageId,
            quantity: item.quantity,
            type: "RECEIVE", // Strict instruction adherence
            notes: parsed.data.notes || undefined,
            referenceType: "INTAKE_BULK",
            referenceId: parsed.data.busCompatibilityId || undefined, // store context
            performedByUserId: actorUserId
          }
        });

        createdCount++;
        addedQty += item.quantity;
      }
      return { success: true, processedItems: createdCount, totalAdded: addedQty };
    });

    res.json(result);
  } catch (err: any) {
    console.error("INTAKE ERROR:", err);
    res.status(500).json({ message: "Fatal transaction error during bulk intake." });
  }
});

router.get("/transactions", requireAuth, requirePermission("inventory", "view"), async (req: AuthRequest, res) => {
  const { referenceId } = req.query;
  const allowedGarages = req.user?.scope?.garages || [];
  
  const where: Prisma.InventoryTransactionWhereInput = {};
  if (req.user?.role !== "SYSTEM_ADMIN") {
    where.garageId = { in: allowedGarages };
  }

  if (referenceId) {
    where.referenceId = String(referenceId);
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      garage: true,
      seatInsertType: true,
      performedByUser: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  res.json(transactions);
});

export default router;
