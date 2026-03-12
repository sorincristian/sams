import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const [garages, buses, seatInsertTypes, openWorkOrders, inventoryRows, recentWorkOrders] = await Promise.all([
    prisma.garage.count(),
    prisma.bus.count(),
    prisma.seatInsertType.count(),
    prisma.workOrder.count({ where: { status: "OPEN" } }),
    prisma.inventoryItem.findMany({
      include: { garage: true, seatInsertType: true }
    }),
    prisma.workOrder.findMany({
      include: {
        bus: { include: { garage: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const lowStock = inventoryRows
    .filter((row) => (row.quantityOnHand ?? row.quantity) <= row.seatInsertType.minStockLevel)
    .map((row) => ({
      garage: row.garage.name,
      partNumber: row.seatInsertType.partNumber,
      description: row.seatInsertType.description,
      quantityOnHand: row.quantityOnHand ?? row.quantity,
      minStockLevel: row.seatInsertType.minStockLevel
    }));

  res.json({
    counts: { garages, buses, seatInsertTypes, openWorkOrders },
    lowStock,
    recentWorkOrders
  });
});

export default router;
