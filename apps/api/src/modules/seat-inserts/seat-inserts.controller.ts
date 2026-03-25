import { Request, Response } from "express";
import { z } from "zod";
import { seatInsertsService } from "./seat-inserts.service.js";

// Common query schemas
const DashboardQuerySchema = z.object({
  locationId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export class SeatInsertsController {
  
  async getDashboardSummary(req: Request, res: Response) {
    try {
      const parsed = DashboardQuerySchema.parse(req.query);
      const summary = await seatInsertsService.getDashboardSummary({
        locationId: parsed.locationId,
        dateRange: parsed.startDate && parsed.endDate ? { start: parsed.startDate, end: parsed.endDate } : undefined
      });
      res.json(summary);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid request parameters" });
    }
  }

  async getInventoryByLocation(req: Request, res: Response) {
    try {
      const parsed = z.object({
        fleetType: z.string().optional(),
        seatType: z.string().optional(),
      }).parse(req.query);

      const inventory = await seatInsertsService.getInventoryByLocation(parsed);
      res.json(inventory);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid request parameters" });
    }
  }

  async getReupholsteryBatches(req: Request, res: Response) {
    try {
      const parsed = z.object({
        status: z.enum(["AWAITING_PICKUP", "IN_TRANSIT", "IN_PRODUCTION", "RETURNED"]).optional(),
      }).parse(req.query);

      const batches = await seatInsertsService.getReupholsteryBatches({ status: parsed.status });
      res.json(batches);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid request parameters" });
    }
  }

  async getAlerts(req: Request, res: Response) {
    try {
      const parsed = z.object({
        locationId: z.string().optional(),
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
      }).parse(req.query);

      const alerts = await seatInsertsService.getAlerts(parsed);
      res.json(alerts);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid request parameters" });
    }
  }

  async getReplacements(req: Request, res: Response) {
    try {
      const parsed = DashboardQuerySchema.parse(req.query);
      const data = await seatInsertsService.getReplacements({
        locationId: parsed.locationId,
        dateRange: parsed.startDate && parsed.endDate ? { start: parsed.startDate, end: parsed.endDate } : undefined
      });
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid request parameters" });
    }
  }

  async getDisposals(req: Request, res: Response) {
    try {
      const parsed = DashboardQuerySchema.parse(req.query);
      const data = await seatInsertsService.getDisposals({
        locationId: parsed.locationId,
        dateRange: parsed.startDate && parsed.endDate ? { start: parsed.startDate, end: parsed.endDate } : undefined
      });
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid request parameters" });
    }
  }

  async getInserts(req: Request, res: Response) {
    try {
      const parsed = z.object({ locationId: z.string().optional(), status: z.string().optional() }).parse(req.query);
      const data = await seatInsertsService.getInserts(parsed);
      res.json(data);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async markDirty(req: Request, res: Response) {
    try {
      const data = await seatInsertsService.markDirty(req.params.id as string);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async createBatch(req: Request, res: Response) {
    try {
      const parsed = z.object({
        insertIds: z.array(z.string()),
        locationId: z.string(),
        vendorId: z.string(),
        expectedReturnDate: z.string(),
      }).parse(req.body);
      const data = await seatInsertsService.createBatch(parsed);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async updateBatchStatus(req: Request, res: Response) {
    try {
      const parsed = z.object({
        status: z.enum(["AWAITING_PICKUP", "IN_TRANSIT", "IN_PRODUCTION", "RETURNED"]),
      }).parse(req.body);
      const data = await seatInsertsService.updateBatchStatus(req.params.id as string, parsed.status);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async markBatchReturned(req: Request, res: Response) {
    try {
      const data = await seatInsertsService.markBatchReturned(req.params.id as string);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async disposeInsert(req: Request, res: Response) {
    try {
      const parsed = z.object({
        locationId: z.string(),
        reason: z.string(),
        notes: z.string().optional(),
      }).parse(req.body);
      // Try resolving user from req object if auth middleware applied, else pass undefined for fallback logic
      const data = await seatInsertsService.disposeInsert({ id: req.params.id as string, userId: (req as any).user?.id, ...parsed });
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async acknowledgeAlert(req: Request, res: Response) {
    try {
      const data = await seatInsertsService.acknowledgeAlert(req.params.id as string);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async resolveAlert(req: Request, res: Response) {
    try {
      const data = await seatInsertsService.resolveAlert(req.params.id as string);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async runRules(req: Request, res: Response) {
    try {
      const { seatInsertsRuleEngine } = await import("./seat-inserts.rules.js");
      await seatInsertsRuleEngine.runAllRules();
      res.json({ success: true, message: "Rule engine execution completed successfully." });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to run rules engine." });
    }
  }
}

export const seatInsertsController = new SeatInsertsController();
