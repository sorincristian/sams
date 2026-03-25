import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class SeatInsertsService {
  /**
   * Executive Command Centre Summary KPI
   */
  async getDashboardSummary(params: { locationId?: string; dateRange?: { start: Date; end: Date } }) {
    const whereLocation = params.locationId ? { locationId: params.locationId } : {};

    // 1. Total Inventory
    const totalInventoryCount = await prisma.seatInsert.count({
      where: params.locationId ? { locationId: params.locationId } : undefined,
    });

    // 2. Inventory by current status (New, Dirty, Packed, Returned, Disposed)
    const statusGroupsRaw = await prisma.seatInsert.groupBy({
      by: ["status"],
      where: whereLocation,
      _count: { id: true },
    });

    const statusCounts = statusGroupsRaw.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // 3. Replacements Completed (MTD logic or custom date range)
    // If no date range provided, fallback to current month
    const defaultStart = new Date();
    defaultStart.setDate(1); // 1st of month
    defaultStart.setHours(0, 0, 0, 0);

    const start = params.dateRange?.start || defaultStart;
    const end = params.dateRange?.end || new Date();

    const replacementsMtd = await prisma.replacementActivity.count({
      where: {
        ...whereLocation,
        replacedAt: { gte: start, lte: end },
      },
    });

    // 4. SLA % for returned batches
    // Calculate batches returned on time or not
    const returnedBatches = await prisma.reupholsteryBatch.findMany({
      where: {
        ...whereLocation,
        status: "RETURNED",
        actualReturnDate: { not: null },
      },
      select: { onTimeReturn: true },
    });
    
    let slaPercentage = 100;
    if (returnedBatches.length > 0) {
      const onTime = returnedBatches.filter((b) => b.onTimeReturn).length;
      slaPercentage = Math.round((onTime / returnedBatches.length) * 100);
    }

    return {
      totalInventory: totalInventoryCount,
      newInventory: statusCounts["NEW"] || 0,
      dirtyInventory: statusCounts["DIRTY"] || 0,
      packedForReturn: statusCounts["PACKED_FOR_RETURN"] || 0,
      returned: statusCounts["RETURNED"] || 0,
      disposed: statusCounts["DISPOSED"] || 0,
      replacementsMtd,
      slaPercentage,
    };
  }

  /**
   * Inventory by location matrix
   */
  async getInventoryByLocation(params: { fleetType?: string; seatType?: string; locationId?: string }) {
    const whereClause: any = {};
    if (params.fleetType) whereClause.fleetType = params.fleetType;
    if (params.seatType) whereClause.seatType = params.seatType;
    if (params.locationId) whereClause.locationId = params.locationId;

    // We need grouping by locationId and status. 
    // Prisma grouping:
    const groups = await prisma.seatInsert.groupBy({
      by: ["locationId", "status"],
      where: whereClause,
      _count: { id: true },
    });

    // We also need location metadata (name, thresholds)
    // Fetch all locations to map names and thresholds
    const locations = await prisma.garage.findMany({
      where: params.locationId ? { id: params.locationId } : undefined,
      select: { id: true, name: true, thresholdNewInventory: true, thresholdDirtyInventory: true },
    });

    // Pivot the grouped data
    const results = locations.map((loc) => {
      const locGroups = groups.filter((g) => g.locationId === loc.id);
      
      const statusMap = {
        NEW: 0,
        DIRTY: 0,
        PACKED_FOR_RETURN: 0,
        RETURNED: 0,
        DISPOSED: 0,
        total: 0,
      };

      locGroups.forEach((g) => {
        statusMap[g.status as keyof typeof statusMap] = g._count.id;
        statusMap.total += g._count.id;
      });

      return {
        locationId: loc.id,
        locationName: loc.name,
        thresholdNew: loc.thresholdNewInventory,
        thresholdDirty: loc.thresholdDirtyInventory,
        ...statusMap,
      };
    });

    // remove locations with 0 inventory if desired, or keep all
    return results.filter(r => r.total > 0);
  }

  /**
   * Reupholstery Batches Tracker Map
   */
  async getReupholsteryBatches(params: { status?: string; locationId?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status as any;
    if (params.locationId) where.locationId = params.locationId;

    return await prisma.reupholsteryBatch.findMany({
      where,
      include: {
        location: { select: { name: true } },
        vendor: { select: { name: true } },
        _count: { select: { inserts: true } }
      },
      orderBy: { packedDate: "desc" },
    });
  }

  /**
   * Alerts Engine Polling
   */
  async getAlerts(params: { locationId?: string; status?: string }) {
    const where: any = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.status) where.status = params.status as any;

    return await prisma.alert.findMany({
      where,
      orderBy: { triggeredAt: "desc" },
      include: {
        location: { select: { name: true } }
      }
    });
  }

  /**
   * Replacement Activity Trends
   */
  async getReplacements(params: { locationId?: string; dateRange?: { start: Date; end: Date } }) {
    const where: any = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.dateRange) {
      where.replacedAt = { gte: params.dateRange.start, lte: params.dateRange.end };
    }

    // Group by reason
    const byReason = await prisma.replacementActivity.groupBy({
      by: ["reason"],
      where,
      _count: { id: true },
    });

    // For trends, we might want to return exact records or group by day. 
    // The prompt asks for aggregates. Let's return the sum by reason, and the raw lines if needed.
    const records = await prisma.replacementActivity.findMany({
      where,
      orderBy: { replacedAt: "desc" },
      include: { location: { select: { name: true } }, bus: { select: { fleetNumber: true } } },
      take: 100 // limit for API efficiency
    });

    return {
      reasonBreakdown: byReason.map(r => ({ reason: r.reason, count: r._count.id })),
      recentRecords: records
    };
  }

  /**
   * Disposal Records Trends
   */
  async getDisposals(params: { locationId?: string; dateRange?: { start: Date; end: Date } }) {
    const where: any = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.dateRange) {
      where.disposedAt = { gte: params.dateRange.start, lte: params.dateRange.end };
    }

    const byReason = await prisma.disposalRecord.groupBy({
      by: ["reason"],
      where,
      _count: { id: true },
    });

    const records = await prisma.disposalRecord.findMany({
      where,
      orderBy: { disposedAt: "desc" },
      include: { location: { select: { name: true } } },
      take: 100
    });

    return {
      reasonBreakdown: byReason.map(r => ({ reason: r.reason, count: r._count.id })),
      recentRecords: records
    };
  }

  /**
   * List individual inserts for operations
   */
  async getInserts(params: { locationId?: string; status?: string }) {
    const where: any = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.status) where.status = params.status;

    return await prisma.seatInsert.findMany({
      where,
      include: { location: { select: { name: true } }, installedBus: { select: { fleetNumber: true } } },
      take: 200, // Safe bounds for operational UI
    });
  }

  /**
   * (A) Mark Insert as DIRTY
   */
  async markDirty(id: string) {
    return await prisma.seatInsert.update({
      where: { id },
      data: {
        status: "DIRTY",
        dirtyAt: new Date(),
      },
    });
  }

  /**
   * (B) Create Reupholstery Batch
   */
  async createBatch(params: { insertIds: string[]; locationId: string; vendorId: string; expectedReturnDate: string }) {
    if (params.insertIds.length === 0) throw new Error("No inserts selected");
    const sample = await prisma.seatInsert.findUnique({ where: { id: params.insertIds[0] } });
    if (!sample) throw new Error("Invalid inserts array");

    return await prisma.$transaction(async (tx) => {
      // 1. Create Batch
      const batch = await tx.reupholsteryBatch.create({
        data: {
          batchNumber: `UB-${Date.now().toString().slice(-6)}`,
          locationId: params.locationId,
          vendorId: params.vendorId,
          seatType: sample.seatType,
          color: sample.color,
          status: "AWAITING_PICKUP",
          expectedReturnDate: new Date(params.expectedReturnDate),
          packedDate: new Date(),
        },
      });

      // 2. Attach inserts and move to PACKED_FOR_RETURN
      await tx.seatInsert.updateMany({
        where: { id: { in: params.insertIds } },
        data: {
          batchId: batch.id,
          status: "PACKED_FOR_RETURN",
          packedAt: new Date(),
        },
      });

      return batch;
    });
  }

  /**
   * (C) Update Batch Status
   */
  async updateBatchStatus(id: string, status: "AWAITING_PICKUP" | "IN_TRANSIT" | "IN_PRODUCTION" | "RETURNED") {
    // If it's returned, use the dedicated flow: D
    if (status === "RETURNED") {
      throw new Error("Use markBatchReturned for finalizing batches.");
    }
    return await prisma.reupholsteryBatch.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * (D) Mark Batch Returned
   */
  async markBatchReturned(id: string) {
    return await prisma.$transaction(async (tx) => {
      const batch = await tx.reupholsteryBatch.findUnique({ where: { id } });
      if (!batch) throw new Error("Batch not found");

      const now = new Date();
      const onTime = batch.expectedReturnDate >= now;

      const updatedBatch = await tx.reupholsteryBatch.update({
        where: { id },
        data: {
          status: "RETURNED",
          actualReturnDate: now,
          onTimeReturn: onTime,
        },
      });

      await tx.seatInsert.updateMany({
        where: { batchId: id },
        data: {
          status: "RETURNED",
          returnedAt: now,
        },
      });

      return updatedBatch;
    });
  }

  /**
   * (E) Dispose Insert
   */
  async disposeInsert(params: { id: string; locationId: string; reason: string; notes?: string; userId?: string }) {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      
      let createdBy = params.userId;
      if (!createdBy) {
        // Fallback for isolated API calls
        const admin = await tx.user.findFirst();
        if (!admin) throw new Error("No generic user mapping available for disposal logging");
        createdBy = admin.id;
      }
      
      const insert = await tx.seatInsert.update({
        where: { id: params.id },
        data: {
          status: "DISPOSED",
          disposedAt: now,
        },
      });

      const record = await tx.disposalRecord.create({
        data: {
          inventoryId: insert.id,
          locationId: params.locationId,
          reason: params.reason as any,
          notes: params.notes,
          disposedAt: now,
          createdBy,
        },
      });

      return record;
    });
  }

  /**
   * (F) Alert Actions
   */
  async acknowledgeAlert(id: string) {
    return await prisma.alert.update({
      where: { id },
      data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    });
  }

  async resolveAlert(id: string) {
    return await prisma.alert.update({
      where: { id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  }
}

export const seatInsertsService = new SeatInsertsService();
