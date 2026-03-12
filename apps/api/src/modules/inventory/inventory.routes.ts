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
  res.json(inventory);
});

router.post("/adjust", requireAuth, async (req, res) => {
  const schema = z.object({
    inventoryItemId: z.string(),
    quantityOnHand: z.number().int().min(0)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid request" });

  const updated = await prisma.inventoryItem.update({
    where: { id: parsed.data.inventoryItemId },
    data: { quantityOnHand: parsed.data.quantityOnHand },
    include: { garage: true, seatInsertType: true }
  });

  res.json(updated);
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
