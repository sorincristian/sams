import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import fleetRoutes from "./modules/fleet/fleet.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import workOrdersRoutes from "./modules/workOrders/workOrders.routes.js";
import catalogRoutes from "./modules/catalog/catalog.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const allowedOrigins = [
  "https://sams-web-emwb.onrender.com",
  process.env.CORS_ORIGIN
].filter(Boolean);

// Single global CORS/preflight handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// ─── Static file serving ────────────────────────────────────────────────────
// After TypeScript compilation: __dirname = apps/api/dist/
// apps/api/diagrams/          = path.join(__dirname, "../diagrams")
// apps/api/diagram-previews/  = path.join(__dirname, "../diagram-previews")

// Raw PDF diagrams — /api/diagrams/<filename>.pdf
const diagramsDir = path.join(__dirname, "../diagrams");
app.use("/api/diagrams", express.static(diagramsDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".pdf")) {
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Content-Type", "application/pdf");
    }
  }
}));

// Preview images (PNG/WebP) for interactive hotspot viewer — /api/diagram-previews/<img>
const diagramPreviewsDir = path.join(__dirname, "../diagram-previews");
app.use("/api/diagram-previews", express.static(diagramPreviewsDir));


app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", fleetRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/work-orders", workOrdersRoutes);
app.use("/api/catalog", catalogRoutes);

export default app;
