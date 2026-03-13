import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();

// GET /api/catalog — list all seat insert types
router.get("/", requireAuth, async (req, res) => {
  const parts = await prisma.seatInsertType.findMany({
    orderBy: { partNumber: "asc" }
  });
  res.json(parts);
});

// POST /api/catalog — create new seat insert type
router.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    partNumber:          z.string().min(1),
    description:         z.string().min(1),
    vendor:              z.string().optional().default(""),
    compatibleBusModels: z.string().optional().default(""),
    minStockLevel:       z.number().int().min(0).default(0),
    reorderPoint:        z.number().int().min(0).default(0),
    unitCost:            z.number().min(0).default(0),
    active:              z.boolean().default(true),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
  }

  const { data } = parsed;

  // Check unique partNumber
  const existing = await prisma.seatInsertType.findFirst({ where: { partNumber: data.partNumber } });
  if (existing) {
    return res.status(409).json({ message: `Part number "${data.partNumber}" already exists.` });
  }

  const created = await prisma.seatInsertType.create({ data });
  res.status(201).json(created);
});

// PUT /api/catalog/:id — update seat insert type
router.put("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;

  const schema = z.object({
    partNumber:          z.string().min(1).optional(),
    description:         z.string().min(1).optional(),
    vendor:              z.string().optional(),
    compatibleBusModels: z.string().optional(),
    minStockLevel:       z.number().int().min(0).optional(),
    reorderPoint:        z.number().int().min(0).optional(),
    unitCost:            z.number().min(0).optional(),
    active:              z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
  }

  const existing = await prisma.seatInsertType.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Part not found" });

  // Check partNumber uniqueness if changing it
  if (parsed.data.partNumber && parsed.data.partNumber !== existing.partNumber) {
    const conflict = await prisma.seatInsertType.findFirst({ where: { partNumber: parsed.data.partNumber } });
    if (conflict) {
      return res.status(409).json({ message: `Part number "${parsed.data.partNumber}" already exists.` });
    }
  }

  const updated = await prisma.seatInsertType.update({ where: { id }, data: parsed.data });
  res.json(updated);
});

export default router;
