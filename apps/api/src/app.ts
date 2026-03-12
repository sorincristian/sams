import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import fleetRoutes from "./modules/fleet/fleet.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import workOrdersRoutes from "./modules/workOrders/workOrders.routes.js";

const app = express();

const allowedOrigin =
  process.env.CORS_ORIGIN || "https://sams-web-emwb.onrender.com";

// Single global CORS/preflight handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && requestOrigin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", fleetRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/work-orders", workOrdersRoutes);

export default app;
