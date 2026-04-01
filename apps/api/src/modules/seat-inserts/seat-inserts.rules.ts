import { PrismaClient, AlertType, AlertSeverity, AlertStatus } from "@prisma/client";

const prisma = new PrismaClient();

export class SeatInsertsRuleEngine {
  /**
   * Helper to insert or resolve alerts idempotently
   */
  private async triggerOrResolve(p: {
    type: AlertType;
    severity: AlertSeverity;
    locationId: string;
    entityType?: string;
    entityId?: string;
    title: string;
    description: string;
    metadata: any;
    isTriggered: boolean;
  }) {
    // Check for existing OPEN alert for this type + location (+ entity if applicable)
    const existing = await prisma.alert.findFirst({
      where: {
        type: p.type,
        locationId: p.locationId,
        entityId: p.entityId || undefined,
        status: "OPEN",
      },
    });

    if (p.isTriggered) {
      if (!existing) {
        // Create new
        await prisma.alert.create({
          data: {
            type: p.type,
            severity: p.severity,
            locationId: p.locationId,
            entityType: p.entityType,
            entityId: p.entityId,
            title: p.title,
            description: p.description,
            metadata: p.metadata,
            status: "OPEN",
          },
        });
      }
      // If existing, we can optionally update metadata, but keeping it simple for now (no-op).
    } else {
      if (existing) {
        // Resolve it
        await prisma.alert.update({
          where: { id: existing.id },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Evaluates LOW_NEW_INVENTORY, HIGH_DIRTY_INVENTORY, INVENTORY_DISCREPANCY
   */
  async evaluateInventoryAlerts() {
    // 1. Fetch garage thresholds
    const locations = await prisma.garage.findMany({
      select: { id: true, name: true, thresholdNewInventory: true, thresholdDirtyInventory: true },
    });

    // 2. Fetch inventory counts grouped by location + stockClass
    const groups = await prisma.seatInsert.groupBy({
      by: ["locationId", "stockClass"],
      _count: { id: true },
    });

    for (const loc of locations) {
      const locGroups = groups.filter((g) => g.locationId === loc.id);
      
      const counts = { NEW: 0, DIRTY: 0, PACKED: 0, RETURNED: 0, DISPOSED: 0, TOTAL: 0 };
      locGroups.forEach((g) => {
        if (g.stockClass === "REPLACEMENT_AVAILABLE") counts.NEW += g._count.id;
        else if (g.stockClass === "DIRTY_RECOVERY") counts.DIRTY = g._count.id;
        else if (g.stockClass === "HARVEY_IN_PROGRESS") counts.PACKED = g._count.id;
        else if (g.stockClass === "SCRAPPED") counts.DISPOSED = g._count.id;
        counts.TOTAL += g._count.id;
      });

      // --- LOW_NEW_INVENTORY ---
      const isLowNew = counts.NEW < loc.thresholdNewInventory;
      await this.triggerOrResolve({
        type: "LOW_NEW_INVENTORY",
        severity: "HIGH",
        locationId: loc.id,
        title: `Low New Inventory at ${loc.name}`,
        description: `Current new inserts (${counts.NEW}) is below threshold (${loc.thresholdNewInventory}).`,
        metadata: { current: counts.NEW, threshold: loc.thresholdNewInventory },
        isTriggered: isLowNew,
      });

      // --- HIGH_DIRTY_INVENTORY ---
      const isHighDirty = counts.DIRTY > loc.thresholdDirtyInventory || (counts.TOTAL > 0 && (counts.DIRTY / counts.TOTAL) > 0.25);
      await this.triggerOrResolve({
        type: "HIGH_DIRTY_INVENTORY",
        severity: "MEDIUM",
        locationId: loc.id,
        title: `High Dirty Inventory at ${loc.name}`,
        description: `Dirty inserts (${counts.DIRTY}) exceeds threshold or 25% of total (${counts.TOTAL}).`,
        metadata: { current: counts.DIRTY, threshold: loc.thresholdDirtyInventory, total: counts.TOTAL },
        isTriggered: isHighDirty,
      });

      // --- INVENTORY_DISCREPANCY ---
      // Example basic consistency check: negative counts or mismatched constraints (rare in DB but possible if soft deletes are orphaned)
      // For this spec, we will trigger if for some reason TOTAL < 0. (Placeholder for deeper physical scanner vs DB mismatch)
      const isDiscrepant = counts.TOTAL < 0; 
      await this.triggerOrResolve({
        type: "INVENTORY_DISCREPANCY",
        severity: "CRITICAL",
        locationId: loc.id,
        title: `Inventory Discrepancy at ${loc.name}`,
        description: `Lifecycle counts exhibit impossible bounds mismatch.`,
        metadata: { counts },
        isTriggered: isDiscrepant,
      });
    }
  }

  /**
   * Evaluates OVERDUE_REUPHOLSTERY_BATCH
   */
  async evaluateBatchAlerts() {
    const activeBatches = await prisma.reupholsteryBatch.findMany({
      where: {
        status: { not: "RETURNED" },
      },
      include: { garage: true },
    });

    const now = new Date();

    for (const batch of activeBatches) {
      const isOverdue = batch.expectedReturnDate < now;

      await this.triggerOrResolve({
        type: "OVERDUE_VENDOR_RETURN" as any,
        severity: "HIGH",
        locationId: batch.garageId,
        entityType: "ReupholsteryBatch",
        entityId: batch.id,
        title: `Overdue Batch: ${batch.batchNumber}`,
        description: `Batch expected back on ${batch.expectedReturnDate.toISOString().split("T")[0]} is still ${batch.status}.`,
        metadata: { batchNumber: batch.batchNumber, expectedReturnDate: batch.expectedReturnDate, status: batch.status },
        isTriggered: isOverdue,
      });
    }
  }

  /**
   * Evaluates DISPOSAL_SPIKE and REPLACEMENT_SPIKE
   */
  async evaluateActivityAlerts() {
    const locations = await prisma.garage.findMany({ select: { id: true, name: true }});
    const now = new Date();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const thirtySevenDaysAgo = new Date();
    thirtySevenDaysAgo.setDate(now.getDate() - 37); // 30 days prior to the 7-day window

    for (const loc of locations) {
      // --- DISPOSAL_SPIKE ---
      const disposalsLast7 = await prisma.disposalRecord.count({
        where: { locationId: loc.id, disposedAt: { gte: sevenDaysAgo } },
      });
      const disposalsPrior30 = await prisma.disposalRecord.count({
        where: { locationId: loc.id, disposedAt: { gte: thirtySevenDaysAgo, lt: sevenDaysAgo } },
      });
      const baseline30DayAvgDisposals = disposalsPrior30 / 30; // daily average
      const expected7DayDisposals = baseline30DayAvgDisposals * 7;
      
      // Spike = > 50% above expected and > 5 absolute items (to avoid noise on small numbers)
      const isDisposalSpike = disposalsLast7 > 5 && disposalsLast7 > (expected7DayDisposals * 1.5);

      await this.triggerOrResolve({
        type: "DISPOSAL_SPIKE",
        severity: "MEDIUM",
        locationId: loc.id,
        title: `Disposal Spike at ${loc.name}`,
        description: `${disposalsLast7} disposals in last 7 days vs baseline of ${Math.round(expected7DayDisposals)}.`,
        metadata: { last7: disposalsLast7, baseline7: expected7DayDisposals },
        isTriggered: isDisposalSpike,
      });

      // --- REPLACEMENT_SPIKE ---
      const replacementsLast7 = await prisma.replacementActivity.count({
        where: { locationId: loc.id, replacedAt: { gte: sevenDaysAgo } },
      });
      const replacementsPrior30 = await prisma.replacementActivity.count({
        where: { locationId: loc.id, replacedAt: { gte: thirtySevenDaysAgo, lt: sevenDaysAgo } },
      });
      const baseline30DayAvgReplacements = replacementsPrior30 / 30;
      const expected7DayReplacements = baseline30DayAvgReplacements * 7;

      const isReplacementSpike = replacementsLast7 > 10 && replacementsLast7 > (expected7DayReplacements * 1.5);

      await this.triggerOrResolve({
        type: "REPLACEMENT_SPIKE",
        severity: "HIGH",
        locationId: loc.id,
        title: `Replacement Spike at ${loc.name}`,
        description: `${replacementsLast7} replacements in last 7 days vs baseline of ${Math.round(expected7DayReplacements)}.`,
        metadata: { last7: replacementsLast7, baseline7: expected7DayReplacements },
        isTriggered: isReplacementSpike,
      });
    }
  }

  /**
   * Evaluates VENDOR_SLA_BREACH
   */
  async evaluateVendorSlaAlerts() {
    const vendors = await prisma.vendor.findMany({
      where: { active: true }
    });
    
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    for (const vendor of vendors) {
      const returnedBatches = await prisma.reupholsteryBatch.findMany({
        where: {
          vendorId: vendor.id,
          status: "RETURNED",
          actualReturnDate: { gte: thirtyDaysAgo }
        },
        select: { onTimeReturn: true, batchNumber: true }
      });

      if (returnedBatches.length > 0) {
        const onTimeBatches = returnedBatches.filter(b => b.onTimeReturn).length;
        const slaPercentage = Math.round((onTimeBatches / returnedBatches.length) * 100);
        
        // Threshold of 90% fixed for now
        const isSpike = slaPercentage < 90;

        // Note: For vendor-level alerts, we might not have a single locationId. 
        // Alert requires locationId in DB schema unless it's optional. Let's check schema. (locationId String?) Yes it's optional!
        await this.triggerOrResolve({
          type: "VENDOR_SLA_BREACH" as any, // fallback cast if enum out of sync natively
          severity: "HIGH",
          locationId: undefined as any,
          entityType: "Vendor",
          entityId: vendor.id,
          title: `SLA Breach: ${vendor.name}`,
          description: `Vendor on-time return rate is ${slaPercentage}% (below 90% threshold for last 30 days).`,
          metadata: { vendorId: vendor.id, vendorName: vendor.name, slaPercentage, totalReturned: returnedBatches.length },
          isTriggered: isSpike,
        });
      }
    }
  }

  async evaluateVendorOrderAlerts() {
    const activeOrders = await prisma.vendorOrder.findMany({
      where: {
        status: { in: ["SUBMITTED", "CONFIRMED", "IN_TRANSIT", "PARTIALLY_RECEIVED"] },
      },
    });

    const now = new Date();

    for (const order of activeOrders) {
      const isOverdue = order.expectedDeliveryDate && order.expectedDeliveryDate < now;
      const isPartial = order.status === "PARTIALLY_RECEIVED" && order.expectedDeliveryDate && (now.getTime() - order.expectedDeliveryDate.getTime() > 7 * 24 * 60 * 60 * 1000); // 7 days post-partial wait

      await this.triggerOrResolve({
        type: "OVERDUE_VENDOR_ORDER" as any,
        severity: "HIGH",
        locationId: order.garageId,
        entityType: "VendorOrder",
        entityId: order.id,
        title: `Overdue Vendor Order: ${order.orderNumber}`,
        description: `Order expected on ${order.expectedDeliveryDate?.toISOString().split("T")[0] || "Unknown"} is overdue.`,
        metadata: { orderNumber: order.orderNumber, status: order.status },
        isTriggered: !!isOverdue && order.status !== "PARTIALLY_RECEIVED",
      });

      await this.triggerOrResolve({
        type: "PARTIAL_RECEIPT_PENDING" as any,
        severity: "MEDIUM",
        locationId: order.garageId,
        entityType: "VendorOrder",
        entityId: order.id,
        title: `Partial Receipt Pending: ${order.orderNumber}`,
        description: `Order is partially received and outstanding items are delayed over 7 days.`,
        metadata: { orderNumber: order.orderNumber, status: order.status },
        isTriggered: !!isPartial,
      });
    }
  }

  /**
   * Master runner evaluating all conditions securely
   */
  async runAllRules() {
    await this.evaluateInventoryAlerts();
    await this.evaluateBatchAlerts();
    await this.evaluateActivityAlerts();
    await this.evaluateVendorSlaAlerts();
    await this.evaluateVendorOrderAlerts();
  }
}

export const seatInsertsRuleEngine = new SeatInsertsRuleEngine();
