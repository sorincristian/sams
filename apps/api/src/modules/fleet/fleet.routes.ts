import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();

router.get("/garages", requireAuth, async (req, res) => {
  try {
    const garages = await prisma.garage.findMany({ orderBy: { name: "asc" } });
    res.json(garages);
  } catch (error) {
    console.error("Error fetching garages:", error);
    res.status(500).json({ error: "Failed to fetch garages", details: (error as any)?.message || String(error) });
  }
});

router.get("/buses", requireAuth, async (req, res) => {
  try {
    const buses = await prisma.bus.findMany({
      include: { garage: true },
      orderBy: { fleetNumber: "asc" }
    });
    res.json(buses);
  } catch (error) {
    console.error("Error fetching buses:", error);
    res.status(500).json({ error: "Failed to fetch buses", details: (error as any)?.message || String(error) });
  }
});

export default router;
