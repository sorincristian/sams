import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const firstString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const workOrders = await prisma.workOrder.findMany({
    include: {
      bus: { include: { garage: true } },
      seatInsertType: { select: { id: true, partNumber: true, description: true } },
      closedByUser: { select: { name: true } },
      installedByUser: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json(workOrders);
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      bus: { include: { garage: true } },
      seatInsertType: { select: { id: true, partNumber: true, description: true } },
      closedByUser: { select: { name: true } },
      installedByUser: { select: { name: true } }
    }
  });
  if (!wo) return res.status(404).json({ message: "Work order not found" });
  res.json(wo);
});

// Valid status transitions
const TRANSITIONS: Record<string, string[]> = {
  OPEN:          ["IN_PROGRESS", "CANCELLED", "CLOSED"],
  IN_PROGRESS:   ["WAITING_PARTS", "COMPLETED", "CANCELLED", "CLOSED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED", "CLOSED"],
  COMPLETED:     [],   // terminal — no further transitions
  CANCELLED:     [],   // terminal — no further transitions
  CLOSED:        [],   // terminal — no further transitions
};

router.patch("/:id/status", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const schema = z.object({ 
    status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "CANCELLED", "CLOSED"]),
    closedNotes: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status value" });

  const { status: newStatus, closedNotes } = parsed.data;

  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) return res.status(404).json({ message: "Work order not found" });

  const allowed = TRANSITIONS[wo.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return res.status(409).json({
      message: `Cannot transition from ${wo.status} to ${newStatus}.`
    });
  }

  // If cancelling — release any reserved quantities (defensive no-op if not tracked)
  if (newStatus === "CANCELLED") {
    // Log a note — actual inventory reservation release would happen here
    // if quantityReserved is managed. Emit an ADJUST_IN for each ISSUE on this WO.
    const issued = await prisma.inventoryTransaction.findMany({
      where: { referenceId: id, type: "ISSUE" }
    });
    // Release reservations by creating RETURN transactions
    for (const tx of issued) {
      await prisma.inventoryTransaction.create({
        data: {
          type: "RETURN",
          quantity: tx.quantity,
          notes: `Auto-released on WO ${wo.workOrderNumber} cancellation`,
          referenceType: "WORK_ORDER",
          referenceId: id,
          seatInsertTypeId: tx.seatInsertTypeId,
          garageId: tx.garageId,
          performedByUserId: tx.performedByUserId,
        }
      });
      // Restore quantityOnHand
      await prisma.inventoryItem.updateMany({
        where: { seatInsertTypeId: tx.seatInsertTypeId, garageId: tx.garageId },
        data: { quantityOnHand: { increment: tx.quantity } }
      });
    }
  }

  const updateData: any = { status: newStatus };
  if (newStatus === "CLOSED") {
    updateData.closedAt = new Date();
    updateData.closedByUserId = (req as any).user?.id || (req as any).user?.userId || "system";
    if (closedNotes) updateData.closedNotes = closedNotes;
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: updateData,
    include: { bus: { include: { garage: true } } }
  });

  res.json(updated);
});




router.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    busId: z.string(),
    seatInsertTypeId: z.string().optional(),
    issueDescription: z.string().min(3),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM")
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

  const bus = await prisma.bus.findUnique({ where: { id: parsed.data.busId } });
  if (!bus) return res.status(404).json({ message: "Bus not found" });

  const count = await prisma.workOrder.count();
  const created = await prisma.workOrder.create({
    data: {
      workOrderNumber: `WO-${1000 + count + 1}`,
      issueDescription: parsed.data.issueDescription,
      priority: parsed.data.priority,
      busId: bus.id,
      garageId: bus.garageId,
      seatInsertTypeId: parsed.data.seatInsertTypeId || null
    },
    include: {
      bus: { include: { garage: true } },
      seatInsertType: { select: { id: true, partNumber: true, description: true } },
      closedByUser: { select: { name: true } },
      installedByUser: { select: { name: true } }
    }
  });

  res.status(201).json(created);
});

router.post("/:id/items", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  
  const schema = z.object({
    seatInsertTypeId: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
    notes: z.string().optional().nullable()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

  const wo = await prisma.workOrder.findUnique({ where: { id } });
  if (!wo) return res.status(404).json({ message: "Work order not found" });

  const { seatInsertTypeId, quantity, notes } = parsed.data;

  // Verify the part exists
  const part = await prisma.seatInsertType.findUnique({ where: { id: seatInsertTypeId } });
  if (!part) return res.status(404).json({ message: "Part not found" });

  const usage = await prisma.workOrderPartUsage.create({
    data: {
      workOrderId: wo.id,
      seatInsertTypeId: part.id,
      garageId: wo.garageId,
      quantity,
      notes,
      // Since it's requested by the technician via mobile/hotspot, we assign them as the issuer.
      // Usually full inventory ISSUE would be a separate InventoryTransaction binding.
      issuedByUserId: (req as any).user!.userId
    }
  });

  res.status(201).json(usage);
});

export default router;
