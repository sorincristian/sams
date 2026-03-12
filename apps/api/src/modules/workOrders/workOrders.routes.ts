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
