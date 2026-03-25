import { Router } from "express";
import { seatInsertsController } from "./seat-inserts.controller.js";

const router = Router();

// GET /api/seat-inserts/dashboard/summary
router.get("/dashboard/summary", seatInsertsController.getDashboardSummary.bind(seatInsertsController));

// GET /api/seat-inserts/inventory/by-location
router.get("/inventory/by-location", seatInsertsController.getInventoryByLocation.bind(seatInsertsController));

// GET /api/seat-inserts/reupholstery/batches
router.get("/reupholstery/batches", seatInsertsController.getReupholsteryBatches.bind(seatInsertsController));

// GET /api/seat-inserts/alerts
router.get("/alerts", seatInsertsController.getAlerts.bind(seatInsertsController));

// GET /api/seat-inserts/replacements
router.get("/replacements", seatInsertsController.getReplacements.bind(seatInsertsController));

// GET /api/seat-inserts/disposals
router.get("/disposals", seatInsertsController.getDisposals.bind(seatInsertsController));

// GET /api/seat-inserts/items
router.get("/items", seatInsertsController.getInserts.bind(seatInsertsController));

// POST /api/seat-inserts/:id/mark-dirty
router.post("/:id/mark-dirty", seatInsertsController.markDirty.bind(seatInsertsController));

// POST /api/seat-inserts/batches
router.post("/batches", seatInsertsController.createBatch.bind(seatInsertsController));

// PUT /api/seat-inserts/batches/:id/status
router.put("/batches/:id/status", seatInsertsController.updateBatchStatus.bind(seatInsertsController));

// POST /api/seat-inserts/batches/:id/return
router.post("/batches/:id/return", seatInsertsController.markBatchReturned.bind(seatInsertsController));

// POST /api/seat-inserts/:id/dispose
router.post("/:id/dispose", seatInsertsController.disposeInsert.bind(seatInsertsController));

// POST /api/seat-inserts/alerts/:id/acknowledge
router.post("/alerts/:id/acknowledge", seatInsertsController.acknowledgeAlert.bind(seatInsertsController));

// POST /api/seat-inserts/alerts/:id/resolve
router.post("/alerts/:id/resolve", seatInsertsController.resolveAlert.bind(seatInsertsController));

// POST /api/seat-inserts/rules/run
router.post("/rules/run", seatInsertsController.runRules.bind(seatInsertsController));

export default router;
