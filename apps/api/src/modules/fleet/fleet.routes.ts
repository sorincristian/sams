import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();

router.get("/garages", requireAuth, async (req, res) => {
  try {
    const garages = await prisma.garage.findMany({ 
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { buses: true }
        }
      }
    });
    res.json(garages);
  } catch (error) {
    console.error("Error fetching garages:", error);
    res.status(500).json({ error: "Failed to fetch garages" });
  }
});

router.post("/garages", requireAuth, async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!name) return res.status(400).json({ error: "Garage name is required" });
    const c = code || name.substring(0, 3).toUpperCase();
    
    // Check duplicate
    const existing = await prisma.garage.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (existing) return res.status(400).json({ error: "GARAGE_NAME_EXISTS", message: "A garage with this name already exists" });

    // Ensure Code is not a collision
    let finalCode = c;
    const codeCollision = await prisma.garage.findUnique({ where: { code: finalCode } });
    if (codeCollision) {
        if (!req.body.code) {
           finalCode = `${c}${Math.floor(Math.random()*100)}`; // Auto-gen fallback
        } else {
           return res.status(400).json({ error: "GARAGE_CODE_EXISTS", message: "A garage with this code already exists" });
        }
    }


    const garage = await prisma.garage.create({ data: { code: finalCode, name } });
    res.status(201).json(garage);
  } catch (error) {
    console.error("Error creating garage:", error);
    res.status(500).json({ error: "Failed to create garage" });
  }
});

router.put("/garages/:id", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Garage name is required" });
    
    // Express req.params typing fixes
    const garageIdParam = String(req.params.id);

    const existing = await prisma.garage.findFirst({ 
      where: { name: { equals: name, mode: 'insensitive' }, id: { not: garageIdParam } } 
    });
    if (existing) return res.status(400).json({ error: "GARAGE_NAME_EXISTS", message: "A garage with this name already exists" });

    const garage = await prisma.garage.update({
      where: { id: garageIdParam },
      data: { name }
    });
    res.json(garage);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Garage not found" });
    console.error("Error updating garage:", error);
    res.status(500).json({ error: "Failed to update garage" });
  }
});

router.delete("/garages/:id", requireAuth, async (req, res) => {
  try {
    const garageIdParam = String(req.params.id);

    // Check if garage has buses
    const busCount = await prisma.bus.count({ where: { garageId: garageIdParam } });
    if (busCount > 0) {
      return res.status(400).json({ error: "GARAGE_HAS_BUSES: Cannot delete garage with assigned buses" });
    }
    
    // Check for users
    const userCount = await prisma.user.count({ where: { garageId: garageIdParam } });
    if (userCount > 0) return res.status(400).json({ error: "GARAGE_HAS_USERS: Cannot delete garage with assigned users" });

    // Check for inventory items
    const inventoryItemCount = await prisma.inventoryItem.count({ where: { garageId: garageIdParam } });
    if (inventoryItemCount > 0) return res.status(400).json({ error: "GARAGE_HAS_INVENTORY: Cannot delete garage with existing inventory items" });

    // Check for work orders
    const workOrderCount = await prisma.workOrder.count({ where: { garageId: garageIdParam } });
    if (workOrderCount > 0) return res.status(400).json({ error: "GARAGE_HAS_WORK_ORDERS: Cannot delete garage with existing work orders" });

    // Check for inventory transactions
    const transactionCount = await prisma.inventoryTransaction.count({ where: { garageId: garageIdParam } });
    if (transactionCount > 0) return res.status(400).json({ error: "GARAGE_HAS_TRANSACTIONS: Cannot delete garage with existing inventory transactions" });

    // Check for work order part usages
    const usageCount = await prisma.workOrderPartUsage.count({ where: { garageId: garageIdParam } });
    if (usageCount > 0) return res.status(400).json({ error: "GARAGE_HAS_PART_USAGES: Cannot delete garage with existing part usages" });

    await prisma.garage.delete({ where: { id: garageIdParam } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Garage not found" });
    if (error.code === 'P2003') return res.status(400).json({ error: "GARAGE_DELETE_CONSTRAINT: Cannot delete garage due to existing related records" });
    console.error("Error deleting garage:", error);
    res.status(500).json({ error: "Failed to delete garage" });
  }
});

// buses
router.get("/buses/stats", requireAuth, async (req, res) => {
  try {
    const [totalBuses, totalGarages, busesByStatus, busesByGarageRaw, busesByManufacturer] = await Promise.all([
      prisma.bus.count(),
      prisma.garage.count(),
      prisma.bus.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.bus.groupBy({ by: ['garageId'], _count: { id: true } }),
      prisma.bus.groupBy({ by: ['manufacturer'], _count: { id: true } })
    ]);

    // Format the groupBys into clear shapes
    const stats = {
      totalBuses,
      totalGarages,
      activeBuses: busesByStatus.find(s => s.status === 'ACTIVE')?._count.id || 0,
      maintenanceBuses: busesByStatus.find(s => s.status === 'MAINTENANCE')?._count.id || 0,
      retiredBuses: busesByStatus.find(s => s.status === 'RETIRED')?._count.id || 0,
      busesByManufacturer: busesByManufacturer.map(b => ({ manufacturer: b.manufacturer || 'Unknown', count: b._count.id })),
      busesByGarage: [] as any[]
    };

    // Enrich garage IDs with names
    const garages = await prisma.garage.findMany({ select: { id: true, name: true } });
    stats.busesByGarage = busesByGarageRaw.map(bg => ({
      garageId: bg.garageId,
      garageName: garages.find(g => g.id === bg.garageId)?.name || 'Unknown',
      count: bg._count.id
    }));

    res.json(stats);
  } catch (error) {
    console.error("Error fetching fleet stats:", error);
    res.status(500).json({ error: "Failed to fetch fleet stats" });
  }
});
router.get("/buses", requireAuth, async (req, res) => {
  try {
    const { garageId, search, page = '1', pageSize = '50' } = req.query as Record<string, any>;
    
    // Explicit string cast to resolve NextJS/Express query type string[] issues
    const safeGarageId = Array.isArray(garageId) ? garageId[0] : garageId;
    const safePage = Array.isArray(page) ? page[0] : page;
    const safePageSize = Array.isArray(pageSize) ? pageSize[0] : pageSize;
    const safeSearch = Array.isArray(search) ? search[0] : search;

    const p = parseInt(String(safePage), 10) || 1;
    const size = parseInt(String(safePageSize), 10) || 50;
    
    const where: any = {};
    if (safeGarageId) where.garageId = String(safeGarageId);
    if (safeSearch) {
      where.OR = [
        { fleetNumber: { contains: String(safeSearch), mode: "insensitive" } },
        { model: { contains: String(safeSearch), mode: "insensitive" } },
        { manufacturer: { contains: String(safeSearch), mode: "insensitive" } },
      ];
    }

    const [buses, total] = await Promise.all([
      prisma.bus.findMany({
        where,
        include: { garage: true },
        orderBy: { fleetNumber: "asc" },
        skip: (p - 1) * size,
        take: size,
      }),
      prisma.bus.count({ where })
    ]);
    
    res.json({
      items: buses,
      total,
      page: p,
      pageSize: size
    });
  } catch (error) {
    console.error("Error fetching buses:", error);
    res.status(500).json({ error: "Failed to fetch buses" });
  }
});

router.get("/buses/:id", requireAuth, async (req, res) => {
  try {
    const busIdParam = String(req.params.id);
    const bus = await prisma.bus.findUnique({
      where: { id: busIdParam },
      include: {
        garage: true,
        busCompatibility: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    if (!bus) return res.status(404).json({ error: "Bus not found" });
    res.json(bus);
  } catch (error) {
    console.error("Error fetching bus:", error);
    res.status(500).json({ error: "Failed to fetch bus details" });
  }
});

router.post("/buses", requireAuth, async (req, res) => {
  try {
    const { fleetNumber, model, manufacturer, garageId, status } = req.body;
    if (!fleetNumber || !model || !manufacturer || !garageId) {
      return res.status(400).json({ error: "Missing required fields (fleetNumber, model, manufacturer, garageId)" });
    }

    const existing = await prisma.bus.findUnique({ where: { fleetNumber } });
    if (existing) return res.status(400).json({ error: "BUS_FLEET_EXISTS", message: "A bus with this fleet number already exists" });

    const bus = await prisma.bus.create({
      data: {
        fleetNumber,
        model,
        manufacturer,
        garageId,
        status: status || "ACTIVE"
      },
      include: { garage: true }
    });
    res.status(201).json(bus);
  } catch (error) {
    console.error("Error creating bus:", error);
    res.status(500).json({ error: "Failed to create bus" });
  }
});

router.put("/buses/:id", requireAuth, async (req, res) => {
  try {
    const { fleetNumber, model, manufacturer, garageId, status } = req.body;
    const busIdParam = String(req.params.id);

    if (fleetNumber) {
      const existing = await prisma.bus.findFirst({ 
        where: { fleetNumber: { equals: String(fleetNumber) }, id: { not: busIdParam } } 
      });
      if (existing) return res.status(400).json({ error: "BUS_FLEET_EXISTS", message: "A bus with this fleet number already exists" });
    }

    const bus = await prisma.bus.update({
      where: { id: busIdParam },
      data: { 
        fleetNumber: fleetNumber ? String(fleetNumber) : undefined, 
        model: model ? String(model) : undefined, 
        manufacturer: manufacturer ? String(manufacturer) : undefined, 
        garageId: garageId ? String(garageId) : undefined, 
        status: status ? String(status) : undefined 
      },
      include: { garage: true }
    });
    res.json(bus);
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Bus not found" });
    console.error("Error updating bus:", error);
    res.status(500).json({ error: "Failed to update bus" });
  }
});

router.delete("/buses/:id", requireAuth, async (req, res) => {
  try {
    const busIdParam = String(req.params.id);

    // Check safety constraints
    const workOrderCount = await prisma.workOrder.count({ where: { busId: busIdParam } });
    if (workOrderCount > 0) return res.status(400).json({ error: "Cannot delete bus with active work orders. Deactivate it instead." });

    await prisma.bus.delete({ where: { id: busIdParam } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: "Bus not found" });
    console.error("Error deleting bus:", error);
    res.status(500).json({ error: "Failed to delete bus" });
  }
});

export default router;
