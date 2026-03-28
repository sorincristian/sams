import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient() as any;

const HARD_TEMPLATE = `
<div style="font-family: Arial, sans-serif; white-space: pre-line; max-width: 600px;">
Dear Harvey Shop Team,

Please process the following seat insert order for {{garageName}}.

Order Number: {{orderNumber}}
Order Date: {{orderDate}}
Requested By: {{requestedBy}}

Items Requested:
{{itemsTable}}

Total Quantity: {{totalQuantity}}

Delivery Location:
{{garageName}}
{{garageAddress}}

Notes:
{{notes}}

Please confirm receipt of this order and advise the estimated delivery date.

Best regards,

{{fromName}}
{{garageName}}
{{fromEmail}}
{{replyToEmail}}
{{garagePhone}}

{{signature}}
</div>
`;

const escapeHtml = (unsafe: string) => {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export async function generateSeatOrderEmailHtml(orderId: string): Promise<string> {
  const order = await prisma.seatOrder.findUnique({
    where: { id: orderId },
    include: {
      garage: { include: { emailProfile: true } },
      createdByUser: true,
      lines: {
        include: { seatInsertType: true }
      }
    }
  });

  if (!order) throw new Error("Order not found");
  
  const profile = order.garage?.emailProfile;
  if (!profile) throw new Error("Garage has no email profile configuration");

  // Format the items table gracefully in HTML to be injected
  let itemsTableHTML = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px;">
      <thead>
        <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
          <th style="padding: 8px; text-align: left;">Part #</th>
          <th style="padding: 8px; text-align: left;">Description</th>
          <th style="padding: 8px; text-align: right;">Quantity</th>
        </tr>
      </thead>
      <tbody>
  `;
  order.lines.forEach((line: any) => {
    itemsTableHTML += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(line.seatInsertType.partNumber)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(line.seatInsertType.description)}</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">${line.quantity}</td>
        </tr>
    `;
  });
  itemsTableHTML += `
      </tbody>
    </table>
  `;

  // Apply template replacements
  let html = HARD_TEMPLATE;
  html = html.replace(/{{garageName}}/g, escapeHtml(order.garage.name || "N/A"));
  html = html.replace(/{{orderNumber}}/g, escapeHtml(order.orderNumber));
  html = html.replace(/{{orderDate}}/g, escapeHtml(new Date(order.createdAt).toLocaleDateString()));
  html = html.replace(/{{requestedBy}}/g, escapeHtml(order.createdByUser.name));
  html = html.replace(/{{itemsTable}}/g, itemsTableHTML);
  html = html.replace(/{{totalQuantity}}/g, order.totalQuantity.toString());
  
  // Safefall for optional fields
  html = html.replace(/{{garageAddress}}/g, escapeHtml(order.garage.address || order.garage.code || "Address Not Configured"));
  html = html.replace(/{{notes}}/g, escapeHtml(order.notes || "No notes attached."));

  html = html.replace(/{{fromName}}/g, escapeHtml(profile.fromName || "Fleet Manager"));
  html = html.replace(/{{fromEmail}}/g, escapeHtml(profile.fromEmail || ""));
  html = html.replace(/{{replyToEmail}}/g, escapeHtml(profile.replyToEmail || ""));
  html = html.replace(/{{garagePhone}}/g, escapeHtml(order.garage.phone || "No phone listed"));
  html = html.replace(/{{signature}}/g, profile.signatureHtml || "");

  return html;
}

export async function queueSeatOrderEmail(orderId: string) {
  const order = await prisma.seatOrder.findUnique({
    where: { id: orderId },
    include: {
      garage: { include: { emailProfile: true } }
    }
  });
  
  if (!order || !order.garage.emailProfile) {
    throw new Error("Missing parameters for queue building");
  }

  const profile = order.garage.emailProfile;
  const bodyHtml = await generateSeatOrderEmailHtml(orderId);

  return prisma.outboundEmail.create({
    data: {
      garageId: order.garageId,
      seatOrderId: order.id,
      to: profile.harveyToEmail,
      cc: profile.defaultCc,
      bcc: profile.defaultBcc,
      subject: `Seat Insert Order: ${order.orderNumber}`,
      bodyHtml,
      status: "QUEUED" as any,
      templateCode: "SEAT_ORDER_HARVEY",
      attempts: 0
    }
  });
}
