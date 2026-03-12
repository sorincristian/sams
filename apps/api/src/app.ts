import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import fleetRoutes from "./modules/fleet/fleet.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import workOrdersRoutes from "./modules/workOrders/workOrders.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sams-api", phase: "ready" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", fleetRoutes); // Handles /api/garages and /api/buses
app.use("/api/inventory", inventoryRoutes);
app.use("/api/work-orders", workOrdersRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

export default app;
