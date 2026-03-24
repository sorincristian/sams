import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";
import { Prisma } from "@prisma/client";

const router = Router();

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const startOfWeek = (d: Date) => {
  const start = startOfDay(d);
  start.setDate(start.getDate() - start.getDay());
  return start;
};
const endOfWeek = (d: Date) => {
  const end = startOfWeek(d);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

router.get("/seat-changes", requireAuth, async (req, res) => {
  try {
    const { date, period, facility, search } = req.query;

    if (!date || !period) {
      return res.status(400).json({ error: "date and period are required" });
    }

    const [year, month, day] = String(date).split('T')[0].split('-').map(Number);
    const target = new Date(year, month - 1, day || 1); // Native server-local timezone
    
    let start: Date, end: Date;
    const p = String(period).toLowerCase();
    
    if (p === 'month') {
      start = startOfMonth(target);
      end = endOfMonth(target);
    } else if (p === 'week') {
      start = startOfWeek(target);
      end = endOfWeek(target);
    } else {
      start = startOfDay(target);
      end = endOfDay(target);
    }

    const whereClause: Prisma.InventoryItemWhereInput = {
      updatedAt: {
        gte: start,
        lte: end,
      },
    };

    if (facility) {
      whereClause.garageId = String(facility);
    }

    if (search) {
      const searchStr = String(search);
      whereClause.seatInsertType = {
        OR: [
          { partNumber: { contains: searchStr, mode: "insensitive" } },
          { description: { contains: searchStr, mode: "insensitive" } }
        ]
      };
    }

    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        garage: true,
        seatInsertType: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = items.map((item) => ({
      id: item.id,
      partNumber: item.seatInsertType.partNumber,
      description: item.seatInsertType.description,
      facility: item.garage.name,
      status: item.seatInsertType.active ? "Active" : "Inactive",
      quantity: item.quantityOnHand ?? item.quantity,
      changeType: item.createdAt.getTime() === item.updatedAt.getTime() ? "created" : "updated",
      changedBy: null,
      changedAt: item.updatedAt,
      notes: "",
    }));

    res.json(mapped);
  } catch (err: any) {
    console.error("SEAT_CHANGE_REPORT_ERROR:", err);
    res.status(500).json({ error: "Failed to load seat change report" });
  }
});

export default router;
