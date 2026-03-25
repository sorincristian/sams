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

    // 2. Fetch inventory counts grouped by location + status
    const groups = await prisma.seatInsert.groupBy({
      by: ["locationId", "status"],
      _count: { id: true },
    });

    for (const loc of locations) {
      const locGroups = groups.filter((g) => g.locationId === loc.id);
      
      const counts = { NEW: 0, DIRTY: 0, PACKED: 0, RETURNED: 0, DISPOSED: 0, TOTAL: 0 };
      locGroups.forEach((g) => {
        if (g.status === "PACKED_FOR_RETURN") counts.PACKED = g._count.id;
        else counts[g.status as keyof typeof counts] = g._count.id;
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
      include: { location: true },
    });

    const now = new Date();

    for (const batch of activeBatches) {
      const isOverdue = batch.expectedReturnDate < now;

      await this.triggerOrResolve({
        type: "OVERDUE_REUPHOLSTERY_BATCH",
        severity: "HIGH",
        locationId: batch.locationId,
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
   * Master runner evaluating all conditions securely
   */
  async runAllRules() {
    await this.evaluateInventoryAlerts();
    await this.evaluateBatchAlerts();
    await this.evaluateActivityAlerts();
  }
}

export const seatInsertsRuleEngine = new SeatInsertsRuleEngine();
