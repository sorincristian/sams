import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../auth.js";

const router = Router();

router.get("/garages", requireAuth, async (req, res) => {
  const garages = await prisma.garage.findMany({ orderBy: { name: "asc" } });
  res.json(garages);
});

router.get("/buses", requireAuth, async (req, res) => {
  const buses = await prisma.bus.findMany({
    include: { garage: true },
    orderBy: { fleetNumber: "asc" }
  });
  res.json(buses);
});

export default router;
