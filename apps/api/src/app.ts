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

const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

// Explicit preflight/CORS handling
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Standard middleware
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(helmet());
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
