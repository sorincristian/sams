import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import fleetRoutes from "./modules/fleet/fleet.routes.js";
import fleetImportRoutes from "./modules/fleet/import.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import workOrdersRoutes from "./modules/workOrders/workOrders.routes.js";
import catalogRoutes from "./modules/catalog/catalog.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import seatInsertsRoutes from "./modules/seat-inserts/seat-inserts.routes.js";
import emailCentreRoutes from "./modules/email-centre/email-centre.routes.js";
import seatOrdersRoutes from "./modules/seat-orders/seat-orders.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Single global CORS/preflight handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    'https://sams-web-emwb.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);

  const origin = req.headers.origin as string;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://sams-web-emwb.onrender.com');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(204);
});

app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// ─── Static file serving ────────────────────────────────────────────────────
// After TypeScript compilation: __dirname = apps/api/dist/
// apps/api/diagrams/          = path.join(__dirname, "../diagrams")
// apps/api/diagram-previews/  = path.join(__dirname, "../diagram-previews")

// Static file routing logic has been migrated exclusively to `/uploads/`

// Preview images (PNG/WebP) for interactive hotspot viewer — /api/diagram-previews/<img>
const diagramPreviewsDir = path.join(__dirname, "../diagram-previews");
app.use("/api/diagram-previews", express.static(diagramPreviewsDir));

// Generic file uploads fallback directory (/uploads/)
app.use('/uploads', (req, res, next) => {
  console.log("Serving file:", req.path);
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", fleetRoutes);
app.use("/api/buses", fleetImportRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/work-orders", workOrdersRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/v1/catalog", catalogRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/seat-inserts", seatInsertsRoutes);
app.use("/api/email-centre", emailCentreRoutes);
app.use("/api/seat-orders", seatOrdersRoutes);

export default app;
