import { Request, Response } from "express";
import { z } from "zod";
import { seatInsertsService } from "./seat-inserts.service.js";

// Common query schemas
const DashboardQuerySchema = z.object({
  locationId: z.string().optional(),
  vendorId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export class SeatInsertsController {
  
  async getVendors(req: Request, res: Response) {
    try {
      const vendors = await seatInsertsService.getVendors();
      res.json(vendors);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Invalid request parameters" });
    }
  }

  async getDashboardSummary(req: Request, res: Response) {
    try {
      const parsed = DashboardQuerySchema.parse(req.query);
      const summary = await seatInsertsService.getDashboardSummary({
        locationId: parsed.locationId,
        vendorId: parsed.vendorId,
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
        locationId: z.string().optional(),
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
        status: z.enum(["DRAFT", "PACKED", "SHIPPED", "RECEIVED_BY_VENDOR", "IN_REUPHOLSTERY", "READY_TO_RETURN", "RETURNED", "CLOSED"]).optional(),
        locationId: z.string().optional(),
        vendorId: z.string().optional(),
      }).parse(req.query);

      const batches = await seatInsertsService.getReupholsteryBatches(parsed);
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

  async sendToVendor(req: Request, res: Response) {
    try {
      const parsed = z.object({
        insertIds: z.array(z.string()),
        garageId: z.string(),
        vendorId: z.string(),
        expectedReturnDate: z.string(),
      }).parse(req.body);
      const data = await seatInsertsService.sendToVendor(parsed);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async updateBatchStatus(req: Request, res: Response) {
    try {
      const parsed = z.object({
        status: z.enum(["PACKED", "SHIPPED", "RECEIVED_BY_VENDOR", "IN_REUPHOLSTERY", "READY_TO_RETURN"]),
      }).parse(req.body);
      const data = await seatInsertsService.updateBatchStatus(req.params.id as string, parsed.status);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async receiveBatch(req: Request, res: Response) {
    try {
      const parsed = z.object({
        notes: z.string().optional()
      }).optional().parse(req.body) || {};
      const data = await seatInsertsService.receiveBatch(req.params.id as string, { userId: (req as any).user?.id || 'system', notes: parsed.notes });
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
      const data = await seatInsertsService.disposeInsert({ id: req.params.id as string, userId: (req as any).user?.id, ...parsed });
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async installSeat(req: Request, res: Response) {
    try {
      const parsed = z.object({
        busId: z.string(),
        workOrderId: z.string().optional(),
        removedInsertId: z.string().optional(),
        removedDisposition: z.enum(["DIRTY", "DISPOSED"]).optional(),
        removedReason: z.string().optional()
      }).parse(req.body);
      
      const data = await seatInsertsService.installSeat({
        insertId: req.params.id as string,
        busId: parsed.busId,
        workOrderId: parsed.workOrderId,
        userId: (req as any).user?.id || 'system',
        removedInsertId: parsed.removedInsertId,
        removedDisposition: parsed.removedDisposition,
        removedReason: parsed.removedReason
      });
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

  // --- Vendor Orders APIs --- //
  
  async createVendorOrder(req: Request, res: Response) {
    try {
      const parsed = z.object({
        garageId: z.string(),
        vendorId: z.string(),
        expectedDeliveryDate: z.string(),
        items: z.array(z.object({
          seatInsertTypeId: z.string(),
          quantity: z.number().int().positive()
        })),
        notes: z.string().optional()
      }).parse(req.body);
      const data = await seatInsertsService.createVendorOrder(parsed);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async getVendorOrders(req: Request, res: Response) {
    try {
      const parsed = z.object({
        garageId: z.string().optional(),
        vendorId: z.string().optional(),
        status: z.string().optional()
      }).parse(req.query);
      const data = await seatInsertsService.getVendorOrders(parsed);
      res.json(data);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async updateVendorOrderStatus(req: Request, res: Response) {
    try {
      const parsed = z.object({
        status: z.enum(["SUBMITTED", "CONFIRMED", "IN_TRANSIT", "CANCELLED", "CLOSED"])
      }).parse(req.body);
      const data = await seatInsertsService.updateVendorOrderStatus(req.params.id as string, parsed.status);
      res.json({ success: true, data });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  }

  async receiveVendorOrder(req: Request, res: Response) {
    try {
      const parsed = z.object({
        lines: z.array(z.object({
          lineId: z.string(),
          receiveQuantity: z.number().int().min(0)
        })),
        notes: z.string().optional()
      }).parse(req.body);
      const data = await seatInsertsService.receiveVendorOrder(req.params.id as string, {
        userId: (req as any).user?.id || 'system',
        lines: parsed.lines,
        notes: parsed.notes
      });
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
