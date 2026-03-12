import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const inventory = await prisma.inventoryItem.findMany({
    include: { garage: true, seatInsertType: true },
    orderBy: [{ garage: { name: "asc" } }, { seatInsertType: { partNumber: "asc" } }]
  });
  const mapped = inventory.map(item => ({
    ...item,
    quantityOnHand: item.quantityOnHand ?? item.quantity
  }));
  res.json(mapped);
});

router.post("/transaction", requireAuth, async (req, res) => {
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current item securely
      const item = await tx.inventoryItem.findUnique({
        where: { id: parsed.data.inventoryItemId },
        include: { seatInsertType: true, garage: true }
      });

      if (!item) throw new Error("Inventory item not found");

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
          // Extract authenticated User ID attached directly via JWT (requires valid JWT auth middleware payload)
          // For transition safety if req.user is dynamically missing, fallback to explicit UI payload injection (must fix frontend payload properly next) -> Fallback injected explicitly per TS types.
          performedByUserId: (req as any).user?.userId || "UNKNOWN_USER_ID" // Ideally sourced from `req.user.id` upon JWT unpacking
        }
      });

      // 6. Explicit System Audit Log
      await tx.auditLog.create({
        data: {
          action: "INVENTORY_TRANSACTION_EXECUTE",
          entity: "InventoryItem",
          entityId: item.id,
          userId: (req as any).user?.userId || "UNKNOWN_USER_ID",
          before: { quantityOnHand: currentQOH },
          after: { quantityOnHand: newQOH, transactionId: transactionRecord.id, type: parsed.data.type }
        }
      });

      return updatedItem;
    });

    res.json(result);
  } catch (err: any) {
    console.error("TRANSACTION ERROR:", err);
    res.status(400).json({ message: err.message || "Failed to execute transaction" });
  }
});

router.get("/transactions", requireAuth, async (req, res) => {
  const transactions = await prisma.inventoryTransaction.findMany({
    include: {
      garage: true,
      seatInsertType: true,
      performedByUser: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json(transactions);
});

export default router;
