import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { queueSeatOrderEmail, generateSeatOrderEmailHtml } from "../email-centre/email-centre.service.js"; // Assume I'll add this

const prisma = new PrismaClient() as any;

// ─── Validation Schemas ──────────────────────────────────────────────────────
const CreateOrderSchema = z.object({
  garageId: z.string().cuid(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    seatInsertTypeId: z.string().cuid(),
    quantity: z.number().int().min(1),
    description: z.string().optional()
  })).min(1)
});

const UpdateOrderSchema = CreateOrderSchema.partial();

const ApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional()
});

const ReceiveSchema = z.object({
  lines: z.array(z.object({
    seatOrderLineId: z.string(),
    receivedQty: z.number().min(0)
  })).min(1),
  notes: z.string().optional()
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function calculateTotals(lines: { quantity: number; seatInsertTypeId: string }[]) {
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  let totalCost = 0;
  for (const line of lines) {
    const part = await prisma.seatInsertType.findUnique({ where: { id: line.seatInsertTypeId } });
    totalCost += (part?.unitCost || 0) * line.quantity;
  }
  return { totalQuantity, totalCost };
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export async function getOrders(req: Request, res: Response) {
  try {
    const garageId = req.query.garageId as string | undefined;
    const status = req.query.status as any; // Cast bypassed Prisma mapping

    const where: any = {};
    if (garageId) where.garageId = garageId;
    if (status) where.status = status;

    const orders = await prisma.seatOrder.findMany({
      where,
      include: {
        garage: { select: { name: true } },
        createdByUser: { select: { name: true } },
        lines: {
          include: { 
            seatInsertType: { select: { partNumber: true, description: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch seat orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOrder(req: Request, res: Response) {
  try {
    const order = await prisma.seatOrder.findUnique({
      where: { id: req.params.id },
      include: {
        garage: { select: { name: true } },
        createdByUser: { select: { name: true } },
        lines: {
          include: { 
            seatInsertType: { select: { partNumber: true, description: true } }
          }
        },
        approvals: {
          include: { approvedByUser: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Failed to fetch seat order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createOrder(req: Request, res: Response) {
  try {
    const data = CreateOrderSchema.parse(req.body);
    const userId = (req as any).user.userId;

    const { totalQuantity, totalCost } = await calculateTotals(data.lines);
    
    // Generate Order Number: SO-YYYY-000123 (Format changed per spec)
    const yearStr = new Date().getFullYear().toString();
    const count = await prisma.seatOrder.count({
      where: { orderNumber: { startsWith: `SO-${yearStr}-` } }
    });
    const orderNumber = `SO-${yearStr}-${(count + 1).toString().padStart(6, '0')}`;

    const order = await prisma.seatOrder.create({
      data: {
        orderNumber,
        garageId: data.garageId,
        createdByUserId: userId,
        status: "DRAFT" as any,
        totalQuantity,
        totalCost,
        notes: data.notes,
        lines: {
          create: data.lines
        }
      },
      include: {
        lines: true
      }
    });

    res.status(201).json(order);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    console.error("Failed to create seat order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateOrder(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const data = UpdateOrderSchema.parse(req.body);
    
    const existing = await prisma.seatOrder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.status !== ("DRAFT" as any) && existing.status !== ("REJECTED" as any)) {
      return res.status(400).json({ error: "Can only update DRAFT or REJECTED orders" });
    }

    // Update inside transaction since we recreate lines
    const result = await prisma.$transaction(async (tx: any) => {
      let updateData: any = { notes: data.notes };

      if (data.lines) {
        // Recalculate totals
        const { totalQuantity, totalCost } = await calculateTotals(data.lines);
        updateData.totalQuantity = totalQuantity;
        updateData.totalCost = totalCost;

        // Wipe old lines, insert new
        await tx.seatOrderLine.deleteMany({ where: { seatOrderId: id } });
        updateData.lines = { create: data.lines };
      }

      return tx.seatOrder.update({
        where: { id },
        data: updateData,
        include: { lines: true }
      });
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    console.error("Failed to update seat order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function submitOrder(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const existing = await prisma.seatOrder.findUnique({ where: { id }, include: { lines: true } });
    
    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.status !== ("DRAFT" as any) && existing.status !== ("REJECTED" as any)) {
      return res.status(400).json({ error: "Order already submitted" });
    }
    if (existing.totalQuantity === 0 || existing.lines.length === 0) {
      return res.status(400).json({ error: "Order has no items" });
    }

    // Rules: qty>500 requires manager approval
    const requiresApproval = existing.totalQuantity > 500;
    const nextStatus = requiresApproval ? "PENDING_APPROVAL" : "APPROVED";

    const updateMap: any = {
      status: nextStatus as any,
      submittedAt: new Date()
    };
    
    if (!requiresApproval) {
      updateMap.approvedAt = new Date(); // auto-approve
    }

    const order = await prisma.seatOrder.update({
      where: { id },
      data: updateMap
    });

    res.json({ order, requiresApproval });
  } catch (error) {
    console.error("Failed to submit seat order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function approveOrder(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const userId = (req as any).user.userId;
    const data = ApprovalSchema.parse(req.body);

    const existing = await prisma.seatOrder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.status !== ("PENDING_APPROVAL" as any)) {
      return res.status(400).json({ error: "Order is not pending approval" });
    }

    const targetStatus = data.status === "APPROVED" ? "APPROVED" : "REJECTED";

    const order = await prisma.$transaction(async (tx: any) => {
      // Create approval log
      await tx.seatOrderApproval.create({
        data: {
          seatOrderId: id,
          approvedByUserId: userId,
          status: data.status,
          notes: data.notes
        }
      });

      // Update actual order
      return tx.seatOrder.update({
        where: { id },
        data: {
          status: targetStatus as any,
          approvedAt: targetStatus === "APPROVED" ? new Date() : null
        }
      });
    });

    res.json(order);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    console.error("Failed to approve seat order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function sendOrder(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.seatOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.status === "SENDING" || existing.status === "SENT") {
      throw new Error("Order cannot be sent again in its current state");
    }
    if (existing.status !== "APPROVED" && existing.status !== "FAILED") {
      throw new Error("Order must be APPROVED to send");
    }
    
    if (existing.lines.length === 0 || existing.totalQuantity === 0) {
      throw new Error("Cannot send empty order");
    }

    const profile = await prisma.garageEmailProfile.findUnique({ where: { garageId: existing.garageId } });
    if (!profile || !profile.active) return res.status(400).json({ error: "Inactive or missing email profile" });
    if (!profile.harveyToEmail) return res.status(400).json({ error: "Missing Harvey email destination" });

    // Mark order SENDING
    await prisma.seatOrder.update({
      where: { id },
      data: { status: "SENDING" as any }
    });

    await queueSeatOrderEmail(id);

    res.json({ message: "Order queued for sending" });
  } catch (error) {
    console.error("Failed to send order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function resendOrder(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.seatOrder.findUnique({ where: { id } });

    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.status === "SENDING" || existing.status === "SENT") {
      throw new Error("Order cannot be sent again in its current state");
    }
    if (existing.status !== "FAILED") {
      return res.status(400).json({ error: "Can only resend FAILED orders" });
    }

    // Mark order SENDING again
    await prisma.seatOrder.update({
      where: { id },
      data: { status: "SENDING" as any }
    });

    await queueSeatOrderEmail(id);

    res.json({ message: "Order queued for resend" });
  } catch (error) {
    console.error("Failed to resend order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelOrder(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const existing = await prisma.seatOrder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Order not found" });

    if (existing.status === "SENT" || existing.status === "RECEIVED" || existing.status === "CLOSED" || existing.status === "PARTIALLY_RECEIVED") {
      return res.status(400).json({ error: "Cannot cancel order in this state" });
    }

    const order = await prisma.seatOrder.update({
      where: { id },
      data: { status: "CANCELLED" as any }
    });
    res.json(order);
  } catch (error) {
    console.error("Failed to cancel order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function previewEmail(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const existing = await prisma.seatOrder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Order not found" });

    const html = await generateSeatOrderEmailHtml(id);
    res.send(html);
  } catch (error) {
    console.error("Failed to preview email:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function receiveOrder(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user.userId;
    const data = ReceiveSchema.parse(req.body);

    const existing = await prisma.seatOrder.findUnique({
      where: { id },
      include: { lines: true }
    });

    if (!existing) return res.status(404).json({ error: "Order not found" });
    if (existing.status !== ("SENT" as any) && existing.status !== ("PARTIALLY_RECEIVED" as any)) {
      return res.status(400).json({ error: "Order must be SENT or PARTIALLY_RECEIVED to be received" });
    }

    // Validate quantities
    let totalReceivedNow = 0;
    const validLines = data.lines.filter(l => l.receivedQty > 0);
    
    if (validLines.length === 0) {
      return res.status(400).json({ error: "Must receive at least 1 item" });
    }

    // Check against what was ordered vs previously received
    // Simplified: Just make sure we don't receive more than ordered total for each line.
    for (const line of validLines) {
      const orderLine = existing.lines.find((ol: any) => ol.id === line.seatOrderLineId);
      if (!orderLine) return res.status(400).json({ error: "Invalid line ID" });
      
      const previousReceipts = await prisma.seatOrderReceiptLine.aggregate({
        where: { seatOrderLineId: line.seatOrderLineId },
        _sum: { receivedQty: true }
      });
      const previouslyReceived = previousReceipts._sum.receivedQty || 0;
      if (previouslyReceived + line.receivedQty > orderLine.quantity) {
        throw new Error("Cannot receive more than ordered quantity");
      }
      totalReceivedNow += line.receivedQty;
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Receipt and Lines
      const receipt = await tx.seatOrderReceipt.create({
        data: {
          seatOrderId: id,
          receivedByUserId: userId,
          notes: data.notes,
          lines: {
            create: validLines.map(l => ({
              seatOrderLineId: l.seatOrderLineId,
              receivedQty: l.receivedQty
            }))
          }
        }
      });

      // 2. Create physical inserts (Returned Stock)
      const newStockInserts = [];
      for (const l of validLines) {
        const orderLine = existing.lines.find((ol: any) => ol.id === l.seatOrderLineId);
        for(let i = 0; i < l.receivedQty; i++) {
          newStockInserts.push({
            seatInsertTypeId: orderLine.seatInsertTypeId,
            locationId: existing.garageId,
            status: "RETURNED_FROM_VENDOR" as any,
            vendorId: null
          });
        }
      }

      if (newStockInserts.length > 0) {
        await tx.seatInsert.createMany({ data: newStockInserts });
      }

      // 3. Update Order Status
      let fullyReceived = true;
      let anyReceived = false;
      for (const orderLine of existing.lines) {
        const previousReceipts = await tx.seatOrderReceiptLine.aggregate({
          where: { seatOrderLineId: orderLine.id },
          _sum: { receivedQty: true }
        });
        const received = previousReceipts._sum.receivedQty || 0;
        if (received < orderLine.quantity) fullyReceived = false;
        if (received > 0) anyReceived = true;
      }
      
      const nextStatus = fullyReceived ? "RECEIVED" : (anyReceived ? "PARTIALLY_RECEIVED" : existing.status);

      await tx.seatOrder.update({
        where: { id },
        data: { status: nextStatus as any }
      });

      return receipt;
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ errors: error.errors });
    console.error("Failed to receive order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
