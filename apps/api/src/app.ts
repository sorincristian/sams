import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import fleetRoutes from "./modules/fleet/fleet.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import workOrdersRoutes from "./modules/workOrders/workOrders.routes.js";

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN || "https://sams-web-emwb.onrender.com";

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // allow browser requests from the configured frontend
    // allow server-to-server requests with no origin
    if (!origin || origin === allowedOrigin) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.options("/api/auth/login", (_req: Request, res: Response) => {
  const allowedOrigin = process.env.CORS_ORIGIN || "https://sams-web-emwb.onrender.com";
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return res.sendStatus(204);
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", fleetRoutes); // Handles /api/garages and /api/buses
app.use("/api/inventory", inventoryRoutes);
app.use("/api/work-orders", workOrdersRoutes);

export default app;
