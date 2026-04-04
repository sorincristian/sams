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

// GET /api/catalog — list all seat insert types
router.get("/", requireAuth, async (req, res) => {
  const parts = await prisma.seatInsertType.findMany({
    orderBy: { partNumber: "asc" },
    include: {
      _count: {
        select: { catalogAttachments: { where: { attachmentType: "DIAGRAM" } } }
      },
      catalogAttachments: {
        where: { attachmentType: "DIAGRAM" },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { id: true, previewImageUrl: true, urlOrPath: true, isPrimary: true, attachmentType: true }
      },
      busCompatibilities: { select: { fleetRangeLabel: true } },
      usedInAssemblies: {
        include: {
          parentAssembly: {
            include: { busCompatibilities: { select: { fleetRangeLabel: true } } }
          }
        }
      }
    }
  });

  const mapped = parts.map(p => {
    const directRanges = p.busCompatibilities.map(b => b.fleetRangeLabel);
    const parentRanges = p.usedInAssemblies.flatMap(u => 
      u.parentAssembly.busCompatibilities.map(b => b.fleetRangeLabel)
    );
    const busRanges = Array.from(new Set([...directRanges, ...parentRanges].filter(Boolean)));

    const { unitCost, usedInAssemblies, busCompatibilities, ...safePart } = p as any;
    safePart.busRanges = busRanges;
    return safePart;
  });

  res.json(mapped);
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
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const part = await prisma.seatInsertType.findUnique({
    where: { id },
    include: {
      busCompatibilities: {
        include: { attachments: true }
      },
      catalogAttachments: true,
      components: {
        include: {
          childComponent: true
        },
        orderBy: {
          childComponent: { partNumber: 'asc' }
        }
      }
    }
  });
  if (!part) return res.status(404).json({ message: "Part not found" });

  let safePart = { ...part } as any;

  if (safePart.componentType === "TEMPLATE") {
    delete safePart.unitCost;
  }

  // Derive busRanges for child mapping
  const busRanges = Array.from(new Set(safePart.busCompatibilities?.map((b: any) => b.fleetRangeLabel).filter(Boolean) || []));
  if (safePart.componentType === "TEMPLATE") {
    safePart.busRanges = busRanges;
  }

  if (safePart.components) {
    safePart.components = safePart.components.map((c: any) => {
      if (c.childComponent) {
        delete c.childComponent.unitCost;
        if (safePart.componentType === "TEMPLATE") {
          c.childComponent.busRanges = busRanges;
        }
      }
      return c;
    });
  }

  res.json(safePart);
});



// POST /api/catalog — create new seat insert type
router.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    partNumber:          z.string().min(1),
    description:         z.string().min(1),
    vendor:              z.string().optional().default(""),
    compatibleBusModels: z.array(z.string()).default([]),
    minStockLevel:       z.number().int().min(0).default(0),
    reorderPoint:        z.number().int().min(0).default(0),
    unitCost:            z.number().min(0).default(0),
    active:              z.boolean().default(true),
  });

  const bodyData = { 
    ...req.body,
    compatibleBusModels: Array.isArray(req.body.compatibleBusModels)
      ? req.body.compatibleBusModels
      : req.body.compatibleBusModels ? [req.body.compatibleBusModels] : []
  };

  const parsed = schema.safeParse(bodyData);
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
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const schema = z.object({
    partNumber:          z.string().min(1).optional(),
    description:         z.string().min(1).optional(),
    vendor:              z.string().optional(),
    compatibleBusModels: z.array(z.string()).optional(),
    minStockLevel:       z.number().int().min(0).optional(),
    reorderPoint:        z.number().int().min(0).optional(),
    unitCost:            z.number().min(0).optional(),
    active:              z.boolean().optional(),
  });

  const bodyData = { ...req.body };
  if (bodyData.compatibleBusModels !== undefined) {
    bodyData.compatibleBusModels = Array.isArray(bodyData.compatibleBusModels)
      ? bodyData.compatibleBusModels
      : bodyData.compatibleBusModels ? [bodyData.compatibleBusModels] : [];
  }

  const parsed = schema.safeParse(bodyData);
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

// ─── Attachment endpoints ────────────────────────────────────────────────────────

// GET /api/catalog/:id/attachments
router.get("/:id/attachments", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const attachments = await prisma.catalogAttachment.findMany({
    where: { seatInsertTypeId: id },
    orderBy: { createdAt: "desc" }
  });

  const base = `${req.protocol}://${req.get("host")}`;
  const formatted = attachments.map(a => {
    const updated: any = { ...a };
    if (updated.urlOrPath?.startsWith("/uploads/")) {
      updated.url = `${base}${updated.urlOrPath}`;
    }
    return updated;
  });

  res.json(formatted);
});

const attachmentSchema = z.object({
  attachmentType: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  urlOrPath: z.string().min(1).refine(v => v.startsWith('/uploads/'), { message: "Must be a relative path starting with /uploads/" }),
  notes: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false).optional()
});

// POST /api/catalog/:id/attachments
router.post("/:id/attachments", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const parsed = attachmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
  
  if (parsed.data.isPrimary && parsed.data.attachmentType !== "DIAGRAM") {
    return res.status(400).json({ message: "Only DIAGRAM attachments can be primary" });
  }

  if (parsed.data.isPrimary && parsed.data.attachmentType === "DIAGRAM") {
    await prisma.catalogAttachment.updateMany({
      where: { seatInsertTypeId: id, attachmentType: "DIAGRAM" },
      data: { isPrimary: false }
    });
  }

  const attachment = await prisma.catalogAttachment.create({
    data: { ...parsed.data, seatInsertTypeId: id }
  });
  res.status(201).json(attachment);
});

// DELETE /api/catalog/attachments/:id
router.delete("/attachments/:id", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const existing = await prisma.catalogAttachment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: "Attachment not found" });
  await prisma.catalogAttachment.delete({ where: { id } });
  res.status(204).end();
});

// PATCH /api/catalog/attachments/:id/primary
router.patch("/attachments/:id/primary", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const attachment = await prisma.catalogAttachment.findUnique({ where: { id } });
  if (!attachment) return res.status(404).json({ message: "Attachment not found" });
  if (attachment.attachmentType !== "DIAGRAM") {
    return res.status(400).json({ message: "Only DIAGRAM attachments can be primary" });
  }

  await prisma.$transaction([
    prisma.catalogAttachment.updateMany({
      where: { seatInsertTypeId: attachment.seatInsertTypeId, attachmentType: "DIAGRAM" },
      data: { isPrimary: false }
    }),
    prisma.catalogAttachment.update({
      where: { id },
      data: { isPrimary: true }
    })
  ]);

  const updated = await prisma.catalogAttachment.findUnique({ where: { id } });
  res.json(updated);
});

// ─── Hotspot endpoints ────────────────────────────────────────────────────────

// GET /api/catalog/attachments/:id — fetch a single attachment by ID (for DiagramViewerPage)
router.get("/attachments/:id", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const attachment: any = await prisma.catalogAttachment.findUnique({ where: { id } });
  if (!attachment) return res.status(404).json({ message: "Attachment not found" });

  if (attachment.urlOrPath?.startsWith("/uploads/")) {
    const base = `${req.protocol}://${req.get("host")}`;
    attachment.url = `${base}${attachment.urlOrPath}`;
  }

  res.json(attachment);
});

const hotspotSchema = z.object({
  seatLabel:       z.string().min(1),
  partNumber:      z.string().min(1),
  seatInsertTypeId: z.string().min(1),
  x:               z.number().min(0).max(1),
  y:               z.number().min(0).max(1),
  width:           z.number().min(0.001).max(1),
  height:          z.number().min(0.001).max(1),
  shape:           z.string().default("rect"),
  notes:           z.string().optional().nullable(),
});

// GET /api/catalog/attachments/:id/hotspots
router.get("/attachments/:id/hotspots", requireAuth, async (req, res) => {
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
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
  const id = firstString(req.params.id);
  if (!id) return res.status(400).json({ message: "Invalid ID" });
  const attachment = await prisma.catalogAttachment.findUnique({ where: { id } });
  if (!attachment) return res.status(404).json({ message: "Attachment not found" });
  if (attachment.attachmentType !== "DIAGRAM") {
    return res.status(400).json({ message: "Hotspots can only be added to DIAGRAM attachments" });
  }

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
  const hid = firstString(req.params.hid);
  if (!hid) return res.status(400).json({ message: "Invalid ID" });
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
  const hid = firstString(req.params.hid);
  if (!hid) return res.status(400).json({ message: "Invalid ID" });
  const existing = await prisma.diagramHotspot.findUnique({ where: { id: hid } });
  if (!existing) return res.status(404).json({ message: "Hotspot not found" });
  await prisma.diagramHotspot.delete({ where: { id: hid } });
  res.status(204).end();
});

export default router;

