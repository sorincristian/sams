import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const workOrders = await prisma.workOrder.findMany({
    include: { bus: { include: { garage: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(workOrders);
});

router.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: { bus: { include: { garage: true } } }
  });
  if (!wo) return res.status(404).json({ message: "Work order not found" });
  res.json(wo);
});

// Valid status transitions
const TRANSITIONS: Record<string, string[]> = {
  OPEN:          ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS:   ["WAITING_PARTS", "COMPLETED", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED:     [],   // terminal — no further transitions
  CANCELLED:     [],   // terminal — no further transitions
};

router.patch("/:id/status", requireAuth, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "CANCELLED"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid status value" });

  const { status: newStatus } = parsed.data;

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

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status: newStatus },
    include: { bus: { include: { garage: true } } }
  });

  res.json(updated);
});




router.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    busId: z.string(),
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
      garageId: bus.garageId
    },
    include: { bus: { include: { garage: true } } }
  });

  res.status(201).json(created);
});

export default router;
