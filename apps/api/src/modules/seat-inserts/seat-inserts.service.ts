import { PrismaClient, StockClass, ConditionSource, ReservationStatus } from "@prisma/client";
const prisma = new PrismaClient();

export class SeatInsertsService {
  async getVendors() {
    return await prisma.vendor.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" }
    });
  }

  /**
   * Executive Command Centre Summary KPI
   */
  async getDashboardSummary(params: { locationId?: string; vendorId?: string; dateRange?: { start: Date; end: Date } }) {
    const whereLocation = params.locationId ? { locationId: params.locationId } : {};
    const whereVendor = params.vendorId ? { vendorId: params.vendorId } : {};

    const totalInventoryCount = await prisma.seatInsert.count({
      where: params.locationId ? { locationId: params.locationId } : undefined,
    });

    const stockGroupsRaw = await prisma.seatInsert.groupBy({
      by: ["stockClass"],
      where: whereLocation,
      _count: { id: true },
    });

    const conditionSourceGroupsRaw = await prisma.seatInsert.groupBy({
      by: ["conditionSource"],
      where: { ...whereLocation, stockClass: "REPLACEMENT_AVAILABLE" },
      _count: { id: true },
    });

    const stockCounts = stockGroupsRaw.reduce((acc, curr) => {
      acc[curr.stockClass] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    let rebuiltCount = 0;
    let newCount = 0;
    conditionSourceGroupsRaw.forEach((g) => {
      if (g.conditionSource === "REBUILT") rebuiltCount += g._count.id;
      if (g.conditionSource === "NEW") newCount += g._count.id;
    });

    const defaultStart = new Date();
    defaultStart.setDate(1); 
    defaultStart.setHours(0, 0, 0, 0);

    const start = params.dateRange?.start || defaultStart;
    const end = params.dateRange?.end || new Date();

    const replacementsMtd = await prisma.replacementActivity.count({
      where: {
        ...whereLocation,
        replacedAt: { gte: start, lte: end },
      },
    });

    const returnedBatches = await prisma.reupholsteryBatch.findMany({
      where: {
        ...whereLocation,
        ...whereVendor,
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

    const atVendorCount = stockCounts["HARVEY_IN_PROGRESS"] || 0;

    const overdueVendorBatches = await prisma.reupholsteryBatch.count({
      where: {
        ...whereLocation,
        ...whereVendor,
        status: { not: "RETURNED" },
        expectedReturnDate: { lt: new Date() }
      }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const rebuiltReturningToday = await prisma.reupholsteryBatch.count({
      where: {
        ...whereLocation,
        ...whereVendor,
        status: { in: ["PACKED", "SHIPPED", "IN_REUPHOLSTERY", "READY_TO_RETURN"] },
        expectedReturnDate: { gte: todayStart, lte: todayEnd },
      }
    });

    const blockedSwaps = await prisma.replacementReservation.count({
      where: {
         status: "BLOCKED",
         bus: params.locationId ? { garageId: params.locationId } : undefined
      }
    });

    return {
      totalInventory: totalInventoryCount,
      replacementAvailable: stockCounts["REPLACEMENT_AVAILABLE"] || 0,
      dirtyRecoveryQueue: stockCounts["DIRTY_RECOVERY"] || 0,
      harveyInProgress: stockCounts["HARVEY_IN_PROGRESS"] || 0,
      scrapped: stockCounts["SCRAPPED"] || 0,
      rebuiltReturningToday,
      blockedSwaps,
      rebuiltCount,
      newCount,
      percentFromRebuilt: (rebuiltCount + newCount > 0) ? Math.round((rebuiltCount / (rebuiltCount + newCount)) * 100) : 0,
      percentFromNew: (rebuiltCount + newCount > 0) ? Math.round((newCount / (rebuiltCount + newCount)) * 100) : 0,
      costAvoidance: rebuiltCount * 450, 
      replacementsMtd,
      slaPercentage,
      atVendorCount,
      vendorSlaPercentage: slaPercentage,
      overdueVendorBatches,
    };
  }

  async getInventoryByLocation(params: { fleetType?: string; seatType?: string; locationId?: string }) {
    const whereClause: any = {};
    if (params.fleetType) whereClause.fleetType = params.fleetType;
    if (params.seatType) whereClause.seatType = params.seatType;
    if (params.locationId) whereClause.locationId = params.locationId;

    const groups = await prisma.seatInsert.groupBy({
      by: ["locationId", "stockClass"],
      where: whereClause,
      _count: { id: true },
    });

    const locations = await prisma.garage.findMany({
      where: params.locationId ? { id: params.locationId } : undefined,
      select: { id: true, name: true, thresholdNewInventory: true, thresholdDirtyInventory: true },
    });

    const results = locations.map((loc) => {
      const locGroups = groups.filter((g) => g.locationId === loc.id);
      
      const stockMap = {
        REPLACEMENT_AVAILABLE: 0,
        DIRTY_RECOVERY: 0,
        HARVEY_IN_PROGRESS: 0,
        SCRAPPED: 0,
        total: 0,
      };

      locGroups.forEach((g) => {
        stockMap[g.stockClass as keyof typeof stockMap] = g._count.id;
        stockMap.total += g._count.id;
      });

      return {
        locationId: loc.id,
        locationName: loc.name,
        thresholdNew: loc.thresholdNewInventory,
        thresholdDirty: loc.thresholdDirtyInventory,
        ...stockMap,
      };
    });

    return results.filter(r => r.total > 0);
  }

  async getReupholsteryBatches(params: { status?: string; locationId?: string; vendorId?: string }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.locationId) where.garageId = params.locationId;
    if (params.vendorId) where.vendorId = params.vendorId;

    return await prisma.reupholsteryBatch.findMany({
      where,
      include: {
        garage: { select: { name: true } },
        vendor: { select: { name: true } },
        _count: { select: { inserts: true } }
      },
      orderBy: { packedDate: "desc" },
    });
  }

  async getAlerts(params: { locationId?: string; status?: string }) {
    const where: any = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.status) where.status = params.status;

    return await prisma.alert.findMany({
      where,
      orderBy: { triggeredAt: "desc" },
      include: {
        location: { select: { name: true } }
      }
    });
  }

  async getReplacements(params: { locationId?: string; dateRange?: { start: Date; end: Date } }) {
    const where: any = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.dateRange) {
      where.replacedAt = { gte: params.dateRange.start, lte: params.dateRange.end };
    }

    const byReason = await prisma.replacementActivity.groupBy({
      by: ["reason"],
      where,
      _count: { id: true },
    });

    const records = await prisma.replacementActivity.findMany({
      where,
      orderBy: { replacedAt: "desc" },
      include: { location: { select: { name: true } }, bus: { select: { fleetNumber: true } } },
      take: 100 
    });

    return {
      reasonBreakdown: byReason.map(r => ({ reason: r.reason, count: r._count.id })),
      recentRecords: records
    };
  }

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

  async getInserts(params: { locationId?: string; stockClass?: StockClass }) {
    const where: any = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.stockClass) where.stockClass = params.stockClass;

    return await prisma.seatInsert.findMany({
      where,
      include: { location: { select: { name: true } }, installedBus: { select: { fleetNumber: true } } },
      take: 200, 
    });
  }

  async getTemplates() {
    return await prisma.seatInsertType.findMany({
      where: { componentType: "TEMPLATE" },
      include: {
        components: {
          include: {
            childComponent: true
          }
        },
        busCompatibilities: true
      },
      orderBy: { partNumber: "asc" }
    });
  }

  async markDirty(id: string) {
    return await prisma.$transaction(async (tx) => {
      const insert = await tx.seatInsert.findUnique({ where: { id } });
      if (!insert) throw new Error("Seat not found.");

      const updated = await tx.seatInsert.update({
        where: { id },
        data: {
          stockClass: "DIRTY_RECOVERY",
          installedBusId: null,
          dirtyAt: new Date(),
        },
      });

      if ((insert.stockClass === "REPLACEMENT_AVAILABLE") && insert.seatInsertTypeId) {
        const inv = await tx.inventoryItem.findFirst({
           where: { garageId: insert.locationId, seatInsertTypeId: insert.seatInsertTypeId }
        });
        if (inv && inv.quantityOnHand > 0) {
           await tx.inventoryItem.update({
              where: { id: inv.id },
              data: { quantityOnHand: inv.quantityOnHand - 1 }
           });
        }
      }

      return updated;
    });
  }

  async disposeInsert(params: { id: string; locationId: string; reason: string; notes?: string; userId?: string }) {
    return await prisma.$transaction(async (tx) => {
      let createdBy = params.userId;
      if (!createdBy) {
        const admin = await tx.user.findFirst();
        createdBy = admin?.id || "system";
      }

      const insert = await tx.seatInsert.findUnique({ where: { id: params.id } });
      if (!insert) throw new Error("Seat not found.");

      const allowedStatuses: StockClass[] = ["REPLACEMENT_AVAILABLE", "DIRTY_RECOVERY"];
      if (!allowedStatuses.includes(insert.stockClass)) {
        throw new Error(`Cannot dispose seat in class ${insert.stockClass}.`);
      }

      const now = new Date();

      const updated = await tx.seatInsert.update({
        where: { id: params.id },
        data: {
          stockClass: "SCRAPPED",
          installedBusId: null,
          disposedAt: now,
        },
      });

      if (insert.seatInsertTypeId) {
        const inv = await tx.inventoryItem.findFirst({
           where: { garageId: insert.locationId, seatInsertTypeId: insert.seatInsertTypeId }
        });

        if (inv && inv.quantity > 0) {
           const updateData: any = { quantity: inv.quantity - 1 };
           
           if ((insert.stockClass === "REPLACEMENT_AVAILABLE") && inv.quantityOnHand > 0) {
             updateData.quantityOnHand = inv.quantityOnHand - 1;
           }

           await tx.inventoryItem.update({
              where: { id: inv.id },
              data: updateData
           });
        }
      }

      await tx.disposalRecord.create({
        data: {
           inventoryId: params.id,
           locationId: params.locationId,
           reason: (params.reason as any) || "OTHER",
           createdBy,
           disposedAt: now,
           notes: params.notes,
        }
      });

      return updated;
    });
  }

  async sendToVendor(params: { insertIds: string[]; garageId: string; vendorId: string; expectedReturnDate: string }) {
    if (params.insertIds.length === 0) throw new Error("No inserts selected");
    const inserts = await prisma.seatInsert.findMany({ where: { id: { in: params.insertIds } } });
    if (inserts.some(i => i.stockClass !== "DIRTY_RECOVERY")) throw new Error("Only DIRTY_RECOVERY inserts can be sent to the vendor.");

    const sample = inserts[0];
    
    return await prisma.$transaction(async (tx) => {
      const batch = await tx.reupholsteryBatch.create({
        data: {
          batchNumber: `VEN-${Date.now().toString().slice(-6)}`,
          garageId: params.garageId,
          vendorId: params.vendorId,
          seatType: sample.seatType,
          color: sample.color,
          status: "PACKED",
          expectedReturnDate: new Date(params.expectedReturnDate),
          packedDate: new Date(),
        },
      });

      await tx.seatInsert.updateMany({
        where: { id: { in: params.insertIds } },
        data: {
          batchId: batch.id,
          stockClass: "HARVEY_IN_PROGRESS",
          packedAt: new Date(),
        },
      });

      return batch;
    });
  }

  async updateBatchStatus(id: string, status: string) {
    if (status === "RETURNED" || status === "CLOSED") {
      throw new Error("Use receiveBatch for returning/receiving finalized batches.");
    }
    
    return await prisma.$transaction(async (tx) => {
      const batch = await prisma.reupholsteryBatch.findUnique({ where: { id } });
      if (!batch) throw new Error("Batch not found");

      const updateData: any = { status };
      
      if (status === "SHIPPED") {
        updateData.shippedDate = new Date();
      } else if (status === "RECEIVED_BY_VENDOR" || status === "IN_REUPHOLSTERY") {
        updateData.status = "IN_REUPHOLSTERY";
      }
      
      return await tx.reupholsteryBatch.update({ where: { id }, data: updateData });
    });
  }

  async receiveBatch(id: string, params: { userId: string; notes?: string }) {
    return await prisma.$transaction(async (tx) => {
      const batch = await tx.reupholsteryBatch.findUnique({ where: { id } });
      if (!batch) throw new Error("Batch not found");

      const now = new Date();
      const onTime = batch.expectedReturnDate >= now;

      await tx.vendorReceipt.create({
        data: {
          type: "BATCH_RETURN",
          reupholsteryBatchId: id,
          garageId: batch.garageId,
          vendorId: batch.vendorId,
          receivedAt: now,
          receivedBy: params.userId,
          status: "COMPLETED",
          notes: params.notes,
        }
      });

      const updatedBatch = await tx.reupholsteryBatch.update({
        where: { id },
        data: {
          status: "RETURNED",
          actualReturnDate: now,
          onTimeReturn: onTime,
        },
      });

      const inserts = await tx.seatInsert.findMany({ where: { batchId: id } });
      await tx.seatInsert.updateMany({
        where: { batchId: id },
        data: {
          stockClass: "REPLACEMENT_AVAILABLE",
          conditionSource: "REBUILT",
          returnedAt: now,
        },
      });

      for (const insert of inserts) {
         if (insert.seatInsertTypeId) {
            const inventory = await tx.inventoryItem.findFirst({
              where: { garageId: batch.garageId, seatInsertTypeId: insert.seatInsertTypeId }
            });
            if (inventory) {
               await tx.inventoryItem.update({
                  where: { id: inventory.id },
                  data: { quantityOnHand: inventory.quantityOnHand + 1 }
               });
            } else {
               await tx.inventoryItem.create({
                  data: { garageId: batch.garageId, seatInsertTypeId: insert.seatInsertTypeId, quantityOnHand: 1, quantity: 1 }
               });
            }
         }
      }

      return updatedBatch;
    });
  }

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

  async getVendorOrders(params: { garageId?: string; vendorId?: string; status?: string }) {
    const where: any = {};
    if (params.garageId) where.garageId = params.garageId;
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.status) where.status = params.status as any;

    return await prisma.vendorOrder.findMany({
      where,
      include: {
        garage: { select: { name: true } },
        vendor: { select: { name: true } },
        lines: { include: { seatInsertType: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createVendorOrder(data: { garageId: string; vendorId: string; expectedDeliveryDate: string; items: { seatInsertTypeId: string; quantity: number }[]; notes?: string }) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.vendorOrder.create({
        data: {
          orderNumber: `VO-${Date.now().toString().slice(-6)}`,
          garageId: data.garageId,
          vendorId: data.vendorId,
          status: "SUBMITTED",
          submittedAt: new Date(),
          expectedDeliveryDate: new Date(data.expectedDeliveryDate),
          notes: data.notes,
          lines: {
            create: data.items.map(i => ({
              seatInsertTypeId: i.seatInsertTypeId,
              quantityOrdered: i.quantity,
              quantityReceived: 0,
            }))
          }
        }
      });
      return order;
    });
  }

  async updateVendorOrderStatus(id: string, status: string) {
    return await prisma.vendorOrder.update({
      where: { id },
      data: { status: status as any }
    });
  }

  async receiveVendorOrder(id: string, params: { userId: string; lines: { lineId: string; receiveQuantity: number }[]; notes?: string }) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.vendorOrder.findUnique({
        where: { id },
        include: { lines: { include: { seatInsertType: true } } }
      });
      if (!order) throw new Error("Order not found");

      let fullyReceived = true;
      let partiallyReceived = false;

      for (const line of params.lines) {
        const orderLine = order.lines.find((l: any) => l.id === line.lineId);
        if (!orderLine) continue;

        const newReceived = orderLine.quantityReceived + line.receiveQuantity;
        if (newReceived > orderLine.quantityOrdered) throw new Error(`Cannot over-receive line ${orderLine.id}`);

        await tx.vendorOrderLine.update({
          where: { id: line.lineId },
          data: { quantityReceived: newReceived }
        });

        if (newReceived < orderLine.quantityOrdered) fullyReceived = false;
        if (newReceived > 0) partiallyReceived = true;

        if (line.receiveQuantity > 0) {
           const newInserts = Array.from({ length: line.receiveQuantity }).map(() => ({
             seatInsertTypeId: orderLine.seatInsertTypeId,
             vendorOrderLineId: line.lineId,
             locationId: order.garageId,
             stockClass: StockClass.REPLACEMENT_AVAILABLE,
             conditionSource: ConditionSource.NEW,
             seatType: orderLine.seatInsertType?.componentType || "UNKNOWN",
             color: "N/A",
             hardwareCode: "N/A",
             fleetType: "GENERIC"
           }));
           await tx.seatInsert.createMany({ data: newInserts });

           const inventory = await tx.inventoryItem.findFirst({
             where: { garageId: order.garageId, seatInsertTypeId: orderLine.seatInsertTypeId }
           });
           if (inventory) {
             await tx.inventoryItem.update({
               where: { id: inventory.id },
               data: { quantityOnHand: inventory.quantityOnHand + line.receiveQuantity, quantity: inventory.quantity + line.receiveQuantity }
             });
           } else {
             await tx.inventoryItem.create({
               data: { garageId: order.garageId, seatInsertTypeId: orderLine.seatInsertTypeId, quantityOnHand: line.receiveQuantity, quantity: line.receiveQuantity }
             });
           }
        }
      }

      const finalStatus = fullyReceived ? "RECEIVED" : partiallyReceived ? "PARTIALLY_RECEIVED" : order.status;
      const now = new Date();

      await tx.vendorReceipt.create({
        data: {
          type: "ORDER_RECEIPT",
          vendorOrderId: id,
          garageId: order.garageId,
          vendorId: order.vendorId,
          receivedAt: now,
          receivedBy: params.userId,
          status: fullyReceived ? "COMPLETED" : "PARTIAL",
          notes: params.notes,
        }
      });

      return await tx.vendorOrder.update({
        where: { id },
        data: {
          status: finalStatus as any,
          receivedAt: fullyReceived ? now : order.receivedAt
        }
      });
    });
  }

  // --- Strict Local Engine: Reservation --- //
  private async reserveBestReplacementTx(
    tx: any, 
    garageId: string, 
    seatInsertTypeId: string, 
    userId: string, 
    busId: string, 
    workOrderId?: string
  ) {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Priority 1: REBUILT
      let candidate = await tx.seatInsert.findFirst({
        where: {
          locationId: garageId,
          seatInsertTypeId,
          stockClass: "REPLACEMENT_AVAILABLE",
          conditionSource: "REBUILT"
        },
        orderBy: { returnedAt: 'asc' }
      });

      // Priority 2: NEW
      if (!candidate) {
        candidate = await tx.seatInsert.findFirst({
          where: {
            locationId: garageId,
            seatInsertTypeId,
            stockClass: "REPLACEMENT_AVAILABLE",
            conditionSource: "NEW"
          },
          orderBy: { createdAt: 'asc' }
        });
      }

      if (!candidate) {
        // Hard Block - log it to feed KPI
        await tx.replacementReservation.create({
          data: {
            reservedByUserId: userId,
            status: "BLOCKED",
            busId,
            workOrderId
          }
        });
        throw new Error("Removal blocked: no local replacement available.");
      }

      // ATOMIC GUARD: Try to claim the exact unit
      // This protects against double-allocation in concurrent requests
      const { count } = await tx.seatInsert.updateMany({
        where: {
          id: candidate.id,
          stockClass: "REPLACEMENT_AVAILABLE" // Critical: Must still be available
        },
        data: {
          stockClass: "INSTALLED",
          installedBusId: busId,
          installedAt: new Date()
        }
      });

      if (count === 1) {
        // Successfully bound atomicaly
        const reservation = await tx.replacementReservation.create({
          data: {
            actualInventoryUnitId: candidate.id,
            reservedByUserId: userId,
            status: "INSTALLED", // Finalized swap
            busId,
            workOrderId
          }
        });

        return { reservation, chosen: candidate };
      }

      // If count === 0, someone else won the race condition. 
      // The loop continues to the next attempt.
    }

    // Exhausted retries
    throw new Error("Conflict: could not secure a replacement seat due to high concurrency. Please try again.");
  }

  // --- Bus Installation / Consumption --- //
  async installSeat(params: { 
    seatInsertTypeId: string; 
    garageId: string;
    busId: string; 
    workOrderId?: string; 
    userId: string;
    removedInsertId?: string;
    removedReason?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Reserve explicitly within atomic guard loop
      const { reservation, chosen } = await this.reserveBestReplacementTx(
        tx, 
        params.garageId, 
        params.seatInsertTypeId, 
        params.userId, 
        params.busId, 
        params.workOrderId
      );

      const insertId = chosen.id;
      const now = new Date();

      // 2. Decrement aggregate local inventory pool
      const inv = await tx.inventoryItem.findFirst({ 
        where: { garageId: params.garageId, seatInsertTypeId: params.seatInsertTypeId } 
      });
      if (inv && inv.quantityOnHand > 0) {
        await tx.inventoryItem.update({
          where: { id: inv.id },
          data: { quantityOnHand: inv.quantityOnHand - 1 }
        });
      }

      // 3. Atomically handle the removed seat
      if (params.removedInsertId) {
        // Transition dirty swap unit explicitly to DIRTY_RECOVERY
        await tx.seatInsert.update({
          where: { id: params.removedInsertId },
          data: { stockClass: "DIRTY_RECOVERY", installedBusId: null, dirtyAt: now }
        });
        
        await tx.replacementActivity.create({
          data: {
            inventoryId: params.removedInsertId,
            busId: params.busId,
            locationId: params.garageId,
            reason: (params.removedReason as any) || "OTHER",
            createdBy: params.userId,
          }
        });
      }

      // 4. WorkOrder logging
      if (params.workOrderId) {
         await tx.workOrderPartUsage.create({
            data: {
               workOrderId: params.workOrderId,
               seatInsertTypeId: params.seatInsertTypeId,
               garageId: params.garageId,
               quantity: 1,
               issuedByUserId: params.userId,
               notes: `Reserved & Installed: ${insertId} (Source: ${chosen.conditionSource})` + (params.removedInsertId ? ` Removed: ${params.removedInsertId}` : '')
            }
         });
      }

      // Return the successfully guarded reservation along with the chosen DB object
      return { reservation, chosen };
    });
  }
}

export const seatInsertsService = new SeatInsertsService();
