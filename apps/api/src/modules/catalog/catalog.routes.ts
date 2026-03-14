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

// GET /api/catalog/bus-compat — list all bus compatibility rows
// NOTE: must be defined before /:id to avoid route shadowing
router.get("/bus-compat", requireAuth, async (req, res) => {
  const rows = await prisma.busCompatibility.findMany({
    orderBy: [{ manufacturer: "asc" }, { fleetRangeStart: "asc" }],
    include: { attachments: true, seatInsertTypes: { select: { id: true, partNumber: true, description: true } } }
  });
  res.json(rows);
});

// GET /api/catalog/:id/detail — full detail: part + compat rows + attachments
router.get("/:id/detail", requireAuth, async (req, res) => {
  const { id } = req.params;
  const part = await prisma.seatInsertType.findUnique({
    where: { id },
    include: {
      busCompatibilities: {
        include: { attachments: true }
      },
      catalogAttachments: true,
    }
  });
  if (!part) return res.status(404).json({ message: "Part not found" });
  res.json(part);
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

// ─── Hotspot endpoints ────────────────────────────────────────────────────────

const hotspotSchema = z.object({
  seatLabel:       z.string().min(1),
  partNumber:      z.string().min(1),
  seatInsertTypeId: z.string().optional().nullable(),
  x:               z.number().min(0).max(1),
  y:               z.number().min(0).max(1),
  width:           z.number().min(0.001).max(1),
  height:          z.number().min(0.001).max(1),
  shape:           z.string().default("rect"),
  notes:           z.string().optional().nullable(),
});

// GET /api/catalog/attachments/:id/hotspots
router.get("/attachments/:id/hotspots", requireAuth, async (req, res) => {
  const { id } = req.params;
  const hotspots = await prisma.diagramHotspot.findMany({
    where: { catalogAttachmentId: id },
    include: {
      seatInsertType: {
        select: { id: true, partNumber: true, description: true, vendor: true, componentType: true }
      }
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(hotspots);
});

// POST /api/catalog/attachments/:id/hotspots
router.post("/attachments/:id/hotspots", requireAuth, async (req, res) => {
  const { id } = req.params;
  const attachment = await prisma.catalogAttachment.findUnique({ where: { id } });
  if (!attachment) return res.status(404).json({ message: "Attachment not found" });

  const parsed = hotspotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });

  const hotspot = await prisma.diagramHotspot.create({
    data: { ...parsed.data, catalogAttachmentId: id },
    include: { seatInsertType: { select: { id: true, partNumber: true, description: true, vendor: true, componentType: true } } },
  });
  res.status(201).json(hotspot);
});

// PUT /api/catalog/hotspots/:hid
router.put("/hotspots/:hid", requireAuth, async (req, res) => {
  const { hid } = req.params;
  const existing = await prisma.diagramHotspot.findUnique({ where: { id: hid } });
  if (!existing) return res.status(404).json({ message: "Hotspot not found" });

  const parsed = hotspotSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });

  const hotspot = await prisma.diagramHotspot.update({
    where: { id: hid },
    data: parsed.data,
    include: { seatInsertType: { select: { id: true, partNumber: true, description: true, vendor: true, componentType: true } } },
  });
  res.json(hotspot);
});

// DELETE /api/catalog/hotspots/:hid
router.delete("/hotspots/:hid", requireAuth, async (req, res) => {
  const { hid } = req.params;
  const existing = await prisma.diagramHotspot.findUnique({ where: { id: hid } });
  if (!existing) return res.status(404).json({ message: "Hotspot not found" });
  await prisma.diagramHotspot.delete({ where: { id: hid } });
  res.status(204).end();
});

export default router;

